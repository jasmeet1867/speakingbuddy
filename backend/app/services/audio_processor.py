"""Audio conversion helpers for pronunciation analysis.

Baseline behavior is conversion-only (decode and convert to WAV).
"""

import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from pydub import AudioSegment

# ── Constants ───────────────────────────────────────────────────
SAMPLE_RATE = 22050


def convert_to_wav(input_path: str | Path, output_path: str | Path | None = None) -> Path:
    """Convert any audio format to WAV (mono, SAMPLE_RATE).

    If *output_path* is None a temp file is created.
    Returns the Path of the resulting WAV.
    """
    input_path = Path(input_path)
    audio = AudioSegment.from_file(str(input_path))
    audio = audio.set_channels(1).set_frame_rate(SAMPLE_RATE)

    if output_path is None:
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        output_path = Path(tmp.name)
        tmp.close()
    else:
        output_path = Path(output_path)

    audio.export(str(output_path), format="wav")
    return output_path


def preprocess_upload(
    raw_bytes: bytes,
    original_filename: str = "upload.webm",
) -> Path:
    """Convert uploaded audio bytes to a temporary mono WAV file.

    1. Write raw bytes to a temp file
    2. Convert to mono WAV at SAMPLE_RATE

    The caller is responsible for deleting the returned temp file.
    """
    suffix = Path(original_filename).suffix or ".webm"
    tmp_raw = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    tmp_raw.write(raw_bytes)
    tmp_raw.close()

    try:
        # Convert to WAV
        wav_path = convert_to_wav(tmp_raw.name)
    finally:
        Path(tmp_raw.name).unlink(missing_ok=True)

    # Baseline-C behavior: no additional preprocessing beyond conversion.
    return wav_path


def load_audio_array(path: str | Path) -> tuple[np.ndarray, int]:
    """Load a WAV file as a float32 numpy array + sample rate.

    Useful for feeding into Praat / parselmouth.
    """
    data, sr = sf.read(str(path), dtype="float32")
    return data, sr
