"""Pre-compute Praat features for all reference audio and store in DB.

Usage:
    cd backend
    python -m scripts.precompute_features
"""

import json
import sqlite3
import sys
import time
from pathlib import Path

# Allow imports from the backend package
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.services.praat_analyzer import extract_all_praat_features

DB_PATH = BACKEND_DIR / "data" / "speakingbuddy.db"
AUDIO_DIR = BACKEND_DIR / "reference_audio"


def precompute():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    rows = conn.execute(
        "SELECT id, word_lb, audio_filename FROM words WHERE audio_filename IS NOT NULL"
    ).fetchall()

    updated = 0
    skipped = 0
    errors = 0
    t0 = time.time()

    for row in rows:
        audio_path = AUDIO_DIR / row["audio_filename"]
        if not audio_path.is_file():
            print(f"  SKIP  id={row['id']} {row['word_lb']!r} — file not found: {audio_path.name}")
            skipped += 1
            continue

        try:
            features = extract_all_praat_features(str(audio_path))
        except Exception as exc:
            print(f"  ERROR id={row['id']} {row['word_lb']!r} — {exc}")
            errors += 1
            continue

        conn.execute(
            "UPDATE words SET praat_features_json = ? WHERE id = ?",
            (json.dumps(features), row["id"]),
        )
        updated += 1
        print(f"  OK    id={row['id']} {row['word_lb']!r}")

    conn.commit()
    conn.close()
    elapsed = time.time() - t0
    print(f"\n[OK] Pre-computed features for {updated} words in {elapsed:.1f}s")
    if skipped:
        print(f"  {skipped} skipped (missing audio)")
    if errors:
        print(f"  {errors} errors")


if __name__ == "__main__":
    precompute()
