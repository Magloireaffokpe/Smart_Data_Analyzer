# SmartData — AI Data Analyzer

> Upload a CSV/Excel file, get AI‑powered insights, correlations and recommendations instantly.

SmartData combines **FastAPI** (backend) with **React + Vite** (frontend) and **Google Gemini** to provide both a lightweight summary mode and a full statistical analysis with natural‑language interpretations.

![Preview](https://via.placeholder.com/800x400?text=SmartData+Screenshot)

---

## ✨ Features

- **Two analysis modes**
  - _Summary_ – target variable, top drivers, AI insights for business users
  - _Full_ – descriptive stats, Pearson/Spearman/Chi² matrices, expert AI report
- **Multiple file formats** – CSV, XLSX, XLS, ODS (max 5 MB)
- **Smart data quality** – missing values detection, completeness score, warnings
- **AI interpretation** – powered by Gemini 2.5 Flash (or fallback)
- **Responsive UI** – dark/light theme, animated charts, correlation heatmap

---

## 🚀 Tech stack

| Layer      | Technology                                          |
| ---------- | --------------------------------------------------- |
| Frontend   | React 18, TypeScript, Vite, Framer Motion, Recharts |
| Backend    | FastAPI, Pandas, SciPy, Google Gemini AI            |
| Styling    | CSS custom properties, BEM‑like naming              |
| Deployment | (optional) Docker, Vercel + Railway                 |

---

## 📦 Getting started

### Prerequisites

- Node.js 18+ and npm/pnpm
- Python 3.10+ with pip
- A [Gemini API key](https://aistudio.google.com/apikey)

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/smart-data-analyzer.git
cd smart-data-analyzer
```

smart-data-analyzer/
├── backend_fastapi/
│ ├── main.py
│ ├── services/
│ │ ├── analyzer.py
│ │ ├── correlations.py
│ │ ├── file_handler.py
│ │ └── gemini_service.py
│ ├── requirements.txt
│ └── .env
├── frontend/
│ ├── src/
│ │ ├── components/
│ │ ├── pages/
│ │ ├── hooks/
│ │ ├── lib/
│ │ ├── types/
│ │ ├── App.tsx
│ │ └── main.tsx
│ ├── index.html
│ ├── package.json
│ └── vite.config.ts
└── README.md
