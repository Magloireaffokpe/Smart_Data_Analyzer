"""
services/gemini_service.py — AI interpretation engine via Google Gemini

Transforms statistical summaries and correlations into actionable insights.

Two public entry points matching the two API modes:
  • interpret_full(filename, full_result)          → detailed expert analysis
  • interpret_summary(filename, summary_result)    → short product-ready response

Each mode has its own prompt builder and its own expected JSON output schema.
The parser automatically detects the mode from the response keys.

Dependency : google-genai  (pip install google-genai)
API key     : GEMINI_API_KEY environment variable (loaded in main.py at startup)
"""

import json
import os
import re
from google import genai
from fastapi import HTTPException


# ── Modèle Gemini utilisé ─────────────────────────────────────────────────────
_GEMINI_MODEL = "gemini-2.5-flash"

# ── Client singleton ──────────────────────────────────────────────────────────
# Initialisé une seule fois au premier appel → évite de recréer le client à chaque requête
_client: genai.Client | None = None


def _get_client() -> genai.Client:
    """
    Retourne le client Gemini (singleton).
    Lève HTTPException 503 si la clé API est absente au moment de l'appel.
    """
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=503,
                detail=(
                    "GEMINI_API_KEY not found. "
                    "Add it to your .env file or environment variables."
                ),
            )
        _client = genai.Client(api_key=api_key)
    return _client


def _clean_json_response(text: str) -> str:
    """
    Nettoie la réponse brute de Gemini pour extraire uniquement le bloc JSON.

    Stratégies appliquées dans l'ordre :
      1. Suppression des blocs markdown ```json ... ``` ou ``` ... ```
      2. Extraction du premier objet JSON { ... } via regex (DOTALL)
      3. Retour du texte original nettoyé si aucun bloc JSON n'est trouvé

    Cette fonction résout le problème le plus fréquent en production :
    Gemini entoure parfois sa réponse JSON de texte ou de markdown,
    ce qui fait échouer json.loads() directement.
    """
    # Suppression des fences markdown (```json ... ``` ou ``` ... ```)
    text = re.sub(r"```(?:json)?\s*", "", text)
    text = re.sub(r"```", "", text)

    # Extraction du premier bloc { ... } complet (greedy, multi-ligne)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return match.group(0)

    # Fallback : on retourne le texte nettoyé tel quel
    return text.strip()


def _call_gemini(prompt: str) -> str:
    """
    Appelle l'API Gemini et retourne le texte brut nettoyé de la réponse.
    Factorisé pour éviter la duplication entre les deux modes.
    Le nettoyage (_clean_json_response) est appliqué ici pour que tous
    les parsers en aval reçoivent déjà un JSON candidat propre.

    Raises:
        HTTPException 502 si l'API Gemini échoue ou est indisponible.
    """
    try:
        client = _get_client()
        response = client.models.generate_content(
            model=_GEMINI_MODEL,
            contents=prompt,
            config={
                "max_output_tokens": 1500,
                "temperature": 0.3,
            },
        )
        # Nettoyage immédiat : supprime markdown, extrait le bloc JSON
        return _clean_json_response(response.text)
    except HTTPException:
        raise  # Re-propagation des erreurs de configuration (503)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini API call failed: {str(exc)}",
        ) from exc


# ═══════════════════════════════════════════════════════════════════════════════
# MODE FULL — analyse experte détaillée
# ═══════════════════════════════════════════════════════════════════════════════


def interpret_full(filename: str, full_result: dict) -> dict:
    """
    Génère une interprétation experte complète depuis le résultat de analyze_full().
    Destinée aux développeurs et analystes — réponse exhaustive et technique.

    Args:
        filename    : Nom du fichier analysé (contexte pour le modèle).
        full_result : Dict produit par analyzer.analyze_full().

    Returns:
        dict avec :
            - overview             : vue d'ensemble du dataset et du domaine métier probable
            - data_quality         : évaluation qualitative de la qualité des données
            - column_insights      : analyse détaillée colonne par colonne
            - correlation_analysis : interprétation des corrélations (Pearson/Spearman/Chi²)
            - causal_factors       : facteurs influençant chaque variable cible probable
            - causal_explanations  : explications des relations causales
            - anomalies            : valeurs aberrantes et incohérences détectées
            - recommendations      : actions concrètes recommandées (5-8)
            - mode                 : "full"
            - model_used           : modèle Gemini ayant généré la réponse
    """
    prompt = _build_full_prompt(filename, full_result)
    raw_text = _call_gemini(prompt)
    return _parse_response(raw_text, expected_mode="full")


# ═══════════════════════════════════════════════════════════════════════════════
# MODE SUMMARY — résumé produit court
# ═══════════════════════════════════════════════════════════════════════════════


