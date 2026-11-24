"""
Loads configuration from environment variables (Vercel Project Settings or local .env).
API keys are never hardcoded.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

API_DIR = Path(__file__).resolve().parent
ROOT_DIR = API_DIR.parent

load_dotenv(ROOT_DIR / ".env")


class Settings:
    FINNHUB_API_KEY: str = os.getenv("FINNHUB_API_KEY", "").strip()
    QUOTE_CACHE_TTL: int = int(os.getenv("QUOTE_CACHE_TTL", "45"))
    CHART_CACHE_TTL: int = int(os.getenv("CHART_CACHE_TTL", "600"))
    FUNDAMENTALS_CACHE_TTL: int = int(os.getenv("FUNDAMENTALS_CACHE_TTL", "86400"))
    FX_CACHE_TTL: int = int(os.getenv("FX_CACHE_TTL", "1800"))


settings = Settings()
