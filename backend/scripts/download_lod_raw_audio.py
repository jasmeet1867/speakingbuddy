"""Download raw reference audio from LOD.lu and store as WAV without trimming.

This script is for sanity testing preprocessing effects.
Unlike the old collection flow, it does NOT split on silence or normalize.
It only converts the source LOD audio stream to WAV.

Usage:
    cd backend
    python -m scripts.download_lod_raw_audio \
        --csv data/words.csv \
        --out-dir reference_audio_lod_raw
"""

import argparse
import csv
import io
from pathlib import Path

import requests
from pydub import AudioSegment

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_CSV = BACKEND_DIR / "data" / "words.csv"
DEFAULT_OUT = BACKEND_DIR / "reference_audio_lod_raw"

LOD_ENTRY_API = "https://lod.lu/api/lb/entry/{lod_id}"


def _safe_audio_url(entry_json: dict) -> str | None:
    audio_files = entry_json.get("entry", {}).get("audioFiles", {})
    return audio_files.get("aac") or audio_files.get("mp4") or audio_files.get("m4a")


def main() -> None:
    parser = argparse.ArgumentParser(description="Download raw LOD audio as WAV (no preprocessing)")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV, help="CSV with LOD Word reference + Audio Reference columns")
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT, help="Output directory for WAV files")
    parser.add_argument("--timeout", type=float, default=20.0, help="HTTP timeout in seconds")
    args = parser.parse_args()

    csv_path = args.csv
    out_dir = args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    if not csv_path.is_file():
        raise SystemExit(f"[FAIL] CSV not found: {csv_path}")

    rows = []
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            lod_id = (row.get("LOD Word reference") or "").strip()
            audio_ref = (row.get("Audio Reference") or "").strip()
            if lod_id and audio_ref:
                rows.append((lod_id, audio_ref))

    if not rows:
        raise SystemExit("[FAIL] No valid rows found in CSV")

    downloaded = 0
    skipped = 0
    failed = 0

    for lod_id, audio_ref in rows:
        out_file = out_dir / f"{audio_ref}.wav"

        try:
            entry_res = requests.get(LOD_ENTRY_API.format(lod_id=lod_id), timeout=args.timeout)
            entry_res.raise_for_status()
            entry = entry_res.json()
            audio_url = _safe_audio_url(entry)
            if not audio_url:
                print(f"  SKIP  {lod_id} ({audio_ref}) - no audio URL in entry")
                skipped += 1
                continue

            audio_res = requests.get(audio_url, timeout=args.timeout)
            audio_res.raise_for_status()

            # Convert stream bytes to WAV only (no trimming/normalization/splitting).
            data = io.BytesIO(audio_res.content)
            seg = AudioSegment.from_file(data)
            seg.export(str(out_file), format="wav")

            downloaded += 1
            print(f"  OK    {lod_id} -> {out_file.name}")
        except Exception as exc:
            failed += 1
            print(f"  ERROR {lod_id} ({audio_ref}) - {exc}")

    print(f"\n[OK] Download complete: {downloaded} saved, {skipped} skipped, {failed} failed")


if __name__ == "__main__":
    main()
