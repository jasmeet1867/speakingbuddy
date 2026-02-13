"""Feature comparison and weighted scoring.

Ported from prototype feature_comparator.py — adapted for backend use.
Uses DTW for time-series alignment and Gaussian similarity for scalars.
"""

from typing import Any

import numpy as np

# ── Weights (must sum to 1.0) ───────────────────────────────

WEIGHTS = {
    "formants": 0.35,
    "pitch": 0.20,
    "intensity": 0.15,
    "duration": 0.15,
    "voice_quality": 0.15,
}


# ── Public API ──────────────────────────────────────────────

def calculate_weighted_score(
    user_features: dict[str, Any],
    ref_features: dict[str, Any],
) -> dict[str, Any]:
    """Compare user vs. reference features and return a scored breakdown.

    Returns::

        {
            "overall_score": float,       # 0-100
            "breakdown": {
                "pitch": float,
                "formants": float,
                "intensity": float,
                "duration": float,
                "voice_quality": float,
            },
            "details": { ... },           # per-feature detail dicts
        }
    """
    detail: dict[str, Any] = {}

    pitch_score, pitch_detail = _compare_pitch(
        user_features.get("pitch", {}),
        ref_features.get("pitch", {}),
    )
    detail["pitch"] = pitch_detail

    formant_score, formant_detail = _compare_formants(
        user_features.get("formants", {}),
        ref_features.get("formants", {}),
    )
    detail["formants"] = formant_detail

    intensity_score, intensity_detail = _compare_intensity(
        user_features.get("intensity", {}),
        ref_features.get("intensity", {}),
    )
    detail["intensity"] = intensity_detail

    duration_score, duration_detail = _compare_duration(
        user_features.get("duration", {}),
        ref_features.get("duration", {}),
    )
    detail["duration"] = duration_detail

    vq_score, vq_detail = _compare_voice_quality(
        user_features.get("voice_quality", {}),
        ref_features.get("voice_quality", {}),
    )
    detail["voice_quality"] = vq_detail

    overall = (
        WEIGHTS["pitch"] * pitch_score
        + WEIGHTS["formants"] * formant_score
        + WEIGHTS["intensity"] * intensity_score
        + WEIGHTS["duration"] * duration_score
        + WEIGHTS["voice_quality"] * vq_score
    )

    return {
        "overall_score": round(overall, 1),
        "breakdown": {
            "pitch": round(pitch_score, 1),
            "formants": round(formant_score, 1),
            "intensity": round(intensity_score, 1),
            "duration": round(duration_score, 1),
            "voice_quality": round(vq_score, 1),
        },
        "details": detail,
    }


# ── DTW helper ──────────────────────────────────────────────

def _dtw_distance(seq_a: list[float], seq_b: list[float]) -> float:
    """Simple DTW distance (Euclidean cost) between two 1-D sequences.

    Uses O(n·m) DP; fine for short utterances.
    """
    n, m = len(seq_a), len(seq_b)
    if n == 0 or m == 0:
        return 0.0
    a = np.array(seq_a, dtype=np.float64)
    b = np.array(seq_b, dtype=np.float64)
    dtw = np.full((n + 1, m + 1), np.inf)
    dtw[0, 0] = 0.0
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = abs(a[i - 1] - b[j - 1])
            dtw[i, j] = cost + min(dtw[i - 1, j], dtw[i, j - 1], dtw[i - 1, j - 1])
    return float(dtw[n, m] / max(n, m))


def _gaussian_similarity(diff: float, sigma: float) -> float:
    """Map a difference to a 0-100 score via a Gaussian kernel."""
    return float(100.0 * np.exp(-0.5 * (diff / sigma) ** 2))


# ── Per-feature comparison ──────────────────────────────────

