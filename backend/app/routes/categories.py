"""GET /api/categories — list all categories with word counts."""

from fastapi import APIRouter, Depends
import aiosqlite

from app.database import get_db
from app.models import CategoryOut

router = APIRouter(tags=["categories"])


@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        """
        SELECT c.id, c.name, c.display_name, c.image_url,
               COUNT(w.id) AS word_count
        FROM categories c
        LEFT JOIN words w ON w.category_id = c.id
        GROUP BY c.id
        ORDER BY c.name
        """
    )
    rows = await cursor.fetchall()
    return [
        CategoryOut(
            id=r["id"],
            name=r["name"],
            display_name=r["display_name"],
            image_url=r["image_url"],
            word_count=r["word_count"],
        )
        for r in rows
    ]
