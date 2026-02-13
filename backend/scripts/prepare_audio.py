"""Preprocess reference audio files for consistent comparison.

Standardises all reference audio to:
  - Mono channel
  - 22050 Hz sample rate (matches user upload preprocessing)
  - -20 dBFS RMS normalisation
  - Leading/trailing silence trimmed

Usage:
    cd backend
    python -m scripts.prepare_audio [--audio-dir reference_audio] [--backup]

With --backup, originals are copied to reference_audio_raw/ first.
"""

import argparse
import shutil
from pathlib import Path

from pydub import AudioSegment
from pydub.silence import detect_nonsilent

# Match constants from app/services/audio_processor.py
SAMPLE_RATE = 22050
TARGET_DBFS = -20.0
SILENCE_THRESH_DB = -40
MIN_SILENCE_LEN_MS = 200

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_AUDIO = BACKEND_DIR / "reference_audio"
BACKUP_DIR = BACKEND_DIR / "reference_audio_raw"


def preprocess_file(path: Path, *, dry_run: bool = False) -> dict:
    """Preprocess a single WAV file in-place.

    Returns a dict with before/after stats.
    """
    audio = AudioSegment.from_file(str(path))
    stats = {
        "file": path.name,
        "before_channels": audio.channels,
        "before_rate": audio.frame_rate,
        "before_duration": round(audio.duration_seconds, 3),
        "before_dbfs": round(audio.dBFS, 1),
        "changes": [],
    }

    # 1. Mono
    if audio.channels != 1:
        audio = audio.set_channels(1)
        stats["changes"].append("stereo→mono")

    # 2. Resample
    if audio.frame_rate != SAMPLE_RATE:
        stats["changes"].append(f"{audio.frame_rate}→{SAMPLE_RATE}Hz")
        audio = audio.set_frame_rate(SAMPLE_RATE)

    # 3. Normalize loudness
    dbfs_diff = abs(audio.dBFS - TARGET_DBFS)
    if dbfs_diff > 0.5:  # only adjust if >0.5 dB off
        gain = TARGET_DBFS - audio.dBFS
        audio = audio.apply_gain(gain)
        stats["changes"].append(f"gain {gain:+.1f}dB")

    # 4. Trim silence
    nonsilent = detect_nonsilent(
        audio,
        min_silence_len=MIN_SILENCE_LEN_MS,
        silence_thresh=SILENCE_THRESH_DB,
    )
    if nonsilent:
        start = max(0, nonsilent[0][0] - 50)  # keep 50ms padding
        end = min(len(audio), nonsilent[-1][1] + 50)
        trimmed = audio[start:end]
        removed_ms = len(audio) - len(trimmed)
        if removed_ms > 20:
            audio = trimmed
            stats["changes"].append(f"trimmed {removed_ms}ms silence")

    stats["after_rate"] = audio.frame_rate
    stats["after_duration"] = round(audio.duration_seconds, 3)
    stats["after_dbfs"] = round(audio.dBFS, 1)

    if not dry_run and stats["changes"]:
        audio.export(str(path), format="wav")

    return stats


def main():
    parser = argparse.ArgumentParser(description="Preprocess reference audio files")
    parser.add_argument(
        "--audio-dir", type=Path, default=DEFAULT_AUDIO,
        help="Directory containing reference WAV files",
    )
    parser.add_argument(
        "--backup", action="store_true",
        help="Copy originals to reference_audio_raw/ before processing",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Show what would change without modifying files",
    )
    args = parser.parse_args()

    audio_dir = args.audio_dir
    files = sorted(audio_dir.glob("*.wav"))
    if not files:
        print(f"[FAIL] No .wav files found in {audio_dir}")
        return

    # Backup
    if args.backup and not args.dry_run:
        BACKUP_DIR.mkdir(exist_ok=True)
        for f in files:
            dest = BACKUP_DIR / f.name
            if not dest.exists():
                shutil.copy2(f, dest)
        print(f"[OK] Backed up {len(files)} files to {BACKUP_DIR.name}/")

    # Process
    changed = 0
    print(f"\n{'File':<25} {'Changes'}")
    print("-" * 70)

    for f in files:
        stats = preprocess_file(f, dry_run=args.dry_run)
        if stats["changes"]:
            changes_str = ", ".join(stats["changes"])
            tag = "[DRY RUN] " if args.dry_run else ""
            print(f"  {tag}{stats['file']:<23} {changes_str}")
            changed += 1

    verb = "Would change" if args.dry_run else "Processed"
    print(f"\n[OK] {verb} {changed}/{len(files)} files "
          f"(target: mono, {SAMPLE_RATE}Hz, {TARGET_DBFS}dBFS)")


if __name__ == "__main__":
    main()
