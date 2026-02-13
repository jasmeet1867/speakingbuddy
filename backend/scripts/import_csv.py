"""Import coworker's CSV into the SQLite database.

Usage:
    cd backend
    python -m scripts.import_csv --csv data/words.csv --audio-dir reference_audio

Expected CSV columns:
    LOD Word reference, Audio Reference, Word Category,
    Luxembourgish, English, French, German
"""

import argparse
import csv
import sqlite3
from pathlib import Path

# Resolve paths relative to backend/
BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB = BACKEND_DIR / "data" / "speakingbuddy.db"
DEFAULT_AUDIO = BACKEND_DIR / "reference_audio"

# ── Schema (mirrors app/database.py) ───────────────────────
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS categories (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL UNIQUE,
    display_name    TEXT    NOT NULL,
    image_url       TEXT
);

CREATE TABLE IF NOT EXISTS words (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    lod_reference       TEXT,
    audio_filename      TEXT,
    category_id         INTEGER NOT NULL REFERENCES categories(id),
    word_lb             TEXT    NOT NULL,
    translation_en      TEXT,
    translation_fr      TEXT,
    translation_de      TEXT,
    gender              TEXT,
    praat_features_json TEXT,
    created_at          TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_words_category ON words(category_id);
"""


def slugify(name: str) -> str:
    """Turn a category display name into a URL-safe slug."""
    return name.strip().lower().replace(" ", "-").replace("&", "and")


def import_csv(csv_path: Path, db_path: Path, audio_dir: Path, *, clean: bool = False) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript(SCHEMA_SQL)

    if clean:
        conn.execute("DELETE FROM words")
        conn.execute("DELETE FROM categories")
        conn.execute("DELETE FROM sqlite_sequence WHERE name IN ('words', 'categories')")
        conn.commit()
        print("  Cleared existing data (IDs reset)")

    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        # Normalise header names (strip whitespace)
        reader.fieldnames = [h.strip() for h in reader.fieldnames]

        category_cache: dict[str, int] = {}
        inserted = 0
        missing_audio = []

        for row in reader:
            cat_display = row.get("Word Category", "").strip()
            if not cat_display:
                continue

            # Upsert category
            cat_slug = slugify(cat_display)
            if cat_slug not in category_cache:
                conn.execute(
                    "INSERT OR IGNORE INTO categories (name, display_name) VALUES (?, ?)",
                    (cat_slug, cat_display),
                )
                cur = conn.execute(
                    "SELECT id FROM categories WHERE name = ?", (cat_slug,)
                )
                category_cache[cat_slug] = cur.fetchone()[0]

            cat_id = category_cache[cat_slug]
            audio_raw = row.get("Audio Reference", "").strip()
            # CSV stores bare names like "hond1"; append .wav if no extension
            if audio_raw and "." not in audio_raw:
                audio_file = audio_raw + ".wav"
            else:
                audio_file = audio_raw
            word_lb = row.get("Luxembourgish", "").strip()

            if not word_lb:
                continue

            # Validate audio file exists
            if audio_file and not (audio_dir / audio_file).is_file():
                missing_audio.append(audio_file)

            conn.execute(
                """
                INSERT INTO words
                    (lod_reference, audio_filename, category_id, word_lb,
                     translation_en, translation_fr, translation_de)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row.get("LOD Word reference", "").strip(),
                    audio_file or None,
                    cat_id,
                    word_lb,
                    row.get("English", "").strip() or None,
                    row.get("French", "").strip() or None,
                    row.get("German", "").strip() or None,
                ),
            )
            inserted += 1

    conn.commit()

    # Report
    cats = conn.execute("SELECT COUNT(*) FROM categories").fetchone()[0]
    words = conn.execute("SELECT COUNT(*) FROM words").fetchone()[0]
    conn.close()

    print(f"[OK] Imported {inserted} words into {cats} categories ({words} total in DB)")
    if missing_audio:
        print(f"[WARN] {len(missing_audio)} audio files referenced but not found in {audio_dir}:")
        for f in missing_audio[:10]:
            print(f"    - {f}")
        if len(missing_audio) > 10:
            print(f"    ... and {len(missing_audio) - 10} more")


def main():
    parser = argparse.ArgumentParser(description="Import word CSV into SpeakingBuddy DB")
    parser.add_argument("--csv", type=Path, required=True, help="Path to CSV file")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB, help="SQLite DB path")
    parser.add_argument("--audio-dir", type=Path, default=DEFAULT_AUDIO, help="Reference audio directory")
    parser.add_argument("--clean", action="store_true", help="Clear existing data before import")
    args = parser.parse_args()

    if not args.csv.is_file():
        print(f"[FAIL] CSV file not found: {args.csv}")
        return

    import_csv(args.csv, args.db, args.audio_dir, clean=args.clean)


if __name__ == "__main__":
    main()