def interpret_summary(filename: str, summary_result: dict) -> dict:
    """
    Génère un résumé court et actionnable depuis le résultat de analyze_summary().
    Destinée au frontend — payload léger, langage non-technique.

    Args:
        filename       : Nom du fichier analysé.
        summary_result : Dict produit par analyzer.analyze_summary().

    Returns:
        dict avec :
            - target       : variable cible retenue
            - key_variables: variables influentes (max 5)
            - insights     : 2 à 5 insights courts compréhensibles par un non-data
            - ai_summary   : résumé narratif d'une ou deux phrases
            - mode         : "summary"
            - model_used   : modèle Gemini ayant généré la réponse
    """
    prompt = _build_summary_prompt(filename, summary_result)
    raw_text = _call_gemini(prompt)
    return _parse_response(raw_text, expected_mode="summary")


# ── Alias de rétrocompatibilité ───────────────────────────────────────────────
# Maintenu pour ne pas casser les anciens tests qui importent interpret_summary_fast
def interpret_summary_fast(filename: str, summary: dict) -> dict:
    """
    Alias de rétrocompatibilité vers interpret_summary().
    À terme, utiliser interpret_summary() directement.
    """
    return interpret_summary(filename, summary)


# ═══════════════════════════════════════════════════════════════════════════════
# PROMPT BUILDER — MODE FULL
# ═══════════════════════════════════════════════════════════════════════════════


def _build_full_prompt(filename: str, full_result: dict) -> str:
    """
    Construit un prompt expert et technique pour le mode full.
    Injecte les statistiques complètes, les corrélations et les alertes qualité.
    Guide Gemini sur deux missions : facteurs causaux + explications des relations.
    """
    info = full_result.get("dataset_info", {})
    stats = full_result.get("statistics", {})
    corr = full_result.get("correlations", {})
    warns = full_result.get("warnings", [])

    # Extraction des signaux depuis la synthèse des corrélations
    corr_summary = corr.get("summary", {})
    influential_pairs = corr_summary.get("influential_pairs", [])
    hub_cols = corr_summary.get("hub_columns", [])
    redundant_cols = corr_summary.get("redundant_columns", [])

    # Top paires Pearson, Spearman et Chi² pour le contexte complet
    pearson_pairs = corr.get("pearson", {}).get("top_pairs", [])[:10]
    spearman_pairs = corr.get("spearman", {}).get("top_pairs", [])[:10]
    chi2_pairs = [
        p for p in corr.get("chi2", {}).get("pairs", []) if p.get("significant")
    ][:10]

    # Colonnes numériques candidates comme variables cibles
    numeric_col_names = [
        c["name"]
        for c in info.get("column_list", [])
        if "float" in c.get("dtype", "") or "int" in c.get("dtype", "")
    ]

    # Sérialisation JSON sécurisée (avec limitation de taille)
    stats_json = _truncate_json(stats)
    influential_json = _truncate_json(influential_pairs)
    pearson_json = _truncate_json(pearson_pairs)
    spearman_json = _truncate_json(spearman_pairs)
    chi2_json = _truncate_json(chi2_pairs)
    hub_json = _truncate_json(hub_cols)

    prompt = f"""
You MUST return valid JSON only.
Do NOT include markdown or explanations.
You are a senior data scientist and statistical analyst.
You have been provided the complete analysis of a dataset named "{filename}".

════════════════════════════════════════════════════════
DATASET OVERVIEW
════════════════════════════════════════════════════════
• Dimensions        : {info.get('rows')} rows × {info.get('columns')} columns
• Data quality      : {info.get('quality_label')} ({info.get('completeness_pct')}% completeness)
• Duplicate rows    : {info.get('duplicate_rows')}
• Numeric columns   : {numeric_col_names}
• Warnings          : {warns or 'none'}

════════════════════════════════════════════════════════
DESCRIPTIVE STATISTICS
════════════════════════════════════════════════════════
{stats_json}

════════════════════════════════════════════════════════
MOST INFLUENTIAL CORRELATION PAIRS (all methods)
════════════════════════════════════════════════════════
{influential_json}

════════════════════════════════════════════════════════
PEARSON CORRELATIONS — TOP PAIRS (linear relationships)
════════════════════════════════════════════════════════
{pearson_json}

════════════════════════════════════════════════════════
SPEARMAN CORRELATIONS — TOP PAIRS (monotonic relationships)
════════════════════════════════════════════════════════
{spearman_json}

════════════════════════════════════════════════════════
CHI² TEST — SIGNIFICANT CATEGORICAL ASSOCIATIONS
════════════════════════════════════════════════════════
{chi2_json}

════════════════════════════════════════════════════════
HUB COLUMNS (most connected to others)
════════════════════════════════════════════════════════
{hub_json}

════════════════════════════════════════════════════════
POTENTIALLY REDUNDANT COLUMNS
════════════════════════════════════════════════════════
{redundant_cols or "None detected."}

════════════════════════════════════════════════════════
YOUR MISSIONS
════════════════════════════════════════════════════════

MISSION 1 — Causal factors (causal_factors):
For each numeric column that could be a target variable
(e.g. price, revenue, score, quantity, duration, performance),
identify which columns influence it the most and explain why,
based on Pearson/Spearman correlations and Chi² associations.

MISSION 2 — Causal explanations (causal_explanations):
For each strongly correlated pair (|r| >= 0.5 or V >= 0.3), explain:
  - Which variable probably influences the other?
  - Is it direct causality, indirect (hidden variable), or coincidence?
  - If Spearman >> Pearson: what non-linear form is likely?
  - For Chi²: what does this categorical dependency imply for the business?

════════════════════════════════════════════════════════
REQUIRED RESPONSE FORMAT
════════════════════════════════════════════════════════

Reply ONLY with a valid JSON object (no markdown, no backticks, no text before or after):

{{
  "overview": "3-5 sentence description of the dataset: likely business domain, dimensions, general impression.",
  "data_quality": "3-5 sentence quality assessment: completeness, missing data, duplicates, usability.",
  "column_insights": [
    {{
      "column": "exact_column_name",
      "type": "numeric | text | date | boolean",
      "insight": "2-3 sentences on distribution, notable values, dispersion, column-specific anomalies."
    }}
  ],
  "correlation_analysis": {{
    "pearson_highlights":  "Strongest linear relationships and their direction.",
    "spearman_highlights": "Non-linear relationships detected (Pearson vs Spearman gaps).",
    "chi2_highlights":     "Significant categorical associations and their business meaning.",
    "redundant_columns":   "Quasi-redundant columns to consider removing or merging.",
    "hub_columns":         "Central columns in the dataset and their probable role."
  }},
  "causal_factors": [
    {{
      "target_variable": "column_name",
      "why_target": "Why this column is likely a target variable.",
      "influencing_factors": [
        {{
          "factor": "column_name",
          "method": "Pearson | Spearman | Chi²",
          "correlation_value": 0.0,
          "influence_strength": "strong | moderate | weak",
          "explanation": "Clear causal explanation."
        }}
      ]
    }}
  ],
  "causal_explanations": [
    {{
      "col_a": "column_name",
      "col_b": "column_name",
      "relationship_type": "linear | non-linear | categorical",
      "probable_direction": "A → B | B → A | bidirectional | hidden variable | coincidence",
      "explanation": "Realistic causal hypothesis.",
      "business_implication": "Concrete business implication."
    }}
  ],
  "anomalies": "2-4 sentences on outliers, suspicious std/mean ratios, min/max anomalies, inconsistencies.",
  "recommendations": [
    "Concrete action 1",
    "Concrete action 2"
  ]
}}

Reply in French, with precision and professionalism.
"""
    return prompt.strip()