def _compare_pitch(user: dict, ref: dict) -> tuple[float, dict]:
    u_vals = user.get("values", [])
    r_vals = ref.get("values", [])
    detail: dict[str, Any] = {}

    if not u_vals or not r_vals:
        return 50.0, {"note": "insufficient pitch data"}

    dtw_dist = _dtw_distance(u_vals, r_vals)
    contour_score = _gaussian_similarity(dtw_dist, sigma=50)

    mean_diff = abs(user.get("mean", 0) - ref.get("mean", 0))
    mean_score = _gaussian_similarity(mean_diff, sigma=30)

    range_user = user.get("max", 0) - user.get("min", 0)
    range_ref = ref.get("max", 0) - ref.get("min", 0)
    range_diff = abs(range_user - range_ref)
    range_score = _gaussian_similarity(range_diff, sigma=40)

    score = 0.5 * contour_score + 0.3 * mean_score + 0.2 * range_score
    detail.update({
        "contour_score": round(contour_score, 1),
        "mean_score": round(mean_score, 1),
        "range_score": round(range_score, 1),
        "dtw_distance": round(dtw_dist, 2),
        "mean_diff_hz": round(mean_diff, 1),
    })
    return score, detail


def _compare_formants(user: dict, ref: dict) -> tuple[float, dict]:
    scores: list[float] = []
    detail: dict[str, Any] = {}

    for fi in ("f1", "f2", "f3"):
        u_vals = user.get(f"{fi}_values", [])
        r_vals = ref.get(f"{fi}_values", [])
        if u_vals and r_vals:
            dtw_dist = _dtw_distance(u_vals, r_vals)
            s = _gaussian_similarity(dtw_dist, sigma=100)
        else:
            u_mean = user.get(f"{fi}_mean", 0)
            r_mean = ref.get(f"{fi}_mean", 0)
            s = _gaussian_similarity(abs(u_mean - r_mean), sigma=100)
        scores.append(s)
        detail[fi] = round(s, 1)

    # Weight F1/F2 higher than F3
    if len(scores) == 3:
        score = 0.4 * scores[0] + 0.4 * scores[1] + 0.2 * scores[2]
    else:
        score = float(np.mean(scores)) if scores else 50.0
    return score, detail


def _compare_intensity(user: dict, ref: dict) -> tuple[float, dict]:
    u_vals = user.get("values", [])
    r_vals = ref.get("values", [])
    detail: dict[str, Any] = {}

    if u_vals and r_vals:
        dtw_dist = _dtw_distance(u_vals, r_vals)
        contour_score = _gaussian_similarity(dtw_dist, sigma=10)
    else:
        contour_score = 50.0

    mean_diff = abs(user.get("mean", 0) - ref.get("mean", 0))
    mean_score = _gaussian_similarity(mean_diff, sigma=5)

    score = 0.6 * contour_score + 0.4 * mean_score
    detail.update({
        "contour_score": round(contour_score, 1),
        "mean_score": round(mean_score, 1),
    })
    return score, detail


def _compare_duration(user: dict, ref: dict) -> tuple[float, dict]:
    u_dur = user.get("total_seconds", 0)
    r_dur = ref.get("total_seconds", 0)
    detail: dict[str, Any] = {}

    if r_dur > 0:
        ratio = u_dur / r_dur
        diff = abs(1.0 - ratio)
        score = _gaussian_similarity(diff, sigma=0.3)
        detail["ratio"] = round(ratio, 2)
    else:
        score = 50.0

    u_vf = user.get("voiced_fraction", 0)
    r_vf = ref.get("voiced_fraction", 0)
    vf_diff = abs(u_vf - r_vf)
    vf_score = _gaussian_similarity(vf_diff, sigma=0.2)
    detail["voiced_fraction_score"] = round(vf_score, 1)

    score = 0.6 * score + 0.4 * vf_score
    return score, detail


def _compare_voice_quality(user: dict, ref: dict) -> tuple[float, dict]:
    u_j = user.get("jitter", 0)
    r_j = ref.get("jitter", 0)
    u_s = user.get("shimmer", 0)
    r_s = ref.get("shimmer", 0)
    detail: dict[str, Any] = {}

    jitter_diff = abs(u_j - r_j)
    shimmer_diff = abs(u_s - r_s)
    j_score = _gaussian_similarity(jitter_diff, sigma=0.01)
    s_score = _gaussian_similarity(shimmer_diff, sigma=0.05)

    score = 0.5 * j_score + 0.5 * s_score
    detail.update({
        "jitter_score": round(j_score, 1),
        "shimmer_score": round(s_score, 1),
    })
    return score, detail
