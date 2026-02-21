"""POST /api/pronunciation/check — pronunciation evaluation endpoint."""

import json
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
import aiosqlite

from app.database import get_db
from app.config import settings
from app.models import PronunciationResult, PronunciationBreakdown
from app.services.audio_processor import preprocess_upload
from app.services.praat_analyzer import extract_all_praat_features
from app.services.feature_comparator import calculate_weighted_score
from app.services.feedback_generator import generate_phonetic_feedback

logger = logging.getLogger(__name__)

router = APIRouter(tags=["pronunciation"])


@router.post("/pronunciation/check", response_model=PronunciationResult)
async def check_pronunciation(
    word_id: int = Form(...),
    audio: UploadFile = File(...),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Accept user audio and return pronunciation score + feedback.

    Pipeline:
      1. Read upload bytes & preprocess (convert, normalise, trim, split)
      2. Extract Praat features from processed user audio
      3. Load pre-computed reference features from DB
      4. Compare with weighted scoring (DTW + Gaussian similarity)
      5. Generate human-readable feedback
      6. Clean up temp files
      7. Return result
    """
    # ── 0. Validate word exists & has reference features ────
    row = await db.execute(
        "SELECT audio_filename, praat_features_json FROM words WHERE id = ?",
        (word_id,),
    )
    word_row = await row.fetchone()
    if word_row is None:
        raise HTTPException(status_code=404, detail=f"Word {word_id} not found")

    audio_filename = word_row["audio_filename"]
    ref_features_json = word_row["praat_features_json"]

    # If we have saved precomputed features, use them.
    # Otherwise, attempt to compute from the reference audio file if present.
    ref_features = None
    if ref_features_json and ref_features_json != '{"placeholder": true}':
        try:
            ref_features = json.loads(ref_features_json)
        except Exception:
            # Fall back to computing from audio file below
            ref_features = None

    if ref_features is None:
        # Need a reference audio file to compute features
        if not audio_filename:
            raise HTTPException(
                status_code=400,
                detail="No reference audio or precomputed features available for this word.",
            )
        ref_audio_path = settings.AUDIO_DIR / audio_filename
        if not ref_audio_path.exists():
            raise HTTPException(
                status_code=400,
                detail="Reference audio file missing and no pre-computed features.",
            )
        logger.info("Computing reference features on-the-fly for word %d", word_id)
        ref_features = extract_all_praat_features(ref_audio_path)

    # ── 1. Preprocess uploaded audio ────────────────────────
    raw_bytes = await audio.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    user_wav_path: Path | None = None
    try:
        user_wav_path = preprocess_upload(raw_bytes, audio.filename or "upload.webm")

        # ── 2. Extract Praat features from user audio ───────
        user_features = extract_all_praat_features(user_wav_path)

        # ── 3. Compare features ─────────────────────────────
        score_result = calculate_weighted_score(user_features, ref_features)

        # ── 4. Generate feedback ────────────────────────────
        feedback = generate_phonetic_feedback(score_result, user_features, ref_features)

    except Exception as exc:
        logger.exception("Pronunciation analysis failed for word %d", word_id)
        raise HTTPException(
            status_code=500,
            detail=f"Analysis error: {exc}",
        )
    finally:
        # ── 5. Cleanup temp file ────────────────────────────
        if user_wav_path and user_wav_path.exists():
            user_wav_path.unlink(missing_ok=True)

    # ── 6. Build response ───────────────────────────────────
    breakdown = score_result["breakdown"]
    return PronunciationResult(
        score=score_result["overall_score"],
        feedback=feedback["overall_text"],
        breakdown=PronunciationBreakdown(
            pitch=breakdown["pitch"],
            formants=breakdown["formants"],
            intensity=breakdown["intensity"],
            duration=breakdown["duration"],
            voice_quality=breakdown["voice_quality"],
        ),
        improvements=feedback["improvements"],
        suggestions=feedback["suggestions"],
    )