# ═══════════════════════════════════════════════════════════════════════════════
# PROMPT BUILDER — MODE SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════


def _build_summary_prompt(filename: str, summary_result: dict) -> str:
    """
    Construit un prompt court et décisionnel pour le mode summary.
    Langage simple, pas de jargon statistique — lisible par un non-data.
    Injecte uniquement la variable cible et ses drivers filtrés.
    """
    info = summary_result.get("dataset_info", {})
    target = summary_result.get("target")
    key_variables = summary_result.get("key_variables", [])
    warnings = summary_result.get("warnings", [])

    # Formatage lisible des variables clés pour le prompt
    drivers_text = (
        "\n".join(
            [
                f"{v.get('name', 'unknown')}: correlation={v.get('correlation', 0)} ({v.get('direction', 'unknown')}, {v.get('strength', 'unknown')})"
                for v in key_variables
            ]
        )
        or "  No significant driver found above the correlation threshold."
    )

    quality_flags = []
    if info.get("duplicate_rows", 0) > 0:
        quality_flags.append(f"{info['duplicate_rows']} duplicate rows")
    if info.get("completeness_pct", 100) < 95:
        quality_flags.append(
            f"{100 - info.get('completeness_pct', 100):.1f}% missing data"
        )
    flags_text = ", ".join(quality_flags) if quality_flags else "none"

    prompt = f"""
You MUST return valid JSON only.
Do NOT include markdown or explanations.   
You are an AI data assistant for a SaaS product.
Analyze the dataset "{filename}" ({info.get('rows')} rows × {info.get('columns')} columns).
Data quality: {info.get('quality_label')} — Issues: {flags_text}

Target variable: {target or 'not identified'}
Key influencing variables (filtered correlations):
{drivers_text}

Quality warnings: {warnings or 'none'}

YOUR MISSION:
Produce a SHORT, CLEAR, NON-TECHNICAL summary for a business user (not a data scientist).
- No statistical jargon
- No long explanations
- Each insight must be immediately understandable by a manager or product owner
- Focus on what matters for DECISION MAKING

Reply ONLY with this exact JSON (no markdown, no backticks, no text before or after):

{{
  "target": "{target or 'unknown'}",
  "key_variables": [
    {{
      "name": "variable_name",
      "correlation": 0.0,
      "direction": "positive | negative",
      "strength": "strong | moderate | weak"
    }}
  ],
  "insights": [
    "Short insight 1 — plain language, max 20 words",
    "Short insight 2 — plain language, max 20 words"
  ],
  "ai_summary": "1-2 sentence plain-language summary of the most important finding."
}}

Rules:
- key_variables: keep only the variables already provided above (do not invent new ones)
- insights: 2 to 5 items maximum, ordered by importance
- ai_summary: one or two sentences max — the single most important takeaway
- Reply in French
"""
    return prompt.strip()


