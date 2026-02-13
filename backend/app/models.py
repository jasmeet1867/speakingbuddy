"""Pydantic models for API request/response schemas."""

from pydantic import BaseModel


# ── Categories ──────────────────────────────────────────────

class CategoryOut(BaseModel):
    id: int
    name: str
    display_name: str
    image_url: str | None = None
    word_count: int = 0


# ── Words ───────────────────────────────────────────────────

class WordOut(BaseModel):
    id: int
    word_lb: str
    translation: str | None = None   # resolved for the requested language
    gender: str | None = None
    audio_url: str


class WordDetail(WordOut):
    lod_reference: str | None = None
    translation_en: str | None = None
    translation_fr: str | None = None
    translation_de: str | None = None


# ── Pronunciation ───────────────────────────────────────────

class PronunciationBreakdown(BaseModel):
    pitch: float
    formants: float
    intensity: float
    duration: float
    voice_quality: float


class PronunciationResult(BaseModel):
    score: float                          # 0-100
    feedback: str
    breakdown: PronunciationBreakdown
    improvements: list[str] = []
    suggestions: list[str] = []
