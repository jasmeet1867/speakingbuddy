"""Validate audio files and CSV data before import.

Checks:
  - All CSV-referenced audio files exist
  - Audio files are valid WAV/audio (loadable by pydub)
  - Duration is within acceptable range (0.1s – 5.0s for single words)
  - Audio is not silent (dBFS > -50)
  - No orphan audio files (WAV files not referenced by CSV)

Usage:
    cd backend
    python -m scripts.validate_data [--csv data/words.csv] [--audio-dir reference_audio]
"""

import argparse
import csv
import sys
from pathlib import Path

from pydub import AudioSegment

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_CSV = BACKEND_DIR / "data" / "words.csv"
DEFAULT_AUDIO = BACKEND_DIR / "reference_audio"

MIN_DURATION = 0.1   # seconds
MAX_DURATION = 5.0   # seconds
MIN_DBFS = -50       # anything below is essentially silence


def validate(csv_path: Path, audio_dir: Path) -> bool:
    """Run all validations. Returns True if everything passes."""
    errors: list[str] = []
    warnings: list[str] = []

    # ── 1. Load CSV ─────────────────────────────────────────
    if not csv_path.is_file():
        print(f"[FAIL] CSV file not found: {csv_path}")
        return False

    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        reader.fieldnames = [h.strip() for h in reader.fieldnames]
        rows = list(reader)

    if not rows:
        errors.append("CSV is empty")

    # ── 2. Check required columns ───────────────────────────
    required = {"Audio Reference", "Word Category", "Luxembourgish"}
    if reader.fieldnames:
        missing_cols = required - set(reader.fieldnames)
        if missing_cols:
            errors.append(f"CSV missing columns: {missing_cols}")

    # ── 3. Check each row ───────────────────────────────────
    referenced_files: set[str] = set()
    categories: set[str] = set()

    for i, row in enumerate(rows, start=2):  # row 2 = first data row
        word = row.get("Luxembourgish", "").strip()
        audio_ref = row.get("Audio Reference", "").strip()
        category = row.get("Word Category", "").strip()

        if not word:
            errors.append(f"Row {i}: empty Luxembourgish word")
            continue

        if not category:
            errors.append(f"Row {i} ({word}): empty category")

        categories.add(category)

        # Audio file check
        if not audio_ref:
            warnings.append(f"Row {i} ({word}): no audio reference")
            continue

        filename = audio_ref + ".wav" if "." not in audio_ref else audio_ref
        referenced_files.add(filename)
        audio_path = audio_dir / filename

        if not audio_path.is_file():
            errors.append(f"Row {i} ({word}): audio file missing: {filename}")
            continue

        # Validate audio properties
        try:
            audio = AudioSegment.from_file(str(audio_path))
        except Exception as exc:
            errors.append(f"Row {i} ({word}): cannot load {filename}: {exc}")
            continue

        dur = audio.duration_seconds
        if dur < MIN_DURATION:
            errors.append(f"Row {i} ({word}): {filename} too short ({dur:.2f}s < {MIN_DURATION}s)")
        elif dur > MAX_DURATION:
            warnings.append(f"Row {i} ({word}): {filename} unusually long ({dur:.2f}s)")

        if audio.dBFS < MIN_DBFS:
            errors.append(f"Row {i} ({word}): {filename} is near-silent (dBFS={audio.dBFS:.1f})")

    # ── 4. Check for orphan audio files ─────────────────────
    if audio_dir.is_dir():
        actual_files = {f.name for f in audio_dir.glob("*.wav")}
        orphans = actual_files - referenced_files
        if orphans:
            warnings.append(
                f"{len(orphans)} audio file(s) not referenced in CSV: "
                + ", ".join(sorted(orphans)[:5])
                + ("..." if len(orphans) > 5 else "")
            )

    # ── 5. Report ───────────────────────────────────────────
    print(f"\nValidation summary for {csv_path.name}")
    print(f"  {len(rows)} words across {len(categories)} categories")
    print(f"  {len(referenced_files)} audio files referenced\n")

    if warnings:
        print(f"[WARN] {len(warnings)} warning(s):")
        for w in warnings:
            print(f"  - {w}")
        print()

    if errors:
        print(f"[FAIL] {len(errors)} error(s):")
        for e in errors:
            print(f"  - {e}")
        return False

    print("[OK] All checks passed!")
    return True


def main():
    parser = argparse.ArgumentParser(description="Validate SpeakingBuddy data files")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV, help="Path to words CSV")
    parser.add_argument("--audio-dir", type=Path, default=DEFAULT_AUDIO, help="Reference audio dir")
    args = parser.parse_args()

    ok = validate(args.csv, args.audio_dir)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
