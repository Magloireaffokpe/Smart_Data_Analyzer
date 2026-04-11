"""
main.py — FastAPI application entry point

Initializes the app, loads environment variables, registers middleware,
and declares all API routes.

Available routes:
  GET  /                → health check
  POST /analyze/full    → complete expert analysis (for developers / analysts)
  POST /analyze/summary → lightweight product-ready response (for frontend)

Architecture:
  main.py  →  analyzer.py  →  correlations.py
                          →  gemini_service.py
  main.py  →  file_handler.py

Clé API Gemini : chargée depuis le fichier .env au démarrage via python-dotenv.
"""

import os
from dotenv import load_dotenv
import asyncio

# ── Chargement des variables d'environnement dès le démarrage ─────────────────
# Doit être fait AVANT tout import de service qui pourrait lire os.getenv()
load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from services.file_handler import load_dataframe
from services.analyzer import analyze_full, analyze_summary
from services.gemini_service import interpret_full, interpret_summary

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


# ── Extensions de fichiers supportées ─────────────────────────────────────────
ALLOWED_EXTENSIONS = (".csv", ".xlsx", ".xls", ".ods")

# ── Initialisation de l'application FastAPI ───────────────────────────────────
app = FastAPI(
    title="AI Data Analyzer API",
    description=(
        "Upload a CSV or Excel file and get either a complete expert analysis "
        "or a lightweight product-ready summary powered by Google Gemini.\n\n"
        "**Two modes:**\n"
        "- `/analyze/full` → complete analysis for developers and data analysts\n"
        "- `/analyze/summary` → concise insights for frontend and business users"
    ),
    version="4.0.0",
)

# ── Middleware CORS ────────────────────────────────────────────────────────────
# Permet les requêtes cross-origin depuis n'importe quel frontend pendant le développement.
# En production : remplacer allow_origins=["*"] par les domaines autorisés.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS PARTAGÉS
# ═══════════════════════════════════════════════════════════════════════════════


def _validate_extension(filename: str) -> None:
    """
    Valide l'extension du fichier uploadé.
    Lève HTTPException 400 si le format n'est pas supporté.
    """
    if not filename.lower().endswith(ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file format: '{filename}'. "
                f"Accepted formats: {ALLOWED_EXTENSIONS}"
            ),
        )


async def _load_file(file: UploadFile) -> tuple[str, object]:
    """
    Lit et valide le fichier uploadé, retourne (filename, dataframe).
    Factorisé pour éviter la duplication entre les routes /full et /summary.

    Returns:
        (filename, df) — nom du fichier + DataFrame pandas propre
    """

    filename = file.filename or ""
    _validate_extension(filename)

    contents = await file.read()

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, detail="File too large. Maximum allowed size is 5MB."
        )
    df = load_dataframe(contents, filename)
    return filename, df


# ═══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════════════════════


@app.get("/", tags=["Health"])
def health_check():
    """
    Vérifie que l'API est opérationnelle.
    Indique si la clé Gemini est configurée (sans l'exposer).
    """
    gemini_configured = bool(os.getenv("GEMINI_API_KEY"))
    return {
        "status": "ok",
        "version": "4.0.0",
        "gemini_configured": gemini_configured,
        "supported_formats": list(ALLOWED_EXTENSIONS),
        "endpoints": {
            "POST /analyze/full": "Complete expert analysis (stats + correlations + AI)",
            "POST /analyze/summary": "Lightweight product summary (target + drivers + insights)",
        },
    }


@app.post("/analyze/full", tags=["Analysis — Full"])
async def route_analyze_full(file: UploadFile = File(...), use_ai: bool = Query(True)):
    """
    **Full mode** — Complete expert analysis for developers and data analysts.

    Pipeline:
    1. Read and validate the uploaded file (CSV / Excel / ODS)
    2. Compute full descriptive statistics
    3. Compute complete correlation matrices (Pearson + Spearman + Chi²)
    4. Generate detailed AI interpretation via Gemini

    **Response JSON:**
    ```json
    {
      "filename": "data.csv",
      "dataset_info": { "rows": 150, "columns": 5, ... },
      "statistics": { "column_name": { "mean": ..., "std": ... } },
      "correlations": { "pearson": {...}, "spearman": {...}, "chi2": {...} },
      "ai_analysis": {
        "overview": "...",
        "column_insights": [...],
        "causal_factors": [...],
        "recommendations": [...]
      },
      "warnings": []
    }
    ```

    Requires `GEMINI_API_KEY` environment variable.
    """

    filename, df = await _load_file(file)

    # Étape 1 : analyse statistique complète (stats + corrélations)
    full_result = analyze_full(df)

    # Étape 2 : interprétation IA experte

    ai_analysis = None

    if use_ai:
        ai_analysis = await asyncio.to_thread(interpret_full, filename, full_result)

    return JSONResponse(
        content={
            "meta": {"filename": filename, "mode": "full"},
            "data": {
                "dataset_info": full_result["dataset_info"],
                "statistics": full_result["statistics"],
                "correlations": full_result["correlations"],
                "warnings": full_result["warnings"],
            },
            "ai": ai_analysis,
        }
    )


@app.post("/analyze/summary", tags=["Analysis — Summary"])
async def route_analyze_summary(
    file: UploadFile = File(...),
    target: str | None = Query(
        default=None,
        description=(
            "Target column to analyze (optional). "
            "If not provided, the most influential column is inferred automatically."
        ),
    ),
    use_ai: bool = Query(True),
):
    """
    **Summary mode** — Lightweight product-ready response for frontend and business users.

    Pipeline:
    1. Read and validate the uploaded file
    2. Compute correlations filtered relative to the target column
    3. Generate a short, non-technical AI summary via Gemini

    **Query parameter:**
    - `target` (optional): name of the column to use as the target variable.
      If omitted, the most correlated column is auto-selected.

    **Response JSON:**
    ```json
    {
      "filename": "data.csv",
      "dataset_info": { "rows": 150, ... },
      "target": "price",
      "key_variables": [
        {"name": "ram", "correlation": 0.82, "direction": "positive", "strength": "strong"}
      ],
      "insights": ["RAM strongly impacts price", "..."],
      "ai_summary": "Short plain-language summary.",
      "warnings": []
    }
    ```

    Requires `GEMINI_API_KEY` environment variable.
    """
    filename, df = await _load_file(file)

    # Étape 1 : analyse résumée (corrélations filtrées sur la cible uniquement)
    summary_result = analyze_summary(df, target_column=target)

    # Étape 2 : résumé IA court et non-technique

    ai_interpretation = None

    if use_ai:
        ai_interpretation = await asyncio.to_thread(
            interpret_summary, filename, summary_result
        )

    return JSONResponse(
        content={
            "meta": {"filename": filename, "mode": "summary"},
            "data": {
                "dataset_info": summary_result["dataset_info"],
                "target": summary_result.get("target"),
                "key_variables": summary_result.get("key_variables", []),
                "warnings": summary_result.get("warnings", []),
            },
            "ai": ai_interpretation,
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500, content={"error": "Internal server error", "detail": str(exc)}
    )
