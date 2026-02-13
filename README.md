# SpeakingBuddy — Luxembourgish Pronunciation Trainer

A web app that helps users learn and practice Luxembourgish pronunciation. Users see a word, listen to a native reference recording, record their own attempt, and receive an instant pronunciation score with detailed feedback — powered by Praat acoustic analysis.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Data Files: CSV & Audio](#data-files-csv--audio)
3. [Adding New Words & Categories](#adding-new-words--categories)
4. [Project Structure](#project-structure)
5. [How It All Connects](#how-it-all-connects-mvp-architecture)
6. [Project Outline Mapping](#project-outline-mapping)
7. [MVP Presentation Talking Points](#mvp-presentation-talking-points)
8. [Commit History](#commit-history)

---

## Quick Start

### Prerequisites

| Tool | Version | Check | Install |
|------|---------|-------|---------|
| Python | 3.10+ | `python --version` | [python.org](https://python.org) or `pyenv install 3.10` |
| pip | any | `pip --version` | Bundled with Python |
| ffmpeg | any | `ffmpeg -version` | `choco install ffmpeg` (Windows) / `brew install ffmpeg` (Mac) |
| Git | any | `git --version` | [git-scm.com](https://git-scm.com) |

> **Windows note:** Use Git Bash or PowerShell. If using Git Bash, always use forward slashes: `.venv/Scripts/activate`, not backslashes.

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
source .venv/Scripts/activate    # Windows Git Bash
source .venv/bin/activate        # macOS / Linux
# .venv\Scripts\activate         # Windows CMD

# Install dependencies:
pip install -r requirements.txt
```

### 3. Initialize the database

```bash
# From the backend/ directory, with venv active:
python -m scripts.import_csv --csv data/words.csv --audio-dir reference_audio --clean
python -m scripts.precompute_features
```

This imports 38 Luxembourgish words across 8 categories from the CSV and pre-computes Praat acoustic features for all 38 reference audio files.

> **One-command alternative:** `python -m scripts.pipeline` runs the full chain: validate → preprocess audio → import CSV → extract features.

### 4. Run the app

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000** in your browser. The backend serves both the API and the frontend — no Live Server or separate web server needed.

> **Port already in use?** Find what's using it: `netstat -ano | grep :8000` → kill it: `taskkill /F /PID <pid>` (Windows) or `kill <pid>` (Mac/Linux).

### 5. Verify it works

1. Landing page loads with 8 category cards (Animals, Greetings, Food, etc.)
2. Click a category → flashcard page shows the Luxembourgish word + translation
3. Click **🔊 Listen** → hear the native reference pronunciation
4. Click **🎙️** to record → click again to stop → **▶️** plays back your recording
5. Click **📊 Evaluate Pronunciation** → score (0-100), five breakdown bars, and improvement tips appear

---

## Data Files: CSV & Audio

### Where files live

```
backend/
├── data/
│   ├── words.csv              ← The source of truth for all words
│   └── speakingbuddy.db       ← Generated SQLite DB (don't edit directly)
└── reference_audio/           ← One WAV per word (native speaker recordings)
    ├── addi2.wav
    ├── bam1.wav
    ├── hond1.wav
    └── ... (38 files total)
```

### CSV format (`backend/data/words.csv`)

The CSV is the **single source of truth**. The database is always regenerated from it.

| Column | Required | Example | Description |
|--------|----------|---------|-------------|
| `LOD Word reference` | Yes | `HOND1` | Unique ID from the LOD dictionary |
| `Audio Reference` | Yes | `hond1` | Filename without `.wav` (script appends it automatically) |
| `Word Category` | Yes | `Animals` | Display name; auto-slugified for URLs (`Animals` → `animals`) |
| `Luxembourgish` | Yes | `Hond` | The word in Luxembourgish |
| `English` | Optional | `dog` | English translation |
| `French` | Optional | `chien` | French translation |
| `German` | Optional | `Hund` | German translation |

Example row:
```csv
HOND1,hond1,Animals,Hond,dog,chien,Hund
```

### Audio file requirements

Each word in the CSV needs a matching WAV file in `backend/reference_audio/`.

| Property | Required value | Why |
|----------|---------------|-----|
| Format | WAV | Praat requires uncompressed audio |
| Sample rate | 22050 Hz | Standardized for consistent feature extraction |
| Channels | Mono (1) | Stereo confuses formant analysis |
| Loudness | ≈ -20 dBFS | Normalized for fair intensity comparison |
| Content | Single word, clear | Silence-trimmed, no background noise |

> **Audio not standardized?** Run `python -m scripts.prepare_audio --audio-dir reference_audio --backup` to auto-convert any input WAV to the correct specs. Originals are saved to `reference_audio/originals/`.

### How CSV → Database works

```
words.csv                          speakingbuddy.db
┌──────────────────────┐           ┌─────────────────────────┐
│ LOD Word reference   │           │ categories table        │
│ Audio Reference      │──import──▶│   id, name, display_name│
│ Word Category        │   script  ├─────────────────────────┤
│ Luxembourgish        │           │ words table             │
│ English, French, ... │           │   id, word_lb, audio_   │
└──────────────────────┘           │   filename, category_id,│
                                   │   translations,         │
         reference_audio/          │   praat_features_json   │
         ┌──────────┐              └──────────┬──────────────┘
         │ hond1.wav│──precompute──────────────┘
         │ kaz1.wav │   features    (stored as JSON in the
         │ ...      │               praat_features_json col)
         └──────────┘
```

The import script (`scripts/import_csv.py`):
1. Reads each CSV row
2. Creates the category if it doesn't exist (auto-slugifies the name)
3. Inserts the word with all translations
4. Validates the matching audio file exists in `reference_audio/`

Then `scripts/precompute_features.py`:
1. Loads each reference WAV through Praat
2. Extracts pitch contour, formants (F1-F3), intensity, duration, jitter, shimmer
3. Stores the feature vectors as JSON in the `praat_features_json` column
4. These pre-computed features are loaded at scoring time — no reanalysis on every request

---

## Adding New Words & Categories

### Add a single new word

1. **Record the audio** — record a native speaker saying the word clearly. Save as WAV.

2. **Drop the WAV** into `backend/reference_audio/`:
   ```
   backend/reference_audio/yourword1.wav
   ```

3. **Add a row** to `backend/data/words.csv`:
   ```csv
   YOURWORD1,yourword1,YourCategory,Yourword,english,french,german
   ```
   - If `YourCategory` doesn't exist yet, it will be created automatically
   - The `Audio Reference` column (`yourword1`) must match the filename minus `.wav`

4. **Re-run the pipeline**:
   ```bash
   cd backend
   python -m scripts.pipeline
   ```
   This validates the CSV, standardizes the audio, imports into the DB, and extracts Praat features — all in one command.

5. **Restart the server** — the new word appears immediately.

### Add a whole new category

Just use a new category name in the `Word Category` column of the CSV. The system auto-creates categories during import. Add as many words as you want under that name.

For the category to show an emoji on the landing page, add it to the `CATEGORY_EMOJI` map in two files:
- `app.js` (line ~5) — landing page cards
- `topic.js` (line ~30) — practice page header

```js
const CATEGORY_EMOJI = {
  greetings: "👋", animals: "🐾", house: "🏠", outdoor: "🌳",
  family: "👨‍👩‍👧", food: "🍔", drinks: "🥤", colours: "🎨",
  yournewcategory: "🆕",  // ← add here
};
```

### Bulk data refresh

If you've changed many words or audio files at once:

```bash
cd backend

# Full pipeline: validate → preprocess audio → clean import → extract features
python -m scripts.pipeline

# Or step by step:
python -m scripts.validate_data --csv data/words.csv --audio-dir reference_audio
python -m scripts.prepare_audio --audio-dir reference_audio --backup
python -m scripts.import_csv --csv data/words.csv --audio-dir reference_audio --clean
python -m scripts.precompute_features
```

| Script | What it does | When to run |
|--------|-------------|-------------|
| `validate_data.py` | Checks CSV integrity, verifies audio files exist, checks audio duration & silence | Before any import |
| `prepare_audio.py` | Converts all audio to mono 22050Hz -20dBFS WAV, trims silence | When adding raw recordings |
| `import_csv.py` | Reads CSV → creates categories + words in SQLite | After CSV changes |
| `precompute_features.py` | Extracts Praat features for every reference WAV → stores in DB | After audio changes |
| `pipeline.py` | Runs all four above in sequence | When in doubt, run this |

### Future extension ideas

| Feature | What to change |
|---------|---------------|
| **More languages** | Add columns to CSV (e.g. `Portuguese`), update `import_csv.py` INSERT, add `pt` to `/words` route lang query |
| **Sentence-level practice** | CSV already supports multi-word entries; the audio pipeline handles them naturally |
| **Difficulty tiers** | Add a `difficulty` column to CSV/DB, filter in the words API route |
| **User accounts / progress** | Add a `users` + `attempts` table to `database.py`, new routes in `routes/` |
| **Different scoring models** | Edit weights in `feature_comparator.py` or swap in a ML model |
| **Mobile app** | The API is framework-agnostic — any mobile client can POST to `/api/pronunciation/check` |

---

## Project Structure

```
speakingbuddy/
│
│  ┌─ FRONTEND (served as static files by FastAPI) ──────────┐
│  │                                                          │
├── index.html              ← Landing page (dynamic grid)    │
├── app.js                  ← Fetches categories, renders    │
├── topic.html              ← Practice page (single page     │
├── topic.js                ←   for all categories)          │
├── topic.css               ← Practice page styles           │
├── style.css               ← Global styles                  │
├── js/                                                       │
│   ├── config.js           ← API URL (auto-detects port)    │
│   └── api.js              ← 4 fetch wrappers for the API   │
│  └──────────────────────────────────────────────────────────┘
│
│  ┌─ BACKEND ───────────────────────────────────────────────┐
└── backend/                                                  │
    ├── requirements.txt    ← Python dependencies             │
    ├── .env                ← Local config (CORS, port)       │
    │                                                          │
    ├── data/               ← DATA LAYER                      │
    │   ├── words.csv       ←   Source of truth (38 words)    │
    │   └── speakingbuddy.db←   Generated SQLite DB           │
    ├── reference_audio/    ←   38 native speaker WAVs        │
    │                                                          │
    ├── app/                ← APPLICATION LAYER                │
    │   ├── main.py         ←   FastAPI entry + static mount  │
    │   ├── config.py       ←   Settings from .env            │
    │   ├── database.py     ←   SQLite schema + connection    │
    │   ├── models.py       ←   Pydantic schemas              │
    │   ├── routes/         ←   API ENDPOINTS                  │
    │   │   ├── categories.py   ← GET /api/categories         │
    │   │   ├── words.py        ← GET /api/categories/{}/words│
    │   │   ├── audio.py        ← GET /api/audio/{word_id}    │
    │   │   └── pronunciation.py← POST /api/pronunciation/check│
    │   └── services/       ←   PRONUNCIATION ENGINE           │
    │       ├── audio_processor.py   ← WebM→WAV, normalize    │
    │       ├── praat_analyzer.py    ← Feature extraction      │
    │       ├── feature_comparator.py← DTW + scoring           │
    │       └── feedback_generator.py← Human-readable tips     │
    │                                                          │
    └── scripts/            ← DATA PIPELINE                    │
        ├── import_csv.py          ← CSV → SQLite             │
        ├── precompute_features.py ← WAV → Praat JSON         │
        ├── prepare_audio.py       ← Standardize audio        │
        ├── validate_data.py       ← Pre-import checks        │
        └── pipeline.py            ← One-command chain        │
    └──────────────────────────────────────────────────────────┘
```

### Key files to read first (in this order)

| # | File | What you'll learn |
|---|------|-------------------|
| 1 | `backend/app/main.py` | How the app boots: CORS, routers, static file mount |
| 2 | `backend/app/routes/pronunciation.py` | The core endpoint: upload → preprocess → analyze → compare → score → respond |
| 3 | `backend/app/services/praat_analyzer.py` | What acoustic features Praat extracts and how |
| 4 | `backend/app/services/feature_comparator.py` | How user vs reference features are scored (DTW, Gaussian similarity, weights) |
| 5 | `topic.js` | Frontend: flashcard navigation, mic recording, evaluate flow |
| 6 | `js/api.js` | 4 fetch wrappers — the entire frontend↔backend contract |
| 7 | `backend/data/words.csv` | The raw data — understand what drives everything |

---

## How It All Connects (MVP Architecture)

### System diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        localhost:8000                             │
│  ┌────────────────────┐     ┌────────────────────────────────┐  │
│  │   Static Files     │     │       FastAPI Backend          │  │
│  │  (index.html,      │     │                                │  │
│  │   topic.html,      │     │  /api/categories ──────┐       │  │
│  │   app.js, etc.)    │     │  /api/.../words ───────┤       │  │
│  │                    │     │  /api/audio/{id} ──────┤       │  │
│  │  Served at /       │     │  /api/pronunciation/ ──┤       │  │
│  └────────────────────┘     │                        ▼       │  │
│                              │  ┌──────────────────────────┐ │  │
│                              │  │     SQLite Database      │ │  │
│                              │  │  categories | words      │ │  │
│                              │  │  (praat_features_json)   │ │  │
│                              │  └──────────────────────────┘ │  │
│                              │            │                   │  │
│                              │  ┌─────────▼────────────────┐ │  │
│                              │  │  Pronunciation Engine    │ │  │
│                              │  │  audio_processor →       │ │  │
│                              │  │  praat_analyzer →        │ │  │
│                              │  │  feature_comparator →    │ │  │
│                              │  │  feedback_generator      │ │  │
│                              │  └──────────────────────────┘ │  │
│                              └────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
         ▲                              ▲
         │  Browser loads HTML/JS       │  API calls (fetch)
         │  from same origin            │  from same origin
         └──────────────────────────────┘
```

### The complete user flow (step by step)

| Step | Component | File | What happens |
|------|-----------|------|-------------|
| 1 | Browser | `index.html` + `app.js` | Page loads → `GET /api/categories` → renders 8 category cards with emoji + word count |
| 2 | Browser | `app.js` | User clicks a card → navigates to `topic.html?category=animals&lang=en` |
| 3 | Browser | `topic.js` | Page loads → `GET /api/categories/animals/words?lang=en` → receives word list with IDs + translations |
| 4 | Browser | `topic.js` | Renders first flashcard: Luxembourgish word, translation, Listen/Record buttons |
| 5 | Browser | `topic.js` | User clicks **Listen** → `GET /api/audio/1` → backend streams `hond1.wav` → `<audio>` plays it |
| 6 | Backend | `routes/audio.py` | `FileResponse` streams the WAV from `reference_audio/` directory |
| 7 | Browser | `topic.js` | User clicks **🎙️** → `navigator.mediaDevices.getUserMedia()` → `MediaRecorder` starts capturing |
| 8 | Browser | `topic.js` | Real-time mic level meter animates via `AudioContext` + `AnalyserNode` |
| 9 | Browser | `topic.js` | User clicks **🎙️** again → recording stops → WebM `Blob` stored in memory |
| 10 | Browser | `topic.js` | User clicks **Evaluate** → `POST /api/pronunciation/check` with `FormData` (word_id + audio blob) |
| 11 | Backend | `routes/pronunciation.py` | Receives upload, validates word exists in DB, loads pre-computed reference features |
| 12 | Backend | `audio_processor.py` | Converts WebM → WAV (mono, 22050Hz), normalizes to -20dBFS, trims silence, isolates first word |
| 13 | Backend | `praat_analyzer.py` | Runs Praat via parselmouth: extracts pitch contour, formants F1-F3, intensity envelope, duration, jitter, shimmer |
| 14 | Backend | `feature_comparator.py` | Compares user features vs reference features using DTW (time alignment) + Gaussian similarity → weighted sub-scores → overall score 0-100 |
| 15 | Backend | `feedback_generator.py` | Analyzes which sub-scores are low → generates specific tips ("Your vowel quality differs — focus on mouth openness") |
| 16 | Backend | `routes/pronunciation.py` | Returns JSON: `{score, feedback, breakdown: {pitch, formants, intensity, duration, voice_quality}, improvements, suggestions}` |
| 17 | Browser | `topic.js` | Renders overall score with color (green ≥70, yellow ≥40, red <40), 5 animated breakdown bars, improvement tips |

### Scoring breakdown

| Feature | Weight | What Praat measures | What it tells the user |
|---------|--------|--------------------|-----------------------|
| Formants | 35% | F1, F2, F3 frequencies (vowel resonances) | "Your mouth shape/tongue position differs from native" |
| Pitch | 20% | Fundamental frequency (F0) contour over time | "Your intonation pattern doesn't match" |
| Intensity | 15% | Energy envelope over time | "Your volume/stress pattern is off" |
| Duration | 15% | Total speaking time vs reference | "You spoke too fast/slow" |
| Voice Quality | 15% | Jitter (pitch instability) + shimmer (amplitude instability) | "Your voice was shaky/unstable" |

The comparison uses:
- **DTW (Dynamic Time Warping)** for pitch, formants, and intensity — aligns time-series of different lengths before comparing
- **Gaussian similarity** for scalar values (duration, jitter, shimmer) — smooth falloff rather than hard thresholds

### API contract

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | `/api/categories` | — | `[{id, name, display_name, image_url, word_count}]` |
| GET | `/api/categories/{name}/words?lang=en` | `lang` = `en`/`fr`/`de` | `[{id, word_lb, translation, gender, audio_url}]` |
| GET | `/api/audio/{word_id}` | — | Binary WAV stream |
| POST | `/api/pronunciation/check` | `FormData: word_id (int) + audio (file)` | `{score, feedback, breakdown: {pitch, formants, intensity, duration, voice_quality}, improvements[], suggestions[]}` |
| GET | `/api/health` | — | `{"status": "ok"}` |

### Tech stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Vanilla HTML/CSS/JS | No build step, instant reload, minimal complexity |
| Backend | Python 3.10 + FastAPI + uvicorn | Async, fast, auto-docs at `/docs`, great for prototyping |
| Database | SQLite via aiosqlite | Zero config, single file, good enough for MVP |
| Audio analysis | Praat (parselmouth) + pydub + librosa + scipy | Gold standard in phonetics research, proven algorithms |
| Audio pipeline | ffmpeg (via pydub) | Universal format conversion, handles WebM from browsers |

---

## Project Outline Mapping

This section shows how each part of the codebase maps back to the original project plan.

### Phase A — Backend Scaffolding
> *"Set up project structure, database, configuration"*

| Deliverable | File(s) | Status |
|------------|---------|--------|
| FastAPI project structure | `backend/app/main.py`, `config.py` | ✅ Done |
| SQLite schema (categories + words) | `backend/app/database.py` | ✅ Done |
| Environment config (.env) | `backend/.env`, `config.py` | ✅ Done |
| CSV import script | `backend/scripts/import_csv.py` | ✅ Done |
| 38 words × 8 categories loaded | `backend/data/words.csv` → DB | ✅ Done |

### Phase B — Core API Endpoints
> *"CRUD endpoints for categories, words, audio streaming"*

| Deliverable | File(s) | Status |
|------------|---------|--------|
| `GET /api/categories` with word count | `routes/categories.py` | ✅ Done |
| `GET /api/categories/{name}/words` with lang filter | `routes/words.py` | ✅ Done |
| `GET /api/audio/{word_id}` WAV streaming | `routes/audio.py` | ✅ Done |
| Pydantic request/response models | `models.py` | ✅ Done |

### Phase C — Praat Pronunciation Engine
> *"Port the Praat analysis pipeline from prototype, wire to API"*

| Deliverable | File(s) | Status |
|------------|---------|--------|
| Audio preprocessing (WebM→WAV, normalize, trim) | `services/audio_processor.py` | ✅ Done |
| Praat feature extraction (pitch, formants, intensity, duration, voice quality) | `services/praat_analyzer.py` | ✅ Done |
| DTW + Gaussian weighted comparison | `services/feature_comparator.py` | ✅ Done |
| Human-readable feedback generation | `services/feedback_generator.py` | ✅ Done |
| `POST /api/pronunciation/check` endpoint | `routes/pronunciation.py` | ✅ Done |
| Pre-computed reference features in DB | `scripts/precompute_features.py` | ✅ Done |
| Tested: 99.7 self-score, 51.3 cross-word score | — | ✅ Verified |

### Phase D — Frontend Refactor
> *"Replace 8 static topic folders with single dynamic page driven by API"*

| Deliverable | File(s) | Status |
|------------|---------|--------|
| Dynamic landing page (categories from API) | `index.html`, `app.js` | ✅ Done |
| Single topic page for all categories | `topic.html`, `topic.js`, `topic.css` | ✅ Done |
| Shared API client | `js/config.js`, `js/api.js` | ✅ Done |
| Old 8 topic folders deleted | `animals/`, `colors/`, etc. | ✅ Removed |

### Phase E — Data Pipeline
> *"Automated audio preparation, validation, and import"*

| Deliverable | File(s) | Status |
|------------|---------|--------|
| Audio standardization (22050Hz, mono, -20dBFS) | `scripts/prepare_audio.py` | ✅ Done |
| Pre-import data validation | `scripts/validate_data.py` | ✅ Done |
| One-command pipeline | `scripts/pipeline.py` | ✅ Done |

### Phase F — Deployment
> *"Host for demo / production"*

| Deliverable | Status |
|------------|--------|
| FastAPI serves frontend directly (no separate web server) | ✅ Done |
| Cloud deployment | ⏸️ Deferred — local demo for MVP |

---

## MVP Presentation Talking Points

### 1. The Problem
Learning Luxembourgish pronunciation is hard. Existing tools only mark answers "right" or "wrong" — they can't tell you *what's wrong* with how you said it.

### 2. Our Solution
SpeakingBuddy gives instant, detailed pronunciation feedback. Not just pass/fail — it scores you across 5 acoustic dimensions and tells you specifically what to improve.

### 3. Live Demo Flow (≈ 60 seconds)

1. **Open the app** → landing page shows 8 word categories
2. **Pick "Animals"** → flashcard shows "Hond" (dog) with English translation
3. **Click Listen** → hear the native Luxembourgish pronunciation
4. **Click the microphone** → record yourself saying "Hond" → click again to stop
5. **Click Evaluate** → within 2 seconds:
   - Overall score: **78/100**
   - Breakdown bars: Pitch 85, Formants 62, Intensity 81, Duration 90, Voice Quality 94
   - Tip: *"Your vowel quality differs — try opening your mouth wider"*
6. **Click Next** → practice the next word

### 4. How It Works Under the Hood

> "We're not just comparing waveforms. We use **Praat** — the same acoustic analysis tool used in university phonetics research — to extract 5 measurable features from your voice and compare them to a native speaker recording."

- **Formants** = vowel quality (is your mouth the right shape?)
- **Pitch** = intonation (does your melody match?)
- **Duration** = timing (too fast? too slow?)
- **Voice quality** = stability (is your voice steady?)
- We use **DTW (Dynamic Time Warping)** to handle natural speed differences

### 5. Technical Simplicity

- **No cloud services** needed — runs locally with one command
- **No ML training data** needed — scoring is based on acoustic physics
- **38 words ready** across 8 categories, trivially extensible via CSV
- **Any browser** with a microphone works (Chrome, Firefox, Edge)
- **One file to add words** — edit the CSV, drop a WAV, run the pipeline

### 6. What's Next (Roadmap)

| Priority | Feature | Effort |
|----------|---------|--------|
| High | More words & categories | Low (CSV + audio) |
| High | Progress tracking (per user) | Medium (new DB tables + routes) |
| Medium | Difficulty levels (word → phrase → sentence) | Low (CSV filtering) |
| Medium | Mobile-optimized UI | Medium (CSS responsive) |
| Low | Cloud deployment (Azure/Railway) | Medium (Dockerfile + config) |
| Low | ML-based scoring model | High (training data collection) |

---

## Commit History

```
deb09b3 docs: add README with setup guide, architecture, and MVP outline
6dcd274 fix: serve frontend from FastAPI, fix evaluate button reload
0f19474 chore: remove old static topic folders
eba41f4 refactor: dynamic frontend with API-driven categories and topics
a8657f3 feat: port Praat pronunciation engine from prototype
2209d64 feat: add data pipeline and import scripts
7a12e07 feat: add backend scaffolding with FastAPI and SQLite
```
