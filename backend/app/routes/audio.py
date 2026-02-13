"""GET /api/audio/{word_id} — stream reference audio file."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
import aiosqlite

from app.config import settings
from app.database import get_db

router = APIRouter(tags=["audio"])


@router.get("/audio/{word_id}")
async def stream_audio(word_id: int, db: aiosqlite.Connection = Depends(get_db)):
    cur = await db.execute(
        "SELECT audio_filename FROM words WHERE id = ?", (word_id,)
    )
    row = await cur.fetchone()
    if not row:
        raise HTTPException(404, f"Word {word_id} not found")

    audio_file = row["audio_filename"]
    if not audio_file:
        raise HTTPException(404, f"No audio file for word {word_id}")

    path = settings.AUDIO_DIR / audio_file
    if not path.is_file():
        raise HTTPException(404, f"Audio file not found on disk: {audio_file}")

    return FileResponse(
        path,
        media_type="audio/wav",
        filename=audio_file,
    )
