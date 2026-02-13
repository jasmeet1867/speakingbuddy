"""GET /api/categories/{category}/words and GET /api/words/{word_id}."""

from fastapi import APIRouter, Depends, HTTPException, Query
import aiosqlite

from app.database import get_db
from app.models import WordOut, WordDetail

router = APIRouter(tags=["words"])

LANG_COLUMNS = {"en": "translation_en", "fr": "translation_fr", "de": "translation_de"}


@router.get("/categories/{category_name}/words", response_model=list[WordOut])
async def list_words(
    category_name: str,
    lang: str = Query("en", pattern="^(en|fr|de)$"),
    db: aiosqlite.Connection = Depends(get_db),
):
    # Resolve category
    cur = await db.execute(
        "SELECT id FROM categories WHERE name = ?", (category_name,)
    )
    cat = await cur.fetchone()
    if not cat:
        raise HTTPException(404, f"Category '{category_name}' not found")

    col = LANG_COLUMNS[lang]
    cursor = await db.execute(
        f"""
        SELECT id, word_lb, {col} AS translation, gender, audio_filename
        FROM words
        WHERE category_id = ?
        ORDER BY id
        """,
        (cat["id"],),
    )
    rows = await cursor.fetchall()
    return [
        WordOut(
            id=r["id"],
            word_lb=r["word_lb"],
            translation=r["translation"],
            gender=r["gender"],
            audio_url=f"/api/audio/{r['id']}",
        )
        for r in rows
    ]


@router.get("/words/{word_id}", response_model=WordDetail)
async def get_word(word_id: int, db: aiosqlite.Connection = Depends(get_db)):
    cur = await db.execute(
        """
        SELECT id, lod_reference, word_lb, translation_en, translation_fr,
               translation_de, gender, audio_filename
        FROM words WHERE id = ?
        """,
        (word_id,),
    )
    row = await cur.fetchone()
    if not row:
        raise HTTPException(404, f"Word {word_id} not found")
    return WordDetail(
        id=row["id"],
        lod_reference=row["lod_reference"],
        word_lb=row["word_lb"],
        translation_en=row["translation_en"],
        translation_fr=row["translation_fr"],
        translation_de=row["translation_de"],
        gender=row["gender"],
        audio_url=f"/api/audio/{row['id']}",
    )
