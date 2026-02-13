# SpeakingBuddy Backend

Luxembourgish pronunciation learning API powered by FastAPI + Praat.

## Quick Start

```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Import word data (once you have the CSV + audio files)
python -m scripts.import_csv --csv data/words.csv

# Run the server
uvicorn app.main:app --reload --port 8000
```

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
