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

    # ── Utterance-level sanity gate ─────────────────────────
    # The acoustic similarity metrics can give non-trivial scores even when
    # the user records a full sentence. Gate the score based on duration vs.
    # the reference word to strongly penalize obvious mismatches.
    gate, gate_detail = _compute_utterance_gate(
        user_features.get("duration", {}),
        ref_features.get("duration", {}),
    )
    detail["utterance_gate"] = gate_detail

    pitch_score *= gate
    formant_score *= gate
    intensity_score *= gate
    duration_score *= gate
    vq_score *= gate

    # ── Word mismatch signal (for feedback / debugging) ──────
    # Keep a mismatch *signal* in details, but don't gate score on it.
    other_mean = float(np.mean([pitch_score, intensity_score, duration_score, vq_score]))
    formants_missing = bool(formant_detail.get("missing", False))
    _mismatch_gate, mismatch_detail = _compute_word_mismatch_gate(
        formant_score,
        other_mean,
        formants_missing=formants_missing,
    )
    detail["word_mismatch_gate"] = mismatch_detail

    overall_raw = (
        WEIGHTS["pitch"] * pitch_score
        + WEIGHTS["formants"] * formant_score
        + WEIGHTS["intensity"] * intensity_score
        + WEIGHTS["duration"] * duration_score
        + WEIGHTS["voice_quality"] * vq_score
    )

    # Conservative MFCC penalty (only triggers for clearly different audio)
    mfcc_penalty, mfcc_detail = _compute_mfcc_penalty(
        user_features.get("mfcc", {}),
        ref_features.get("mfcc", {}),
    )
    detail["mfcc_gate"] = mfcc_detail

    overall = overall_raw * mfcc_penalty

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


def _compute_utterance_gate(user_duration: dict, ref_duration: dict) -> tuple[float, dict[str, Any]]:
    """Compute a 0..1 multiplier based on utterance length mismatch.

    The app is designed for single-word recordings. If the processed user audio
    is far longer than the reference word, it's likely a sentence or multiple
    words, and the overall score should drop sharply.

    Returns (gate, detail).
    """
    u = float(user_duration.get("total_seconds", 0.0) or 0.0)
    r = float(ref_duration.get("total_seconds", 0.0) or 0.0)

    # If reference duration is missing, don't gate.
    if r <= 0.0 or u <= 0.0:
        return 1.0, {
            "gate": 1.0,
            "reason": "missing_duration",
            "user_seconds": round(u, 3),
            "ref_seconds": round(r, 3),
        }

    # Allow some natural variation in how long a word is spoken.
    expected_max = max(1.8, 3.0 * r)
    expected_min = max(0.25, 0.35 * r)

    gate = 1.0
    reason = "ok"

    if u > expected_max:
        # Penalize rapidly once the user exceeds the expected max.
        ratio_over = (u / expected_max) - 1.0
        gate = float(np.exp(-0.5 * (ratio_over / 0.2) ** 2))
        reason = "too_long"
    elif u < expected_min:
        ratio_under = (expected_min / max(u, 1e-6)) - 1.0
        gate = float(np.exp(-0.5 * (ratio_under / 0.35) ** 2))
        reason = "too_short"

    # Keep a small floor for numerical stability and predictable UX.
    gate = float(np.clip(gate, 0.0, 1.0))

    return gate, {
        "gate": round(gate, 4),
        "reason": reason,
        "user_seconds": round(u, 3),
        "ref_seconds": round(r, 3),
        "expected_min_seconds": round(expected_min, 3),
        "expected_max_seconds": round(expected_max, 3),
    }


# ── DTW helper ──────────────────────────────────────────────

