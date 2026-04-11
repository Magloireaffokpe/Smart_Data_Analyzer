"""
services/analyzer.py — Orchestrateur central de l'analyse de données

Responsabilité unique : coordonner tous les services (correlations, gemini)
et produire un résultat JSON 100 % sérialisable pour chaque mode.

Deux fonctions publiques :
  • analyze_full(df)                         → analyse experte complète
  • analyze_summary(df, target_column=None)  → résumé produit filtré

Gère correctement :
  - Les valeurs NaN, NaT, Inf, -Inf
  - Les types numpy (int64, float32…) → types Python natifs
  - Les timestamps pandas → chaînes ISO 8601
  - Les colonnes datetime dans les statistiques
  - Les datasets très lacunaires (beaucoup de valeurs manquantes)
"""

import math
import numpy as np
import pandas as pd

from services.correlations import compute_correlations, compute_target_correlations


# ═══════════════════════════════════════════════════════════════════════════════
# ENTRÉE PUBLIQUE — MODE FULL
# ═══════════════════════════════════════════════════════════════════════════════


def analyze_full(df: pd.DataFrame) -> dict:
    """
    Analyse complète d'un DataFrame : toutes les statistiques + corrélations complètes.
    Destinée aux développeurs et analystes data — payload exhaustif.

    Args:
        df : DataFrame propre retourné par file_handler.

    Returns:
        dict JSON-sérialisable avec :
            - dataset_info  : dimensions, colonnes, types
            - statistics    : describe() étendu par type de colonne
            - correlations  : matrices Pearson + Spearman + Chi² + synthèse
            - warnings      : alertes qualité (NaN, doublons, colonnes vides)
    """
    return {
        "dataset_info": _get_dataset_info(df),
        "statistics": _get_statistics(df),
        "correlations": compute_correlations(df),
        "warnings": _get_warnings(df),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENTRÉE PUBLIQUE — MODE SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════


def analyze_summary(df: pd.DataFrame, target_column: str | None = None) -> dict:
    """
    Résumé orienté produit : uniquement les variables qui influencent la cible.
    Destinée au frontend — payload léger et structuré.

    Args:
        df            : DataFrame propre retourné par file_handler.
        target_column : Colonne cible définie par l'utilisateur (optionnelle).
                        Si None, inférée automatiquement depuis les corrélations.

    Returns:
        dict JSON-sérialisable avec :
            - dataset_info  : informations de base sur le dataset
            - target        : variable cible retenue
            - key_variables : variables influentes filtrées et triées
            - warnings      : alertes qualité + alertes d'inférence de cible
    """
    # Calcul des corrélations filtrées sur la variable cible
    target_corr = compute_target_correlations(df, target_column)

    return {
        "dataset_info": _get_dataset_info(df),
        "target": target_corr["target"],
        "key_variables": target_corr["key_variables"],
        "warnings": _get_warnings(df) + target_corr.get("warnings", []),
        "analysis_summary": {
            "nb_key_variables": len(target_corr["key_variables"]),
            "most_influential": (
                target_corr["key_variables"][0]
                if target_corr["key_variables"]
                else None
            ),
        },
    }


# ═══════════════════════════════════════════════════════════════════════════════
# INFORMATIONS DE BASE SUR LE DATASET (partagé entre les deux modes)
# ═══════════════════════════════════════════════════════════════════════════════


def _get_dataset_info(df: pd.DataFrame) -> dict:
    """
    Retourne les informations essentielles sur le dataset :
    dimensions, liste des colonnes avec leur type, et score de qualité global.
    """
    n_rows, n_cols = df.shape
    total_cells = n_rows * n_cols
    missing_total = int(df.isna().sum().sum())
    present_total = total_cells - missing_total
    completeness = (
        round((present_total / total_cells) * 100, 2) if total_cells > 0 else 0.0
    )

    # Label qualitatif de complétude
    if completeness >= 95:
        quality_label = "excellent"
    elif completeness >= 80:
        quality_label = "good"
    elif completeness >= 60:
        quality_label = "moderate"
    else:
        quality_label = "poor"

    return {
        "rows": n_rows,
        "columns": n_cols,
        "column_list": [
            {"name": col, "dtype": str(df[col].dtype)} for col in df.columns
        ],
        "completeness_pct": completeness,
        "quality_label": quality_label,
        "duplicate_rows": int(df.duplicated().sum()),
        "missing_cells": missing_total,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# STATISTIQUES DESCRIPTIVES (mode full uniquement)
# ═══════════════════════════════════════════════════════════════════════════════


def _get_statistics(df: pd.DataFrame) -> dict:
    """
    Statistiques descriptives séparées par type de colonne :
      - Colonnes numériques  : count, mean, std, min, 25%, 50%, 75%, max
      - Colonnes datetime    : count, min, max, range_days
      - Colonnes textuelles  : count, unique, top, freq

    Toutes les valeurs passent par _sanitize() avant retour.
    """

    if len(df) > 10000:
        return {"warning": "Datasets trop grands"}

    result: dict = {}

    # ── Colonnes numériques via describe() ────────────────────────────────────
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    if numeric_cols:
        stats_dict = df[numeric_cols].describe().to_dict()
        for col, metrics in stats_dict.items():
            result[col] = {k: _sanitize(v) for k, v in metrics.items()}

    # ── Colonnes datetime ─────────────────────────────────────────────────────
    datetime_cols = df.select_dtypes(
        include=["datetime64", "datetimetz"]
    ).columns.tolist()

    for col in datetime_cols:
        series = df[col].dropna()
        if series.empty:
            result[col] = {"count": 0, "min": None, "max": None, "range_days": None}
        else:
            date_min = series.min()
            date_max = series.max()
            range_days = (
                (date_max - date_min).days
                if pd.notna(date_min) and pd.notna(date_max)
                else None
            )
            result[col] = {
                "count": int(series.count()),
                "min": _sanitize(date_min),
                "max": _sanitize(date_max),
                "range_days": range_days,
            }

    # ── Colonnes textuelles / catégorielles ───────────────────────────────────
    object_cols = df.select_dtypes(
        include=["object", "string", "category"]
    ).columns.tolist()

    for col in object_cols:
        series = df[col].dropna()
        count_non_null = int(series.count())
        unique = int(series.nunique())

        if count_non_null > 0:
            top_val = series.mode().iloc[0] if not series.mode().empty else None
            freq = int(series.value_counts().iloc[0])
        else:
            top_val, freq = None, 0

        result[col] = {
            "count": count_non_null,
            "unique": unique,
            "top": _sanitize(top_val),
            "freq": freq,
        }

    return result


# ═══════════════════════════════════════════════════════════════════════════════
# ALERTES QUALITÉ (partagées entre les deux modes)
# ═══════════════════════════════════════════════════════════════════════════════


def _get_warnings(df: pd.DataFrame) -> list[str]:
    """
    Génère une liste d'alertes qualité sous forme de strings lisibles.
    Utilisée dans les deux modes pour signaler les problèmes critiques.

    Alertes générées :
      - Lignes dupliquées
      - Colonnes entièrement vides
      - Colonnes avec > 50 % de valeurs manquantes
      - Dataset très petit (< 30 lignes)
    """
    warnings: list[str] = []

    # Lignes dupliquées
    n_duplicates = int(df.duplicated().sum())
    if n_duplicates > 0:
        warnings.append(
            f"{n_duplicates} duplicate row(s) detected — "
            f"consider removing them before modeling."
        )

    # Colonnes entièrement vides
    fully_empty = [col for col in df.columns if df[col].isna().all()]
    if fully_empty:
        warnings.append(
            f"Column(s) entirely empty (100% NaN): {fully_empty}. "
            f"Drop them before analysis."
        )

    # Colonnes majoritairement vides (> 50 % NaN)
    mostly_empty = [
        col
        for col in df.columns
        if df[col].isna().mean() > 0.5 and col not in fully_empty
    ]
    if mostly_empty:
        warnings.append(
            f"Column(s) with more than 50% missing values: {mostly_empty}. "
            f"Consider imputation or removal."
        )

    # Dataset trop petit pour une analyse statistique fiable
    if len(df) < 30:
        warnings.append(
            f"Dataset has only {len(df)} rows. "
            f"Statistical results may not be reliable — collect more data."
        )

    return warnings


# ═══════════════════════════════════════════════════════════════════════════════
# SÉRIALISATION JSON-SAFE (utilitaire interne)
# ═══════════════════════════════════════════════════════════════════════════════


def _sanitize(value):
    """
    Convertit n'importe quelle valeur Python/pandas/numpy en type JSON-natif.

    Règles appliquées dans l'ordre :
      1. None explicite → None
      2. pd.NaT / NaN via pd.isna() → None  (capte NaN, NaT, None pandas)
      3. pd.Timestamp → str ISO 8601
      4. numpy datetime64 → str ISO 8601 via pd.Timestamp
      5. float NaN / Inf / -Inf → None  (double sécurité)
      6. numpy scalar (int64, float32…) → .item() → type Python natif
      7. Autres → inchangés
    """
    if value is None:
        return None

    # NaT / NaN via pd.isna — fonctionne sur scalaires pandas ET numpy
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        # pd.isna lève TypeError sur des objets non-scalaires (listes, dicts)
        pass

    # Timestamps pandas → format ISO 8601 standard
    if isinstance(value, pd.Timestamp):
        return value.isoformat()

    # numpy datetime64 → conversion via pd.Timestamp
    if isinstance(value, np.datetime64):
        ts = pd.Timestamp(value)
        return None if pd.isna(ts) else ts.isoformat()

    # float NaN / Inf : double sécurité si pd.isna n'a pas suffi
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None

    # Scalaires numpy → types Python natifs via .item()
    if isinstance(value, np.generic):
        native = value.item()
        if isinstance(native, float) and (math.isnan(native) or math.isinf(native)):
            return None
        return native

    return value


# ── Rétrocompatibilité : ancienne fonction utilisée par les tests existants ───
# Conservée pour ne pas casser les tests écrits avant la refactorisation.
def analyze_dataframe(df: pd.DataFrame) -> dict:
    """
    Alias de rétrocompatibilité vers analyze_full().
    Maintenu pour ne pas casser les anciens tests et imports.
    À terme, préférer analyze_full() directement.
    """
    return analyze_full(df)
