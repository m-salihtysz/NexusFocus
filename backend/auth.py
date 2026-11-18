from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, Header, HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import SessionLocal
from backend.models import User


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_google_id_token(id_token: str) -> dict:
    """
    Verify Google ID token. GOOGLE_CLIENT_ID is required so the audience is always enforced.
    """
    if not id_token:
        raise HTTPException(status_code=400, detail="Missing Google ID token")

    if not settings.google_client_id:
        raise HTTPException(
            status_code=500, detail="GOOGLE_CLIENT_ID sunucuda yapilandirilmamis"
        )

    request = google_requests.Request()
    try:
        payload = google_id_token.verify_oauth2_token(
            id_token, request, settings.google_client_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid Google ID token: {exc}") from exc

    if not payload.get("email"):
        raise HTTPException(status_code=401, detail="Google token missing email")
    return payload


def issue_access_token(user: User) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expires_minutes)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}") from exc


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token"
        )
    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