def _dtw_distance(seq_a: list[float], seq_b: list[float]) -> float:
    """Simple DTW distance (Euclidean cost) between two 1-D sequences.

    Uses O(n·m) DP; fine for short utterances.
    """
    n, m = len(seq_a), len(seq_b)
    if n == 0 or m == 0:
        # No alignment possible; treat as maximally different.
        return 1e6
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
    missing = False

    for fi in ("f1", "f2", "f3"):
        u_vals = user.get(f"{fi}_values", [])
        r_vals = ref.get(f"{fi}_values", [])
        if u_vals and r_vals:
            dtw_dist = _dtw_distance(u_vals, r_vals)
            s = _gaussian_similarity(dtw_dist, sigma=100)
        else:
            u_mean = user.get(f"{fi}_mean", 0)
            r_mean = ref.get(f"{fi}_mean", 0)
            # If either mean is missing (0 from extractor), treat as insufficient.
            if not u_mean or not r_mean:
                s = 50.0
                missing = True
            else:
                s = _gaussian_similarity(abs(u_mean - r_mean), sigma=100)
        scores.append(s)
        detail[fi] = round(s, 1)

    # Weight F1/F2 higher than F3
    if len(scores) == 3:
        score = 0.4 * scores[0] + 0.4 * scores[1] + 0.2 * scores[2]
    else:
        score = float(np.mean(scores)) if scores else 50.0
    detail["missing"] = missing
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

    u_mean = user.get("mean", 0)
    r_mean = ref.get("mean", 0)
    if not u_mean or not r_mean:
        mean_score = 50.0
    else:
        mean_diff = abs(u_mean - r_mean)
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


def _compute_word_mismatch_gate(
    formant_score: float,
    other_mean_score: float,
    *,
    formants_missing: bool,
) -> tuple[float, dict[str, Any]]:
    """Return a 0..1 multiplier based on formant match.

    For single-word pronunciation, formants are the best proxy for "did you
    say the same vowels/word". When formant_score is low, collapse the overall.
    """
    fs = float(formant_score)
    other = float(other_mean_score)

    if formants_missing:
        return 1.0, {"gate": 1.0, "reason": "missing_formants", "formants": round(fs, 1), "other_mean": round(other, 1)}

    # If formants aren't extremely low, don't apply a mismatch penalty.
    if fs >= 25.0:
        return 1.0, {"gate": 1.0, "reason": "ok", "formants": round(fs, 1), "other_mean": round(other, 1)}

    gap = max(0.0, other - fs)
    # If everything is low (common for beginners), it's likely not a "different word"
    # case—avoid collapsing scores further.
    if gap <= 25.0:
        return 1.0, {"gate": 1.0, "reason": "low_overall_confidence", "formants": round(fs, 1), "other_mean": round(other, 1)}

    # Strong penalty when other scores are high but formants are low.
    # - fs_term collapses as formants approach 0
    # - gap_term collapses as the disparity grows beyond 25
    fs_term = (max(fs, 0.0) / 25.0) ** 2
    gap_term = float(np.exp(-0.5 * ((gap - 25.0) / 15.0) ** 2))
    gate = float(np.clip(fs_term * gap_term, 0.2, 1.0))

    reason = "very_low_formants" if fs <= 5.0 else "low_formants"
    return gate, {
        "gate": round(gate, 4),
        "reason": reason,
        "formants": round(fs, 1),
        "other_mean": round(other, 1),
        "gap": round(gap, 1),
    }


def _compute_mfcc_penalty(user_mfcc: dict, ref_mfcc: dict) -> tuple[float, dict[str, Any]]:
    """Return a 0..1 penalty based on MFCC distance.

    This is intentionally conservative: it should NOT reduce scores for normal
    attempts, only for clearly different recordings (wrong word / sentence / noise).
    """
    u = user_mfcc.get("mean", None)
    r = ref_mfcc.get("mean", None)
    if not u or not r:
        return 1.0, {"gate": 1.0, "reason": "missing_mfcc"}

    u_vec = np.array(u, dtype=np.float64)
    r_vec = np.array(r, dtype=np.float64)
    if u_vec.shape != r_vec.shape or u_vec.size == 0:
        return 1.0, {"gate": 1.0, "reason": "bad_shape"}

    dist = float(np.linalg.norm(u_vec - r_vec))

    # Piecewise penalty: no penalty when close, steep drop only when very far.
    t_ok = 70.0
    t_bad = 160.0
    if dist <= t_ok:
        return 1.0, {"gate": 1.0, "reason": "ok", "dist": round(dist, 2)}
    if dist >= t_bad:
        return 0.2, {"gate": 0.2, "reason": "very_different", "dist": round(dist, 2)}

    # Smoothly interpolate between 1.0 and 0.2
    frac = (dist - t_ok) / (t_bad - t_ok)
    gate = float(1.0 - frac * 0.8)
    gate = float(np.clip(gate, 0.2, 1.0))
    return gate, {"gate": round(gate, 4), "reason": "different", "dist": round(dist, 2)}