# ═══════════════════════════════════════════════════════════════════════════════
# PARSER — détection automatique du mode + fallback garanti
# ═══════════════════════════════════════════════════════════════════════════════


def _parse_response(raw_text: str, expected_mode: str = "full") -> dict:
    """
    Parse la réponse Gemini et enrichit avec les métadonnées (mode, model_used).

    Stratégies de parsing dans l'ordre :
      1. Parsing direct du texte brut nettoyé
      2. Extraction du premier bloc JSON { ... } trouvé dans le texte
      3. Fallback structuré (jamais de crash — retourne toujours un dict valide)

    Args:
        raw_text      : Texte brut retourné par l'API Gemini.
        expected_mode : "full" ou "summary" — utilisé pour le fallback.

    Returns:
        dict enrichi avec "mode" et "model_used" garantis présents.
    """
    cleaned = raw_text.strip()
    parsed = None

    # Tentative 1 : parsing direct
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Tentative 2 : extraction du bloc JSON depuis un texte entourant
    if parsed is None:
        try:
            start = cleaned.index("{")
            end = cleaned.rindex("}") + 1
            parsed = json.loads(cleaned[start:end])
        except (ValueError, json.JSONDecodeError):
            pass

    # Fallback : retour d'une structure minimale valide
    if parsed is None:
        return _fallback_response(raw_text, expected_mode)

    # Détection automatique du mode depuis les clés de la réponse
    detected_mode = _detect_mode(parsed)
    parsed["mode"] = detected_mode
    parsed["model_used"] = _GEMINI_MODEL
    return parsed


def _detect_mode(parsed: dict) -> str:
    """
    Détecte le mode depuis les clés présentes dans le dict parsé.
    "overview" est la clé signature du mode full.
    "insights" ou "ai_summary" sont les clés signature du mode summary.
    """
    if "overview" in parsed:
        return "full"
    if "insights" in parsed or "ai_summary" in parsed:
        return "summary"
    # Inférence par vote majoritaire sur les clés connues
    full_keys = {"overview", "column_insights", "causal_factors", "causal_explanations"}
    summary_keys = {"insights", "ai_summary", "key_variables"}
    full_score = len(full_keys & set(parsed.keys()))
    summary_score = len(summary_keys & set(parsed.keys()))
    return "full" if full_score >= summary_score else "summary"


def _fallback_response(raw_text: str, mode: str) -> dict:
    """
    Retourne un JSON valide minimal si Gemini n'a pas respecté le format.
    Garantit que le caller reçoit toujours un dict, jamais une exception non gérée.
    """
    base = {
        "mode": mode,
        "model_used": _GEMINI_MODEL,
        "raw_interpretation": raw_text,
        "ai_summary": raw_text[:200] if raw_text else "No interpretation available",
        "warning": (
            "Gemini did not return a valid JSON. "
            "Raw text is available in 'raw_interpretation'."
        ),
    }

    if mode == "summary":
        return {
            **base,
            "target": None,
            "key_variables": [],
            "insights": [],
            "ai_summary": None,
        }

    # Mode full par défaut
    return {
        **base,
        "overview": None,
        "data_quality": None,
        "column_insights": [],
        "correlation_analysis": {},
        "causal_factors": [],
        "causal_explanations": [],
        "anomalies": None,
        "recommendations": [],
    }


# Fonction utilitaire pour tronquer les réponses trop longues
def _truncate_json(data, max_chars=8000):
    text = json.dumps(data, ensure_ascii=False)
    return text[:max_chars] + "..." if len(text) > max_chars else text
