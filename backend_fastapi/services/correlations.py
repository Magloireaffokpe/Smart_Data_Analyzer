"""
services/correlations.py — Correlation analysis engine (multi-method)

Computes correlations between columns using three complementary methods:
  • Pearson  → linear relationships between numerical columns
  • Spearman → monotonic (non-linear) relationships between numerical columns
  • Chi²     → dependency between categorical columns (independence test)

Two public entry points:
  • compute_correlations(df)                  → full matrix, used by /analyze/full
  • compute_target_correlations(df, target)   → filtered by target, used by /analyze/summary

Toutes les valeurs retournées sont 100 % JSON-sérialisables.
"""

import math
import itertools
import numpy as np
import pandas as pd
from scipy import stats


# ── Seuils globaux ────────────────────────────────────────────────────────────

# Labels de force pour les corrélations Pearson/Spearman
CORR_THRESHOLDS = [
    (0.90, "very strong"),
    (0.70, "strong"),
    (0.50, "moderate"),
    (0.30, "weak"),
    (0.00, "negligible"),
]

# Nombre maximum de paires retournées dans le résumé top_pairs
TOP_N_PAIRS = 15

# Seuil p-value pour considérer une corrélation statistiquement significative
PVALUE_THRESHOLD = 0.05

# Seuil de filtre pour le mode summary : on ignore les corrélations faibles
SUMMARY_CORR_THRESHOLD = 0.5

# Seuil de redondance : colonnes quasi-identiques (|r| > 0.95)
REDUNDANCY_THRESHOLD = 0.95

# Filtrage Chi² : on exclut les colonnes avec trop de modalités (ex: colonnes ID)
CHI2_MAX_UNIQUE_RATIO = 0.5  # ratio unique / n_rows max
CHI2_MAX_UNIQUE_ABS = 50  # nombre absolu de modalités max


# ═══════════════════════════════════════════════════════════════════════════════
# ENTRÉE PUBLIQUE — MODE FULL (matrices complètes)
# ═══════════════════════════════════════════════════════════════════════════════


def compute_correlations(df: pd.DataFrame) -> dict:
    """
    Calcule toutes les corrélations disponibles : matrices complètes + synthèse.
    Utilisé par /analyze/full — retourne toutes les données brutes.

    Args:
        df : DataFrame analysé (types déjà inférés par file_handler).

    Returns:
        dict JSON-sérialisable avec :
            - pearson  : matrice complète + top paires avec p-values
            - spearman : matrice complète + top paires avec p-values
            - chi2     : résultats Chi² par paire catégorielle
            - summary  : synthèse globale (paires influentes, colonnes redondantes, hubs)
    """
    result: dict = {}

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    category_cols = _get_categorical_cols(df)

    # Calcul Pearson si au moins 2 colonnes numériques disponibles
    if len(numeric_cols) >= 2:
        result["pearson"] = _compute_pearson(df[numeric_cols])
    else:
        result["pearson"] = _empty_result("Less than 2 numeric columns available.")

    # Calcul Spearman dans les mêmes conditions
    if len(numeric_cols) >= 2:
        result["spearman"] = _compute_spearman(df[numeric_cols])
    else:
        result["spearman"] = _empty_result("Less than 2 numeric columns available.")

    # Calcul Chi² si au moins 2 colonnes catégorielles exploitables
    if len(category_cols) >= 2:
        result["chi2"] = _compute_chi2(df, category_cols)
    else:
        result["chi2"] = _empty_result(
            f"Less than 2 usable categorical columns. "
            f"Detected: {category_cols or 'none'}."
        )

    # Synthèse globale : paires influentes, redondances, colonnes hub
    result["summary"] = _build_global_summary(result, numeric_cols, category_cols)

    return result


# ═══════════════════════════════════════════════════════════════════════════════
# ENTRÉE PUBLIQUE — MODE SUMMARY (filtré par variable cible)
# ═══════════════════════════════════════════════════════════════════════════════


