"""Application configuration loaded from environment variables."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the backend directory
_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env")


class Settings:
    DATABASE_PATH: Path = _backend_dir / "data" / "speakingbuddy.db"
    CORS_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv("CORS_ORIGINS", "http://localhost:5500").split(",")
        if o.strip()
    ]
    AUDIO_DIR: Path = Path(os.getenv("AUDIO_DIR", str(_backend_dir / "reference_audio")))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))


settings = Settings()
