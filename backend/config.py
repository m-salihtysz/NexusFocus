from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Proje kokundaki .env (uvicorn hangi klasorden baslarsa baslasin)
_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env")
load_dotenv()  # cwd .env varsa ek yukleme (opsiyonel)


class Settings:
    google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "")
    jwt_secret: str = os.getenv("NEXUS_JWT_SECRET", "dev-secret-change-me")
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = int(os.getenv("NEXUS_JWT_EXPIRES_MINUTES", "1440"))


settings = Settings()
