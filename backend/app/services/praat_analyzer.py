"""Praat-based acoustic feature extraction using parselmouth.

Ported from prototype praat_analyzer.py — adapted for backend use.
Removes Streamlit dependencies; pure function API.
"""

from pathlib import Path
from typing import Any

import numpy as np
import parselmouth
from parselmouth.praat import call


# ── Public API ──────────────────────────────────────────────

def extract_all_praat_features(audio_path: str | Path) -> dict[str, Any]:
    """Extract a complete feature dict from a WAV file.

    Returns a JSON-serialisable dict with keys:
        pitch, formants, intensity, duration, voice_quality
    """
    snd = parselmouth.Sound(str(audio_path))
    return {
        "pitch": _extract_pitch(snd),
        "formants": _extract_formants(snd),
        "intensity": _extract_intensity(snd),
        "duration": _extract_duration(snd),
        "voice_quality": _extract_voice_quality(snd),
    }


# ── Internal helpers ────────────────────────────────────────

def _extract_pitch(snd: parselmouth.Sound) -> dict:
    """Extract pitch (F0) statistics."""
    pitch_obj = call(snd, "To Pitch", 0.0, 75, 600)
    pitch_values = pitch_obj.selected_array["frequency"]
    voiced = pitch_values[pitch_values > 0]

    if len(voiced) == 0:
        return {
            "mean": 0.0,
            "std": 0.0,
            "min": 0.0,
            "max": 0.0,
            "values": [],
        }
    return {
        "mean": float(np.mean(voiced)),
        "std": float(np.std(voiced)),
        "min": float(np.min(voiced)),
        "max": float(np.max(voiced)),
        "values": voiced.tolist(),
    }


def _extract_formants(snd: parselmouth.Sound) -> dict:
    """Extract F1–F3 mean values across the signal."""
    formant_obj = call(snd, "To Formant (burg)", 0.0, 5, 5500, 0.025, 50)
    duration = snd.duration
    n_frames = call(formant_obj, "Get number of frames")

    formants: dict[str, list[float]] = {"f1": [], "f2": [], "f3": []}

    for i in range(1, n_frames + 1):
        t = call(formant_obj, "Get time from frame number", i)
        if t < 0 or t > duration:
            continue
        for fi, key in enumerate(("f1", "f2", "f3"), start=1):
            val = call(formant_obj, "Get value at time", fi, t, "Hertz", "Linear")
            if not np.isnan(val):
                formants[key].append(float(val))

    result: dict[str, Any] = {}
    for key in ("f1", "f2", "f3"):
        vals = formants[key]
        if vals:
            result[f"{key}_mean"] = float(np.mean(vals))
            result[f"{key}_std"] = float(np.std(vals))
            result[f"{key}_values"] = vals
        else:
            result[f"{key}_mean"] = 0.0
            result[f"{key}_std"] = 0.0
            result[f"{key}_values"] = []
    return result


def _extract_intensity(snd: parselmouth.Sound) -> dict:
    """Extract intensity (dB) statistics."""
    intensity_obj = call(snd, "To Intensity", 75, 0.0)
    intensity_values = intensity_obj.values[0]
    valid = intensity_values[~np.isnan(intensity_values)]

    if len(valid) == 0:
        return {"mean": 0.0, "std": 0.0, "min": 0.0, "max": 0.0, "values": []}
    return {
        "mean": float(np.mean(valid)),
        "std": float(np.std(valid)),
        "min": float(np.min(valid)),
        "max": float(np.max(valid)),
        "values": valid.tolist(),
    }


def _extract_duration(snd: parselmouth.Sound) -> dict:
    """Extract duration-related features."""
    total = snd.duration

    # Voiced duration via pitch analysis
    pitch_obj = call(snd, "To Pitch", 0.0, 75, 600)
    pitch_values = pitch_obj.selected_array["frequency"]
    voiced_frames = np.sum(pitch_values > 0)
    total_frames = len(pitch_values)
    voiced_fraction = voiced_frames / total_frames if total_frames > 0 else 0.0

    return {
        "total_seconds": float(total),
        "voiced_fraction": float(voiced_fraction),
    }


def _extract_voice_quality(snd: parselmouth.Sound) -> dict:
    """Extract jitter and shimmer as voice-quality indicators."""
    try:
        point_process = call(snd, "To PointProcess (periodic, cc)", 75, 600)
        jitter = call(point_process, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)
        shimmer = call(
            [snd, point_process],
            "Get shimmer (local)",
            0, 0, 0.0001, 0.02, 1.3, 1.6,
        )
    except Exception:
        jitter = 0.0
        shimmer = 0.0

    jitter = 0.0 if np.isnan(jitter) else float(jitter)
    shimmer = 0.0 if np.isnan(shimmer) else float(shimmer)

    return {"jitter": jitter, "shimmer": shimmer}
