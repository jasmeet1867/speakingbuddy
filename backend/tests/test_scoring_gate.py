import math

from app.services.feature_comparator import calculate_weighted_score


def _base_features(duration_s: float) -> dict:
    # Crafted so that (without gating) similarity would be ~100.
    return {
        "pitch": {"mean": 120.0, "std": 0.0, "min": 120.0, "max": 120.0, "values": [120.0, 120.0, 120.0]},
        "formants": {
            "f1_mean": 500.0,
            "f1_std": 0.0,
            "f1_values": [500.0, 500.0, 500.0],
            "f2_mean": 1500.0,
            "f2_std": 0.0,
            "f2_values": [1500.0, 1500.0, 1500.0],
            "f3_mean": 2500.0,
            "f3_std": 0.0,
            "f3_values": [2500.0, 2500.0, 2500.0],
        },
        "intensity": {"mean": 70.0, "std": 0.0, "min": 70.0, "max": 70.0, "values": [70.0, 70.0, 70.0]},
        "duration": {"total_seconds": float(duration_s), "voiced_fraction": 0.9},
        "voice_quality": {"jitter": 0.005, "shimmer": 0.03},
    }


def test_sentence_like_recording_gets_heavily_penalized():
    ref = _base_features(0.6)
    user = _base_features(3.0)  # way too long for a single word

    result = calculate_weighted_score(user, ref)

    # The duration gate should penalize strongly.
    assert result["overall_score"] < 25.0


def test_normal_length_recording_not_penalized_by_gate():
    ref = _base_features(0.6)
    user = _base_features(0.8)

    result = calculate_weighted_score(user, ref)

    # Should stay high since features match closely.
    assert result["overall_score"] > 80.0


def test_slightly_slow_recording_not_collapsed_to_zero():
    ref = _base_features(0.6)
    user = _base_features(1.8)  # slow, but still plausible single-word

    result = calculate_weighted_score(user, ref)

    assert not math.isnan(result["overall_score"])
    assert result["overall_score"] > 20.0
