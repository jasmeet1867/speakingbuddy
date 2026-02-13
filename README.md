# SpeakingBuddy — Luxembourgish Pronunciation Trainer

A web app that helps users learn and practice Luxembourgish pronunciation. Users see a word, listen to a native reference recording, record their own attempt, and receive an instant pronunciation score with detailed feedback — powered by Praat acoustic analysis.

---

## Quick Start (for coworkers)

### Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Python | 3.10+ | `python --version` |
| pip | any | `pip --version` |
| ffmpeg | any | `ffmpeg -version` |
| Git | any | `git --version` |

> **Windows note:** Use Git Bash or PowerShell. If using Git Bash, use forward slashes in paths (`.venv/Scripts/activate`, not backslashes).

### 1. Clone & switch branch

```bash
git clone https://github.com/LLOKAI/speakingbuddy.git
cd speakingbuddy
git checkout backend-impl
```

### 2. Set up the backend

```bash
cd backend
python -m venv .venv

# Activate the virtual environment:
# Git Bash / macOS / Linux:
source .venv/Scripts/activate    # Windows Git Bash
source .venv/bin/activate        # macOS / Linux

# Windows CMD:
.venv\Scripts\activate

# Install dependencies:
pip install -r requirements.txt
```

### 3. Initialize the database

```bash
# From the backend/ directory, with venv active:
python scripts/import_csv.py --clean
python scripts/precompute_features.py
```

This imports 38 Luxembourgish words across 8 categories and pre-computes Praat acoustic features for all reference audio files.

### 4. Run the app

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000** in your browser. That's it — the backend serves both the API and the frontend.

> If port 8000 is busy: `netstat -ano | grep :8000` to find the PID, then `taskkill /F /PID <pid>` (Windows) or `kill <pid>` (Mac/Linux).

### 5. Verify it works

- Landing page loads with 8 category cards
- Click a category → flashcard page with word + Listen button
- Click Listen → hear the reference audio
- Click 🎙️ to record → click again to stop → Play ▶️ works
- Click **Evaluate Pronunciation** → score + breakdown bars appear

---

## Project Structure (for coworkers)

```
speakingbuddy/
├── index.html              ← Landing page (dynamic category grid)
├── app.js                  ← Fetches categories from API, renders cards
├── topic.html              ← Single practice page (replaces 8 old folders)
├── topic.js                ← Flashcard logic: nav, audio, recording, evaluate
├── topic.css               ← Styles for the practice page
├── style.css               ← Global styles
├── js/
│   ├── config.js           ← API_BASE_URL (auto-detects port)
│   └── api.js              ← Shared API client (fetch wrappers)
│
└── backend/
    ├── requirements.txt    ← Python dependencies
    ├── .env                ← Local config (CORS, paths, port)
    ├── data/
    │   ├── words.csv       ← Source data: 38 words, 8 categories
    │   └── speakingbuddy.db← SQLite database (auto-created)
    ├── reference_audio/    ← 38 WAV files (native speaker recordings)
    │
    ├── app/
    │   ├── main.py         ← FastAPI entry point, CORS, static mount
    │   ├── config.py       ← Settings from .env
    │   ├── database.py     ← SQLite connection + schema DDL
    │   ├── models.py       ← Pydantic request/response schemas
    │   ├── routes/
    │   │   ├── categories.py   ← GET /api/categories
    │   │   ├── words.py        ← GET /api/categories/{name}/words
    │   │   ├── audio.py        ← GET /api/audio/{word_id}
    │   │   └── pronunciation.py← POST /api/pronunciation/check
    │   └── services/
    │       ├── audio_processor.py   ← Upload preprocessing (convert, normalize, trim)
    │       ├── praat_analyzer.py    ← Praat feature extraction (pitch, formants, etc.)
    │       ├── feature_comparator.py← Weighted scoring (DTW + Gaussian similarity)
    │       └── feedback_generator.py← Human-readable feedback from scores
    │
    └── scripts/
        ├── import_csv.py          ← CSV → SQLite importer
        ├── precompute_features.py ← Extract & store Praat features for all ref audio
        ├── prepare_audio.py       ← Standardize audio (mono, 22050Hz, -20dBFS)
        ├── validate_data.py       ← Pre-import data validation
        └── pipeline.py            ← One-command: validate → import → extract
```

### Key files to read first

1. **`backend/app/main.py`** — see how the app starts, what middleware runs, what routes are registered
2. **`backend/app/routes/pronunciation.py`** — the core endpoint: upload → preprocess → analyze → score → respond
3. **`topic.js`** — the frontend logic: how recording, playback, and evaluate work
4. **`js/api.js`** — how the frontend talks to the backend (4 simple functions)

