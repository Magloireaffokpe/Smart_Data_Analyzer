# SmartData — AI Data Analyzer

Analyse de fichiers de données assistée par Gemini : API FastAPI (`backend_fastapi/`) et interface React + Vite (`smart-data-analyzer/`). Détails dans [backend_fastapi/README.md](backend_fastapi/README.md).

<!-- nouveau-pc:debut -->
## Installer sur un nouveau PC

**Prérequis :** Git, Python 3.12, Node.js 20 ou plus et une clé API Gemini.

```bash
git clone git@github.com:Magloireaffokpe/Smart_Data_Analyzer.git
cd Smart_Data_Analyzer/backend_fastapi
python3 -m venv env
source env/bin/activate   # Windows : env\Scripts\activate
pip install -r requirements.txt
echo 'GEMINI_API_KEY=votre_cle' > .env
uvicorn main:app --reload    # http://localhost:8000

# Dans un autre terminal
cd smart-data-analyzer
npm install
npm run dev
```

**À recopier à la main (hors Git) :** `backend_fastapi/.env`. L'interface appelle `http://localhost:8000` par défaut (modifiable avec `VITE_API_BASE_URL`).
<!-- nouveau-pc:fin -->
