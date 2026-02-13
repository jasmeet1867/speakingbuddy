"""One-command data pipeline: validate → preprocess → import → extract features.

Chains all data-prep steps in the correct order. Useful when adding new
words or refreshing the dataset.

Usage:
    cd backend
    python -m scripts.pipeline                   # full pipeline
    python -m scripts.pipeline --skip-import      # re-process audio only
    python -m scripts.pipeline --dry-run          # preview changes
"""

import argparse
import subprocess
import sys
import time
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
PYTHON = sys.executable  # use the same Python that's running this script


def run_step(name: str, cmd: list[str], *, allow_fail: bool = False) -> bool:
    """Run a subprocess step and return True on success."""
    print(f"\n{'=' * 60}")
    print(f"  STEP: {name}")
    print(f"{'=' * 60}\n")

    result = subprocess.run(cmd, cwd=str(BACKEND_DIR))

    if result.returncode != 0:
        if allow_fail:
            print(f"\n[WARN] {name} had warnings (continuing)")
            return True
        else:
            print(f"\n[FAIL] {name} failed (exit code {result.returncode})")
            return False
    return True


def main():
    parser = argparse.ArgumentParser(description="SpeakingBuddy data pipeline")
    parser.add_argument("--csv", type=Path, default=BACKEND_DIR / "data" / "words.csv")
    parser.add_argument("--audio-dir", type=Path, default=BACKEND_DIR / "reference_audio")
    parser.add_argument("--db", type=Path, default=BACKEND_DIR / "data" / "speakingbuddy.db")
    parser.add_argument("--skip-import", action="store_true", help="Skip CSV import (audio-only refresh)")
    parser.add_argument("--skip-prep", action="store_true", help="Skip audio preprocessing")
    parser.add_argument("--no-backup", action="store_true", help="Don't backup originals before preprocessing")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, don't modify anything")
    args = parser.parse_args()

    t0 = time.time()
    steps_run = 0
    steps_ok = 0

    # ── Step 1: Validate ────────────────────────────────────
    steps_run += 1
    ok = run_step("Validate data", [
        PYTHON, "-m", "scripts.validate_data",
        "--csv", str(args.csv),
        "--audio-dir", str(args.audio_dir),
    ])
    if ok:
        steps_ok += 1
    else:
        print("\n[FAIL] Validation failed. Fix errors before continuing.")
        sys.exit(1)

    # ── Step 2: Preprocess audio ────────────────────────────
    if not args.skip_prep:
        steps_run += 1
        prep_cmd = [
            PYTHON, "-m", "scripts.prepare_audio",
            "--audio-dir", str(args.audio_dir),
        ]
        if not args.no_backup:
            prep_cmd.append("--backup")
        if args.dry_run:
            prep_cmd.append("--dry-run")

        ok = run_step("Preprocess reference audio", prep_cmd)
        if ok:
            steps_ok += 1
        else:
            print("\n[FAIL] Audio preprocessing failed.")
            sys.exit(1)

    # ── Step 3: Import CSV ──────────────────────────────────
    if not args.skip_import and not args.dry_run:
        steps_run += 1
        # Drop existing data for clean re-import
        ok = run_step("Import CSV into database", [
            PYTHON, "-m", "scripts.import_csv",
            "--csv", str(args.csv),
            "--db", str(args.db),
            "--audio-dir", str(args.audio_dir),
            "--clean",
        ])
        if ok:
            steps_ok += 1
        else:
            print("\n[FAIL] CSV import failed.")
            sys.exit(1)

    # ── Step 4: Precompute Praat features ───────────────────
    if not args.dry_run:
        steps_run += 1
        ok = run_step("Pre-compute Praat features", [
            PYTHON, "-m", "scripts.precompute_features",
        ])
        if ok:
            steps_ok += 1
        else:
            print("\n[FAIL] Feature extraction failed.")
            sys.exit(1)

    # ── Summary ─────────────────────────────────────────────
    elapsed = time.time() - t0
    print(f"\n{'=' * 60}")
    if args.dry_run:
        print(f"  DRY RUN complete — no files were modified")
    else:
        print(f"  Pipeline complete: {steps_ok}/{steps_run} steps OK in {elapsed:.1f}s")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