---

## How It All Connects (MVP Architecture)

### The Flow (what happens when a user evaluates pronunciation)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Browser    │────▶│  FastAPI     │────▶│  SQLite DB      │
│  (HTML/JS)   │◀────│  Backend     │◀────│  (words + refs) │
└─────────────┘     └──────────────┘     └─────────────────┘
       │                    │
       │  1. Record audio   │  4. Praat analysis
       │  2. POST blob      │  5. DTW comparison
       │  3. ────────────▶  │  6. Score + feedback
       │  7. ◀────────────  │
       │  8. Show score     │
       └────────────────────┘
```

### Step-by-step data flow

| Step | Where | What happens |
|------|-------|-------------|
| 1 | `app.js` | Page loads → `GET /api/categories` → renders 8 category cards |
| 2 | `topic.js` | User clicks card → `GET /api/categories/{name}/words?lang=en` → loads word list |
| 3 | `topic.js` | User clicks Listen → `GET /api/audio/{word_id}` → plays WAV via `<audio>` |
| 4 | `topic.js` | User clicks 🎙️ → `MediaRecorder` captures mic → WebM blob stored in memory |
| 5 | `api.js` | User clicks Evaluate → `POST /api/pronunciation/check` with FormData (word_id + audio blob) |
| 6 | `audio_processor.py` | Backend receives WebM → converts to WAV (mono, 22050Hz) → normalizes loudness → trims silence |
| 7 | `praat_analyzer.py` | Extracts 5 acoustic features: **pitch contour**, **formants (F1-F3)**, **intensity**, **duration**, **voice quality (jitter/shimmer)** |
| 8 | `feature_comparator.py` | Compares user features vs pre-computed reference features using DTW + Gaussian similarity → weighted score |
| 9 | `feedback_generator.py` | Converts numeric scores into human-readable tips ("Try opening your mouth wider for the vowel sound") |
| 10 | `topic.js` | Frontend receives JSON → renders overall score (0-100) + 5 breakdown bars + improvement tips |

### Scoring weights

| Feature | Weight | What it measures |
|---------|--------|-----------------|
| Formants | 35% | Vowel quality (mouth shape, tongue position) |
| Pitch | 20% | Intonation pattern |
| Intensity | 15% | Volume/energy pattern |
| Duration | 15% | Speaking speed match |
| Voice Quality | 15% | Jitter & shimmer (voice steadiness) |

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/categories` | List all 8 categories with word counts |
| GET | `/api/categories/{name}/words?lang=en` | Get words for a category (with translation) |
| GET | `/api/audio/{word_id}` | Stream reference audio WAV |
| POST | `/api/pronunciation/check` | Evaluate pronunciation (multipart: word_id + audio) |
| GET | `/api/health` | Health check |

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS (no framework) |
| Backend | Python 3.10 + FastAPI + uvicorn |
| Database | SQLite via aiosqlite |
| Audio analysis | Praat (via parselmouth) + pydub + librosa + scipy |
| Audio format | WebM (browser) → WAV 22050Hz mono (backend) |

### Commit History

```
6dcd274 fix: serve frontend from FastAPI, fix evaluate button reload
0f19474 chore: remove old static topic folders
eba41f4 refactor: dynamic frontend with API-driven categories and topics
a8657f3 feat: port Praat pronunciation engine from prototype
2209d64 feat: add data pipeline and import scripts
7a12e07 feat: add backend scaffolding with FastAPI and SQLite
```

---

## MVP Presentation Talking Points

1. **Problem**: Learning Luxembourgish pronunciation is hard — no instant feedback tools exist.

2. **Solution**: SpeakingBuddy lets you hear a word, record yourself, and get a score in seconds.

3. **Demo flow** (30-second walkthrough):
   - Open the app → pick "Animals" → see "Kaz" (cat)
   - Click Listen → hear native pronunciation
   - Record yourself → click Evaluate
   - See score: 78/100 with breakdown (pitch ✓, formants need work)
   - Read tip: "Try rounding your lips more for the vowel"

4. **Technical highlights**:
   - Real acoustic analysis (same engine as linguistics research)
   - 5-dimensional scoring (not just "right/wrong")  
   - Works in any browser with a microphone
   - 38 words across 8 categories ready to go
   - One command to run: `python -m uvicorn app.main:app`

5. **What's next**: More words, difficulty levels, progress tracking, mobile optimization.