def compute_target_correlations(
    df: pd.DataFrame,
    target_column: str | None = None,
    threshold: float = SUMMARY_CORR_THRESHOLD,
) -> dict:
    """
    Calcule les corrélations UNIQUEMENT par rapport à une variable cible.
    Filtre les corrélations faibles (|r| < threshold) pour ne garder que les drivers réels.
    Utilisé par /analyze/summary — payload léger, orienté frontend.

    Args:
        df            : DataFrame analysé.
        target_column : Colonne cible définie par l'utilisateur.
                        Si None, la colonne cible est inférée automatiquement
                        (colonne numérique la plus corrélée aux autres).
        threshold     : Seuil minimum de corrélation absolue à retenir (défaut 0.5).

    Returns:
        dict avec :
            - target          : nom de la variable cible retenue
            - target_inferred : True si la cible a été inférée automatiquement
            - key_variables   : liste des variables influentes triées par |corrélation|
            - warnings        : alertes si la cible est invalide ou indisponible
    """
    warnings: list[str] = []
    numeric_cols = df.select_dtypes(include="number").columns.tolist()

    # ── Validation et inférence de la variable cible ──────────────────────────
    target, inferred = _resolve_target(df, target_column, numeric_cols, warnings)

    if target is None:
        # Aucune colonne numérique disponible → corrélations impossibles
        return {
            "target": None,
            "target_inferred": inferred,
            "key_variables": [],
            "warnings": warnings,
        }

    # ── Calcul des corrélations Pearson vis-à-vis de la cible ─────────────────
    # On utilise Pearson comme référence principale pour la simplicité du mode summary.
    # Les corrélations sont calculées sur les lignes sans NaN dans la cible ou les features.
    num_df = df[numeric_cols].dropna(subset=[target])
    feature_cols = [c for c in numeric_cols if c != target]

    if not feature_cols:
        warnings.append(f"No other numeric columns to correlate with '{target}'.")
        return {
            "target": target,
            "target_inferred": inferred,
            "key_variables": [],
            "warnings": warnings,
        }

    key_variables = _compute_target_drivers(
        num_df, target, feature_cols, threshold, warnings
    )

    return {
        "target": target,
        "target_inferred": inferred,
        "key_variables": key_variables,
        "warnings": warnings,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# RÉSOLUTION DE LA VARIABLE CIBLE
# ═══════════════════════════════════════════════════════════════════════════════


def _resolve_target(
    df: pd.DataFrame,
    target_column: str | None,
    numeric_cols: list,
    warnings: list,
) -> tuple[str | None, bool]:
    """
    Résout la variable cible à utiliser pour le mode summary.

    Priorité :
      1. Si target_column est fourni et valide → on l'utilise directement
      2. Si target_column est fourni mais invalide → warning + inférence auto
      3. Si target_column est None → inférence automatique

    Inférence automatique :
      La colonne numérique dont la somme des corrélations absolues avec les autres
      est la plus élevée est désignée comme variable cible (la plus "connectée").

    Returns:
        (target_name, was_inferred)
    """
    # Cas 1 : cible fournie et valide
    if target_column is not None:
        if target_column in df.columns:
            if target_column in numeric_cols:
                return target_column, False
            else:
                warnings.append(
                    f"Column '{target_column}' is not numeric — cannot compute correlations. "
                    f"Auto-inferring target."
                )
        else:
            warnings.append(
                f"Column '{target_column}' not found in dataset. "
                f"Auto-inferring target."
            )

    # Cas 2 : inférence automatique
    if len(numeric_cols) == 0:
        warnings.append("No numeric columns available for correlation analysis.")
        return None, True

    if len(numeric_cols) == 1:
        # Une seule colonne numérique → forcément la cible
        return numeric_cols[0], True

    # Calcul de la somme des |corrélations| pour chaque colonne numérique
    # La colonne la plus corrélée aux autres est désignée cible
    try:
        corr_matrix = df[numeric_cols].dropna().corr(method="pearson").abs()
        # Exclure la diagonale (self-corrélation = 1.0)
        np.fill_diagonal(corr_matrix.values, 0)
        hub_col = corr_matrix.sum(axis=1).idxmax()
        warnings.append(
            f"No target specified. Auto-inferred: '{hub_col}' "
            f"(most correlated with other variables)."
        )
        return hub_col, True
    except Exception:
        # Fallback : première colonne numérique disponible
        return numeric_cols[0], True


# ═══════════════════════════════════════════════════════════════════════════════
# CALCUL DES DRIVERS DE LA VARIABLE CIBLE
# ═══════════════════════════════════════════════════════════════════════════════


def _compute_target_drivers(
    df: pd.DataFrame,
    target: str,
    feature_cols: list,
    threshold: float,
    warnings: list,
) -> list[dict]:
    """
    Calcule la corrélation Pearson de chaque feature avec la variable cible,
    filtre selon le seuil, et trie par importance décroissante.

    Returns:
        Liste de dicts triée par |correlation| décroissant :
        [{"name": "col", "correlation": 0.82, "direction": "positive", "strength": "strong"}, ...]
    """
    drivers = []

    for col in feature_cols:
        # Suppression des NaN sur la paire (target, col) pour ce calcul
        pair = df[[target, col]].dropna()
        if len(pair) < 3:
            continue

        try:
            corr, pval = stats.pearsonr(pair[target].values, pair[col].values)
        except Exception:
            continue

        if math.isnan(corr):
            continue

        # On ne garde que les corrélations au-dessus du seuil
        if abs(corr) < threshold:
            continue

        drivers.append(
            {
                "name": col,
                "correlation": round(float(corr), 4),
                "direction": "positive" if corr > 0 else "negative",
                "strength": _label_corr(abs(corr)),
                "p_value": round(float(pval), 6),
                "significant": bool(pval < PVALUE_THRESHOLD),
                # Score 0-100 utilisable par un frontend pour bar charts / ranking visuel
                "importance_score": round(abs(float(corr)) * 100),
            }
        )

    # Tri par valeur absolue décroissante → les drivers les plus forts en premier
    drivers.sort(key=lambda x: abs(x["correlation"]), reverse=True)

    if not drivers:
        warnings.append(
            f"No variable has a correlation above {threshold} with '{target}'. "
            f"Try lowering the threshold."
        )

    return drivers


# ═══════════════════════════════════════════════════════════════════════════════
# CALCUL PEARSON (mode full)
# ═══════════════════════════════════════════════════════════════════════════════


def _compute_pearson(num_df: pd.DataFrame) -> dict:
    """
    Corrélation de Pearson : relation linéaire entre variables numériques.
    Retourne la matrice complète + les top paires avec p-value scipy.
    """
    # Suppression des lignes avec NaN pour un calcul fiable
    clean = num_df.dropna()
    n_rows = len(clean)

    if n_rows < 3:
        return _empty_result("Not enough non-NaN rows for Pearson (minimum 3).")

    corr_matrix = clean.corr(method="pearson")
    pairs = _extract_top_pairs(clean, method="pearson", n=TOP_N_PAIRS)

    return {
        "method": "pearson",
        "description": "Measures linear relationships between numeric variables.",
        "n_rows_used": n_rows,
        "matrix": _matrix_to_dict(corr_matrix),
        "top_pairs": pairs,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# CALCUL SPEARMAN (mode full)
# ═══════════════════════════════════════════════════════════════════════════════


def _compute_spearman(num_df: pd.DataFrame) -> dict:
    """
    Corrélation de Spearman : relation monotone (rang), robuste aux outliers.
    Si Spearman >> Pearson pour une paire → relation non-linéaire probable.
    """
    clean = num_df.dropna()
    n_rows = len(clean)

    if n_rows < 3:
        return _empty_result("Not enough non-NaN rows for Spearman (minimum 3).")

    corr_matrix = clean.corr(method="spearman")
    pairs = _extract_top_pairs(clean, method="spearman", n=TOP_N_PAIRS)

    return {
        "method": "spearman",
        "description": (
            "Measures monotonic (non-linear) relationships between numeric variables. "
            "Robust to outliers. If Spearman > Pearson: non-linear relationship likely."
        ),
        "n_rows_used": n_rows,
        "matrix": _matrix_to_dict(corr_matrix),
        "top_pairs": pairs,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# CALCUL CHI² (mode full)
# ═══════════════════════════════════════════════════════════════════════════════


def _compute_chi2(df: pd.DataFrame, category_cols: list) -> dict:
    """
    Test du Chi² : détecte les dépendances entre colonnes catégorielles.
    p-value < 0.05 → dépendance significative.
    V de Cramér → force de la dépendance (0 = indépendant, 1 = dépendance totale).
    """
    pairs_results = []
    col_pairs = list(itertools.combinations(category_cols, 2))

    for col_a, col_b in col_pairs:
        result = _chi2_pair(df, col_a, col_b)
        if result:
            pairs_results.append(result)

    # Tri par V de Cramér décroissant — associations les plus fortes en premier
    pairs_results.sort(key=lambda x: x.get("cramers_v", 0), reverse=True)

    significant = [p for p in pairs_results if p.get("significant")]

    return {
        "method": "chi2",
        "description": (
            "Independence test between categorical columns. "
            "p-value < 0.05 = significant dependency. "
            "Cramér's V = association strength (0→independent, 1→total dependency)."
        ),
        "columns_tested": category_cols,
        "n_pairs_tested": len(pairs_results),
        "n_significant": len(significant),
        "pairs": pairs_results,
    }


def _chi2_pair(df: pd.DataFrame, col_a: str, col_b: str) -> dict | None:
    """Calcule le Chi² et le V de Cramér pour une paire de colonnes catégorielles."""
    try:
        sub = df[[col_a, col_b]].dropna()
        if len(sub) < 5:
            return None

        contingency = pd.crosstab(sub[col_a], sub[col_b])

        # Au moins 2 modalités par colonne nécessaires pour le test
        if contingency.shape[0] < 2 or contingency.shape[1] < 2:
            return None

        chi2_stat, p_value, dof, _ = stats.chi2_contingency(contingency)

        # V de Cramér : normalisation du Chi² entre 0 et 1
        n = len(sub)
        min_dim = min(contingency.shape[0] - 1, contingency.shape[1] - 1)
        cramers_v = math.sqrt(chi2_stat / (n * min_dim)) if min_dim > 0 else 0.0

        significant = bool(p_value < PVALUE_THRESHOLD)

        return {
            "column_a": col_a,
            "column_b": col_b,
            "chi2_statistic": round(float(chi2_stat), 4),
            "p_value": round(float(p_value), 6),
            "degrees_of_freedom": int(dof),
            "cramers_v": round(float(cramers_v), 4),
            "association_strength": _label_cramers(cramers_v),
            "significant": significant,
            "interpretation": (
                f"{'Significant' if significant else 'Non-significant'} association "
                f"between '{col_a}' and '{col_b}' "
                f"(V={cramers_v:.3f}, p={p_value:.4f})."
            ),
        }
    except Exception:
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# SYNTHÈSE GLOBALE (mode full uniquement)
# ═══════════════════════════════════════════════════════════════════════════════


def _build_global_summary(
    result: dict, numeric_cols: list, category_cols: list
) -> dict:
    """
    Construit une synthèse de haut niveau depuis les résultats des trois méthodes.
    Identifie les paires influentes, les colonnes redondantes et les colonnes hub.
    Utilisée uniquement dans le mode full.
    """
    influential: list = []
    redundant: list = []

    # ── Paires Pearson fortes et significatives ───────────────────────────────
    for pair in result.get("pearson", {}).get("top_pairs", []):
        abs_corr = abs(pair.get("correlation", 0))
        if abs_corr >= 0.5 and pair.get("significant"):
            influential.append(
                {
                    "method": "Pearson",
                    "col_a": pair["col_a"],
                    "col_b": pair["col_b"],
                    "correlation": pair["correlation"],
                    "strength": pair["strength"],
                    "direction": pair["direction"],
                }
            )
        # Colonnes quasi-redondantes (trop similaires pour coexister dans un modèle)
        if abs_corr >= REDUNDANCY_THRESHOLD:
            redundant.append(
                f"{pair['col_a']} ↔ {pair['col_b']} "
                f"(Pearson r={pair['correlation']:.3f})"
            )

    # ── Paires où Spearman diverge nettement de Pearson (non-linéarité) ───────
    pearson_map = {
        (p["col_a"], p["col_b"]): p.get("correlation", 0)
        for p in result.get("pearson", {}).get("top_pairs", [])
    }
    for pair in result.get("spearman", {}).get("top_pairs", []):
        key = (pair["col_a"], pair["col_b"])
        p_val = pearson_map.get(key, pearson_map.get((key[1], key[0]), None))
        s_val = pair.get("correlation", 0)
        if p_val is not None and abs(s_val - p_val) > 0.2 and abs(s_val) >= 0.5:
            influential.append(
                {
                    "method": "Spearman (non-linear detected)",
                    "col_a": pair["col_a"],
                    "col_b": pair["col_b"],
                    "correlation": s_val,
                    "strength": pair["strength"],
                    "direction": pair["direction"],
                    "note": (
                        f"Pearson={p_val:.3f} vs Spearman={s_val:.3f} "
                        f"→ non-linear relationship likely"
                    ),
                }
            )

    # ── Paires Chi² avec association forte ────────────────────────────────────
    for pair in result.get("chi2", {}).get("pairs", []):
        if pair.get("significant") and pair.get("cramers_v", 0) >= 0.3:
            influential.append(
                {
                    "method": "Chi²",
                    "col_a": pair["column_a"],
                    "col_b": pair["column_b"],
                    "cramers_v": pair["cramers_v"],
                    "strength": pair["association_strength"],
                    "direction": "N/A (categorical)",
                }
            )

    # ── Colonnes hub : celles qui apparaissent dans le plus de paires fortes ──
    col_connections: dict = {}
    for item in influential:
        for col in (item.get("col_a"), item.get("col_b")):
            if col:
                col_connections[col] = col_connections.get(col, 0) + 1

    hub_cols = sorted(col_connections.items(), key=lambda x: x[1], reverse=True)

    return {
        "n_influential_pairs": len(influential),
        "influential_pairs": influential,
        "redundant_columns": redundant,
        "hub_columns": [{"column": c, "n_connections": n} for c, n in hub_cols[:10]],
        "numeric_columns_analyzed": numeric_cols,
        "categorical_columns_analyzed": category_cols,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS INTERNES
# ═══════════════════════════════════════════════════════════════════════════════


def _extract_top_pairs(df: pd.DataFrame, method: str, n: int) -> list:
    """
    Extrait les N paires les plus corrélées (valeur absolue) depuis un DataFrame,
    avec calcul de la p-value exacte via scipy pour chaque paire.
    """
    cols = df.columns.tolist()
    pairs = []

    for col_a, col_b in itertools.combinations(cols, 2):
        x = df[col_a].values
        y = df[col_b].values

        # Masque commun : on ignore les lignes où l'une ou l'autre est NaN
        mask = ~(np.isnan(x) | np.isnan(y))
        x_clean = x[mask]
        y_clean = y[mask]

        if len(x_clean) < 3:
            continue

        try:
            if method == "pearson":
                corr, pval = stats.pearsonr(x_clean, y_clean)
            else:
                corr, pval = stats.spearmanr(x_clean, y_clean)
        except Exception:
            continue

        if math.isnan(corr):
            continue

        pairs.append(
            {
                "col_a": col_a,
                "col_b": col_b,
                "correlation": round(float(corr), 4),
                "p_value": round(float(pval), 6),
                "significant": bool(pval < PVALUE_THRESHOLD),
                "strength": _label_corr(abs(corr)),
                "direction": "positive" if corr > 0 else "negative",
                "interpretation": (
                    f"{_label_corr(abs(corr)).capitalize()} "
                    f"{'positive' if corr > 0 else 'negative'} correlation "
                    f"between '{col_a}' and '{col_b}' "
                    f"(r={corr:.3f}, p={pval:.4f}"
                    f"{'' if pval < PVALUE_THRESHOLD else ' — not significant'})."
                ),
            }
        )

    # Tri par valeur absolue décroissante
    pairs.sort(key=lambda x: abs(x["correlation"]), reverse=True)
    return pairs[:n]


def _matrix_to_dict(corr_matrix: pd.DataFrame) -> dict:
    """Convertit la matrice de corrélation pandas en dict JSON-sérialisable."""
    result = {}
    for col in corr_matrix.columns:
        result[col] = {}
        for row in corr_matrix.index:
            val = corr_matrix.loc[row, col]
            result[col][row] = round(float(val), 4) if not math.isnan(val) else None
    return result


def _get_categorical_cols(df: pd.DataFrame) -> list:
    """
    Retourne les colonnes catégorielles exploitables pour Chi² :
    exclut les colonnes ID (trop de valeurs uniques) et les colonnes constantes.
    """
    candidates = df.select_dtypes(
        include=["object", "string", "category"]
    ).columns.tolist()

    n_rows = max(len(df), 1)
    valid = []

    for col in candidates:
        n_unique = df[col].nunique()
        unique_ratio = n_unique / n_rows
        # Au moins 2 modalités, pas trop de modalités (sinon c'est un ID)
        if (
            2 <= n_unique <= CHI2_MAX_UNIQUE_ABS
            and unique_ratio <= CHI2_MAX_UNIQUE_RATIO
        ):
            valid.append(col)

    return valid


def _label_corr(abs_corr: float) -> str:
    """Label textuel pour la force d'une corrélation Pearson/Spearman."""
    for threshold, label in CORR_THRESHOLDS:
        if abs_corr >= threshold:
            return label
    return "negligible"


def _label_cramers(v: float) -> str:
    """Label textuel pour la force d'un V de Cramér (Chi²)."""
    if v >= 0.5:
        return "strong"
    if v >= 0.3:
        return "moderate"
    if v >= 0.1:
        return "weak"
    return "negligible"


def _empty_result(reason: str) -> dict:
    """Structure vide retournée quand un calcul n'est pas possible."""
    return {"available": False, "reason": reason}
