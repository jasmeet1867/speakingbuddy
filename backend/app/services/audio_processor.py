"""Audio preprocessing: normalization, silence trimming, format conversion.

Ported from prototype audio_processor.py — adapted for backend use.
Removes Streamlit dependencies; pure function API.
"""

import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from pydub import AudioSegment
from pydub.silence import detect_nonsilent

# ── Constants (inlined from prototype config) ──────────────────
SAMPLE_RATE = 22050
SILENCE_THRESH_DB = -40   # dBFS
MIN_SILENCE_LEN_MS = 200  # ms
TARGET_DBFS = -20.0       # RMS normalisation target


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


def normalize_audio(audio: AudioSegment, target_dbfs: float = TARGET_DBFS) -> AudioSegment:
    """RMS-normalise an AudioSegment to *target_dbfs*."""
    change_in_dbfs = target_dbfs - audio.dBFS
    return audio.apply_gain(change_in_dbfs)


def trim_silence(audio: AudioSegment,
                 silence_thresh: int = SILENCE_THRESH_DB,
                 min_silence_len: int = MIN_SILENCE_LEN_MS) -> AudioSegment:
    """Remove leading / trailing silence from an AudioSegment."""
    nonsilent_ranges = detect_nonsilent(
        audio,
        min_silence_len=min_silence_len,
        silence_thresh=silence_thresh,
    )
    if not nonsilent_ranges:
        return audio  # entirely silent — return as-is
    start = nonsilent_ranges[0][0]
    end = nonsilent_ranges[-1][1]
    return audio[start:end]


def split_first_word(audio: AudioSegment,
                     silence_thresh: int = SILENCE_THRESH_DB,
                     min_silence_len: int = MIN_SILENCE_LEN_MS) -> AudioSegment:
    """If the user recorded multiple words, keep only the first one.

    Falls back to returning the full audio if no internal silence gap is
    detected.
    """
    nonsilent_ranges = detect_nonsilent(
        audio,
        min_silence_len=min_silence_len,
        silence_thresh=silence_thresh,
    )
    if not nonsilent_ranges:
        return audio
    # keep only the first non-silent segment
    start, end = nonsilent_ranges[0]
    return audio[start:end]


def preprocess_upload(raw_bytes: bytes, original_filename: str = "upload.webm") -> Path:
    """End-to-end preprocessing of a user upload.

    1. Write raw bytes to a temp file
    2. Convert to mono WAV at SAMPLE_RATE
    3. Normalize loudness
    4. Trim leading/trailing silence
    5. Keep only the first word segment
    6. Export final WAV and return its Path

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

    # Load as AudioSegment for processing
    audio = AudioSegment.from_wav(str(wav_path))
    audio = normalize_audio(audio)
    audio = trim_silence(audio)
    audio = split_first_word(audio)

    # Overwrite the wav_path with the processed version
    audio.export(str(wav_path), format="wav")
    return wav_path


def load_audio_array(path: str | Path) -> tuple[np.ndarray, int]:
    """Load a WAV file as a float32 numpy array + sample rate.

    Useful for feeding into Praat / parselmouth.
    """
    data, sr = sf.read(str(path), dtype="float32")
    return data, sr
