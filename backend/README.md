# SpeakingBuddy Backend

Luxembourgish pronunciation learning API powered by FastAPI + Praat.

## Quick Start

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate (pick one for your shell)
# PowerShell:
#   .venv\Scripts\Activate.ps1
# Windows CMD:
#   .venv\Scripts\activate.bat
# Git Bash:
#   source .venv/Scripts/activate
# macOS/Linux:
#   source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initialize DB + precompute reference-audio features (recommended)
python -m scripts.import_csv --csv data/words.csv --audio-dir reference_audio --clean
python -m scripts.precompute_features

# One-command alternative:
# python -m scripts.pipeline

# Run the server (serves both API + frontend)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Open http://127.0.0.1:8000 in your browser.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/categories` | List categories with word counts |
| GET | `/api/categories/{name}/words?lang=en` | Words in a category |
| GET | `/api/words/{id}` | Single word detail |
| GET | `/api/audio/{word_id}` | Stream reference audio |
| POST | `/api/pronunciation/check` | Evaluate pronunciation (stub) |

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app + lifespan
│   ├── config.py             # Settings from .env
│   ├── database.py           # SQLite/aiosqlite setup
│   ├── models.py             # Pydantic schemas
│   ├── routes/
│   │   ├── categories.py     # GET /api/categories
│   │   ├── words.py          # GET words endpoints
│   │   ├── audio.py          # GET /api/audio/{id}
│   │   └── pronunciation.py  # POST /api/pronunciation/check
│   └── services/
│       ├── praat_analyzer.py      # Phase C
│       ├── feature_comparator.py  # Phase C
│       ├── feedback_generator.py  # Phase C
│       └── audio_processor.py     # Phase C
├── scripts/
│   ├── import_csv.py         # CSV → SQLite import
│   └── precompute_features.py # Praat feature pre-computation
├── data/                     # SQLite DB (gitignored)
├── reference_audio/          # Audio files (gitignored)
├── requirements.txt
├── pyproject.toml
└── .env.example
```
