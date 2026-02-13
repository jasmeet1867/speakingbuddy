"""Human-readable pronunciation feedback generation.

Ported from prototype feedback_generator.py — adapted for backend use.
Pure functions; no Streamlit dependency.
"""

from typing import Any


def generate_phonetic_feedback(
    score_result: dict[str, Any],
    user_features: dict[str, Any],
    ref_features: dict[str, Any],
) -> dict[str, Any]:
    """Produce human-readable feedback from the comparison result.

    *score_result* is the dict returned by
    ``feature_comparator.calculate_weighted_score()``.

    Returns::

        {
            "overall_text": str,
            "improvements": [str, ...],
            "suggestions": [str, ...],
        }
    """
    overall = score_result.get("overall_score", 0)
    breakdown = score_result.get("breakdown", {})
    details = score_result.get("details", {})

    improvements: list[str] = []
    suggestions: list[str] = []

    # ── Pitch feedback ──────────────────────────────────────
    pitch_score = breakdown.get("pitch", 100)
    if pitch_score < 60:
        pitch_detail = details.get("pitch", {})
        mean_diff = pitch_detail.get("mean_diff_hz", 0)
        if mean_diff > 20:
            u_mean = user_features.get("pitch", {}).get("mean", 0)
            r_mean = ref_features.get("pitch", {}).get("mean", 0)
            direction = "higher" if u_mean < r_mean else "lower"
            improvements.append(
                f"Your pitch is {'too low' if direction == 'higher' else 'too high'} "
                f"by about {mean_diff:.0f} Hz. Try speaking slightly {direction}."
            )
        contour = pitch_detail.get("contour_score", 100)
        if contour < 50:
            suggestions.append(
                "The pitch contour (melody) of your speech differs from the reference. "
                "Try to match the rise and fall pattern of the native speaker."
            )

    # ── Formant feedback ────────────────────────────────────
    formant_score = breakdown.get("formants", 100)
    if formant_score < 60:
        formant_detail = details.get("formants", {})
        weak_formants = [
            fi for fi in ("f1", "f2", "f3")
            if formant_detail.get(fi, 100) < 50
        ]
        if weak_formants:
            names = {"f1": "mouth openness", "f2": "tongue position", "f3": "lip rounding"}
            issues = [names.get(f, f) for f in weak_formants]
            improvements.append(
                f"Your vowel quality differs — focus on: {', '.join(issues)}."
            )
        if formant_detail.get("f1", 100) < 50:
            u_f1 = user_features.get("formants", {}).get("f1_mean", 0)
            r_f1 = ref_features.get("formants", {}).get("f1_mean", 0)
            if u_f1 and r_f1:
                if u_f1 < r_f1:
                    suggestions.append("Try opening your mouth a bit more.")
                else:
                    suggestions.append("Try opening your mouth a bit less.")
        if formant_detail.get("f2", 100) < 50:
            u_f2 = user_features.get("formants", {}).get("f2_mean", 0)
            r_f2 = ref_features.get("formants", {}).get("f2_mean", 0)
            if u_f2 and r_f2:
                if u_f2 < r_f2:
                    suggestions.append(
                        "Move your tongue slightly forward — the vowel should be more 'front'."
                    )
                else:
                    suggestions.append(
                        "Move your tongue slightly back — the vowel should be more 'back'."
                    )

    # ── Intensity feedback ──────────────────────────────────
    intensity_score = breakdown.get("intensity", 100)
    if intensity_score < 60:
        u_mean = user_features.get("intensity", {}).get("mean", 0)
        r_mean = ref_features.get("intensity", {}).get("mean", 0)
        if u_mean and r_mean:
            if u_mean < r_mean - 3:
                improvements.append("You're speaking too softly. Try to project your voice more.")
            elif u_mean > r_mean + 3:
                improvements.append("You're speaking too loudly. Try a more moderate volume.")
            else:
                suggestions.append(
                    "Your volume pattern differs from the reference. "
                    "Try to match the stress pattern of the native speaker."
                )

    # ── Duration feedback ───────────────────────────────────
    duration_score = breakdown.get("duration", 100)
    if duration_score < 60:
        dur_detail = details.get("duration", {})
        ratio = dur_detail.get("ratio", 1.0)
        if ratio < 0.7:
            improvements.append("You're speaking too fast. Try to slow down a bit.")
        elif ratio > 1.4:
            improvements.append("You're speaking too slowly. Try to be a bit more fluid.")
        else:
            suggestions.append("Adjust your speaking pace to better match the native speaker.")

    # ── Voice quality feedback ──────────────────────────────
    vq_score = breakdown.get("voice_quality", 100)
    if vq_score < 50:
        vq_detail = details.get("voice_quality", {})
        if vq_detail.get("jitter_score", 100) < 40:
            suggestions.append(
                "Your voice sounds somewhat unstable. "
                "Try to maintain a steady, relaxed tone."
            )
        if vq_detail.get("shimmer_score", 100) < 40:
            suggestions.append(
                "Your voice volume fluctuates too much. "
                "Try to keep a consistent volume throughout."
            )

    # ── Overall summary ─────────────────────────────────────
    if overall >= 85:
        overall_text = "Excellent pronunciation! Very close to native."
    elif overall >= 70:
        overall_text = "Good pronunciation with minor differences."
    elif overall >= 55:
        overall_text = "Fair attempt — some aspects need work."
    elif overall >= 40:
        overall_text = "Your pronunciation needs improvement in several areas."
    else:
        overall_text = "Keep practising! Focus on the suggestions below."

    # Ensure at least one message
    if not improvements and not suggestions:
        if overall >= 70:
            suggestions.append("Keep up the great work!")
        else:
            suggestions.append("Listen to the reference audio again and try to imitate it closely.")

    return {
        "overall_text": overall_text,
        "improvements": improvements,
        "suggestions": suggestions,
    }
