from __future__ import annotations

import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

# Proje kokundaki .env (uvicorn hangi klasorden baslarsa baslasin)
_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env")
load_dotenv()  # cwd .env varsa ek yukleme (opsiyonel)


class Settings:
    google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "")
    # Gizli anahtar tanimli degilse her baslatmada rastgele uretilir (bilinen varsayilan yok);
    # bu durumda yeniden baslatinca oturumlar gecersiz olur. Kalici icin .env'de ayarlayin.
    jwt_secret: str = os.getenv("NEXUS_JWT_SECRET") or secrets.token_urlsafe(48)
    cors_origins: list[str] = [
        o.strip()
        for o in os.getenv(
            "NEXUS_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if o.strip()
    ]
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = int(os.getenv("NEXUS_JWT_EXPIRES_MINUTES", "1440"))


settings = Settings()
