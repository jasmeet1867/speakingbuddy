"""GET /api/audio/{word_id} — stream reference audio file.

If a referenced audio file is missing, return a short silent WAV so the
frontend doesn't receive a 404. This keeps audio playback UX smooth while
the project is missing many reference files.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, Response
import aiosqlite

from app.config import settings
from app.database import get_db

router = APIRouter(tags=["audio"])


def _generate_silence_wav(duration_s: float = 0.8, rate: int = 16000, bits: int = 16, channels: int = 1) -> bytes:
    """Generate a PCM WAV file (bytes) containing silence.

    Small utility so we can return placeholder audio when files are missing.
    """
    import struct

    num_samples = int(duration_s * rate)
    byte_depth = bits // 8
    block_align = channels * byte_depth
    byte_rate = rate * block_align
    subchunk2_size = num_samples * block_align

    # RIFF header
    parts = []
    parts.append(b'RIFF')
    parts.append(struct.pack('<I', 36 + subchunk2_size))
    parts.append(b'WAVE')

    # fmt subchunk
    parts.append(b'fmt ')
    parts.append(struct.pack('<I', 16))  # Subchunk1Size for PCM
    parts.append(struct.pack('<H', 1))   # AudioFormat PCM = 1
    parts.append(struct.pack('<H', channels))
    parts.append(struct.pack('<I', rate))
    parts.append(struct.pack('<I', byte_rate))
    parts.append(struct.pack('<H', block_align))
    parts.append(struct.pack('<H', bits))

    # data subchunk
    parts.append(b'data')
    parts.append(struct.pack('<I', subchunk2_size))

    # silent samples (zeros)
    parts.append(b'\x00' * subchunk2_size)

    return b''.join(parts)


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
        # Return a short silent WAV placeholder instead of 404
        data = _generate_silence_wav()
        return Response(content=data, media_type="audio/wav", headers={"X-Placeholder-Audio": "true"})

    path = settings.AUDIO_DIR / audio_file
    if not path.is_file():
        # Missing on disk — return placeholder instead of 404
        data = _generate_silence_wav()
        return Response(content=data, media_type="audio/wav", headers={"X-Placeholder-Audio": "true"})

    return FileResponse(
        path,
        media_type="audio/wav",
        filename=audio_file,
    )
