"""
services/file_handler.py — Lecture et conversion des fichiers uploadés
Responsabilité unique : transformer des bytes bruts en DataFrame pandas propre.

Formats supportés : .csv, .xlsx, .xls, .ods
"""

import io
import pandas as pd
from fastapi import HTTPException

# Taille maximale acceptée : 50 Mo
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024


def load_dataframe(contents: bytes, filename: str) -> pd.DataFrame:
    """
    Lit un fichier CSV ou Excel depuis des bytes et retourne un DataFrame
    avec des types correctement inférés.

    Pipeline appliqué :
        1. Vérification taille / contenu non vide
        2. Parsing selon l'extension
        3. Nettoyage des noms de colonnes (espaces, doublons)
        4. Inférence intelligente des types colonne par colonne

    Args:
        contents : Contenu binaire du fichier uploadé.
        filename : Nom original du fichier (utilisé pour détecter le format).

    Returns:
        pd.DataFrame prêt à être analysé.

    Raises:
        HTTPException 400 : format non supporté.
        HTTPException 413 : fichier trop volumineux.
        HTTPException 422 : fichier vide ou illisible.
    """
    # ── Garde-fous préliminaires ──────────────────────────────────────────────
    if not contents:
        raise HTTPException(status_code=422, detail="Le fichier uploadé est vide.")

    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Fichier trop volumineux. Limite : {MAX_FILE_SIZE_BYTES // (1024*1024)} Mo.",
        )

    # ── Parsing selon l'extension ─────────────────────────────────────────────
    ext = filename.lower().rsplit(".", 1)[-1]
    buffer = io.BytesIO(contents)

    try:
        if ext == "csv":
            df = _read_csv(buffer)
        elif ext == "xlsx":
            df = pd.read_excel(buffer, engine="openpyxl")
        elif ext == "xls":
            df = pd.read_excel(buffer, engine="xlrd")
        elif ext == "ods":
            df = pd.read_excel(buffer, engine="odf")
        else:
            raise HTTPException(
                status_code=400,
                detail="Format non supporté. Formats acceptés : .csv, .xlsx, .xls, .ods",
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Impossible de lire le fichier '{filename}' : {str(exc)}",
        ) from exc

    if df.empty:
        raise HTTPException(
            status_code=422,
            detail="Le fichier ne contient aucune donnée (DataFrame vide après lecture).",
        )

    # ── Nettoyage des colonnes ────────────────────────────────────────────────
    df = _clean_columns(df)

    # ── Inférence des types (ordre important) ─────────────────────────────────
    df = _infer_types(df)

    return df


# ── Fonctions privées ─────────────────────────────────────────────────────────

def _read_csv(buffer: io.BytesIO) -> pd.DataFrame:
    """
    Détecte automatiquement le séparateur CSV parmi : virgule, point-virgule,
    tabulation, pipe. Essaie aussi différents encodages courants.
    """
    separators = [",", ";", "\t", "|"]
    encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252"]
    best_df = None
    best_col_count = 0

    for encoding in encodings:
        for sep in separators:
            try:
                buffer.seek(0)
                df = pd.read_csv(
                    buffer,
                    sep=sep,
                    encoding=encoding,
                    parse_dates=False,
                    keep_default_na=True,
                    skipinitialspace=True,
                )
                if len(df.columns) > best_col_count:
                    best_col_count = len(df.columns)
                    best_df = df
                    if best_col_count > 1:
                        break
            except Exception:
                continue
        if best_df is not None and best_col_count > 1 and encoding in ("utf-8", "utf-8-sig"):
            break

    if best_df is None:
        buffer.seek(0)
        best_df = pd.read_csv(buffer, sep=",", encoding="utf-8", errors="replace")

    return best_df


def _clean_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    - Strip des noms de colonnes.
    - Supprime les colonnes Unnamed totalement vides.
    - Renomme les doublons de colonnes.
    """
    df.columns = [str(c).strip() for c in df.columns]

    unnamed = [c for c in df.columns if c.startswith("Unnamed:") and df[c].isna().all()]
    if unnamed:
        df = df.drop(columns=unnamed)

    seen: dict = {}
    new_cols = []
    for col in df.columns:
        if col in seen:
            seen[col] += 1
            new_cols.append(f"{col}_{seen[col]}")
        else:
            seen[col] = 0
            new_cols.append(col)
    df.columns = new_cols

    return df


def _infer_types(df: pd.DataFrame) -> pd.DataFrame:
    """
    Infère les types colonne par colonne dans l'ordre :
        1. Numérique  → accepté si >= 80 % des valeurs non-nulles sont numériques
        2. Datetime   → accepté si >= 70 % des valeurs non-nulles sont des dates
        3. String     → fallback

    Préserve les types déjà corrects (int/float/datetime lus par Excel/openpyxl).
    """
    for col in df.columns:
        series = df[col]

        if pd.api.types.is_numeric_dtype(series):
            continue
        if pd.api.types.is_datetime64_any_dtype(series):
            continue

        # ── Tentative numérique ───────────────────────────────────────────────
        converted_num = pd.to_numeric(series, errors="coerce")
        non_null = series.dropna()
        if len(non_null) > 0:
            num_ratio = converted_num.notna().sum() / len(non_null)
            if num_ratio >= 0.8:
                df[col] = converted_num
                continue

        # ── Tentative datetime (uniquement sur colonnes textuelles) ───────────
        if pd.api.types.is_object_dtype(series):
            converted_dt = _try_parse_date_series(series)
            if converted_dt is not None:
                df[col] = converted_dt
                continue

    return df


def _try_parse_date_series(series: pd.Series):
    """
    Retourne la Series convertie en datetime si >= 70 % des valeurs
    non-nulles sont des dates valides. Retourne None sinon.
    Les Timestamps restent en datetime64 — la sérialisation JSON est
    gérée par analyzer._sanitize().
    """
    non_null = series.dropna()
    if len(non_null) == 0:
        return None

    try:
        converted = pd.to_datetime(series, infer_datetime_format=True, errors="coerce")
        date_ratio = converted.notna().sum() / len(non_null)
        if date_ratio >= 0.7:
            return converted
    except Exception:
        pass

    return None