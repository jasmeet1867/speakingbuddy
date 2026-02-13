"""SQLite database setup using aiosqlite with a thin wrapper."""

import aiosqlite
from pathlib import Path
from app.config import settings

DB_PATH = settings.DATABASE_PATH


async def get_db() -> aiosqlite.Connection:
    """Dependency – yields an aiosqlite connection with row_factory."""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()


async def init_db() -> None:
    """Create tables if they don't exist."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(SCHEMA_SQL)
        await db.commit()


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS categories (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL UNIQUE,   -- slug used in URLs, e.g. 'animals'
    display_name    TEXT    NOT NULL,           -- human-readable, e.g. 'Animals'
    image_url       TEXT                        -- optional icon/emoji URL
);

CREATE TABLE IF NOT EXISTS words (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    lod_reference       TEXT,
    audio_filename      TEXT,
    category_id         INTEGER NOT NULL REFERENCES categories(id),
    word_lb             TEXT    NOT NULL,       -- Luxembourgish word
    translation_en      TEXT,
    translation_fr      TEXT,
    translation_de      TEXT,
    gender              TEXT,                   -- nullable, for nouns
    praat_features_json TEXT,                   -- pre-computed Praat features as JSON
    created_at          TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_words_category ON words(category_id);
"""
