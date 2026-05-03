from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.auth import (
    get_current_user,
    get_db,
    issue_access_token,
    verify_google_id_token,
)
from backend.database import Base, SessionLocal, engine, ensure_sqlite_user_activity_columns
from backend.enterprise_api import EnterpriseAPI, EnterpriseSnapshotCreate
from backend.focus_engine import FocusEngine
from backend.models import Employee, Tenant, User
from backend.focus_api import router as focus_router
from backend.llm_advisor import LLMAdvisor
from backend.recommendation_engine import RecommendationEngine
from backend.tenants_api import router as tenants_router

app = FastAPI(title="NexusFocus Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)
ensure_sqlite_user_activity_columns()
focus_engine = FocusEngine()
enterprise_api = EnterpriseAPI()
recommendation_engine = RecommendationEngine()
llm_advisor = LLMAdvisor()

app.include_router(tenants_router)
app.include_router(focus_router)


class EnterpriseSnapshotIn(BaseModel):
    tenant_id: int = Field(ge=1)
    team_id: int = Field(ge=1)
    focus_score: int = Field(ge=0, le=100)
    cognitive_load: int = Field(ge=0, le=100)
    blink_rate: float = Field(ge=0.0)
    gaze_speed: float = Field(ge=0.0)


class RecommendationIn(BaseModel):
    module_id: str = "ogrenci"
    focus_score: int = Field(ge=0, le=100)
    cognitive_load: int = Field(ge=0, le=100)
    blink_rate: float = Field(ge=0.0)
    gaze_speed: float = Field(ge=0.0)
    posture_shift: int = Field(default=0, ge=0, le=100)
    cursor_chaos: int = Field(default=0, ge=0, le=100)
    expression_fatigue: int = Field(default=0, ge=0, le=100)
    expression_stress: int = Field(default=0, ge=0, le=100)
    expression_distraction: int = Field(default=0, ge=0, le=100)
    expression_positivity: int = Field(default=0, ge=0, le=100)
    dominant_expression: str = "neutral"
    minute_window: Optional[dict[str, Any]] = Field(
        default=None,
        description="Son ~60 sn istemci ozeti (samples, trend, load_peak, ...)",
    )


class GoogleAuthIn(BaseModel):
    id_token: str
    area: str | None = None
    package_id: str | None = None
    login_kind: str | None = Field(
        default=None,
        max_length=40,
        description="ogrenci | freelance | kurumsal_admin | kurumsal_calisan",
    )


class UserOut(BaseModel):
    id: int
    email: str
    name: str | None
    picture: str | None
    area: str | None
    package_id: str
    is_paid: bool
    role: str


class GoogleAuthOut(BaseModel):
    access_token: str
    user: UserOut


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/google", response_model=GoogleAuthOut)
def google_login(payload: GoogleAuthIn, db: Session = Depends(get_db)) -> GoogleAuthOut:
    google_payload = verify_google_id_token(payload.id_token)
    google_sub = google_payload["sub"]
    email = google_payload["email"]
    email_norm = (email or "").strip().lower()
    login_kind = (payload.login_kind or "").strip().lower() or None

    if payload.area == "kurumsal" and login_kind == "kurumsal_calisan":
        employee = (
            db.query(Employee)
            .filter(
                func.lower(Employee.email) == email_norm,
                Employee.status.in_(("invited", "accepted")),
            )
            .order_by(Employee.id.asc())
            .first()
        )
        if not employee:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Bu Google hesabi sirketinizin davet listesinde degil. "
                    "Yalnizca yonetici tarafindan eklenen e-postalarla kurumsal giris yapilabilir."
                ),
            )

    user = db.query(User).filter(User.google_sub == google_sub).first()
    if user is None:
        user = User(
            google_sub=google_sub,
            email=email,
            name=google_payload.get("name"),
            picture=google_payload.get("picture"),
            area=payload.area,
            package_id=payload.package_id or "standart",
            is_paid=True,
        )
        db.add(user)
    else:
        user.email = email
        user.name = google_payload.get("name") or user.name
        user.picture = google_payload.get("picture") or user.picture
        if payload.area:
            user.area = payload.area
        if payload.package_id:
            user.package_id = payload.package_id

    if payload.area == "ogrenci":
        user.area = "ogrenci"
        user.tenant_id = None
        user.role = "user"
    elif payload.area == "freelance":
        user.area = "freelance"
        user.tenant_id = None
        user.role = "user"
    elif payload.area == "kurumsal":
        user.area = "kurumsal"
        if login_kind == "kurumsal_calisan":
            emp = (
                db.query(Employee)
                .filter(
                    func.lower(Employee.email) == email_norm,
                    Employee.status.in_(("invited", "accepted")),
                )
                .order_by(Employee.id.asc())
                .first()
            )
            user.tenant_id = emp.tenant_id
            user.role = emp.role if emp.role in ("owner", "staff", "viewer") else "staff"
            if emp.status == "invited":
                emp.status = "accepted"
                db.add(emp)
        else:
            # Kurumsal yonetici: ogrenci/freelance oturumunda tenant_id silindiyse sirketi geri bagla
            if not user.tenant_id:
                owned = (
                    db.query(Tenant)
                    .filter(Tenant.owner_user_id == user.id)
                    .order_by(Tenant.id.desc())
                    .first()
                )
                if owned:
                    user.tenant_id = owned.id
                    user.role = "owner"

    user.is_paid = True
    now = datetime.now(timezone.utc)
    user.last_login_at = now
    user.last_seen_at = now
    db.commit()
    db.refresh(user)

    token = issue_access_token(user)
    return GoogleAuthOut(
        access_token=token,
        user=UserOut(
            id=user.id,
            email=user.email,
            name=user.name,
            picture=user.picture,
            area=user.area,
            package_id=user.package_id,
            is_paid=True,
            role=user.role,
        ),
    )


@app.get("/auth/me", response_model=UserOut)
def auth_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserOut:
    now = datetime.now(timezone.utc)
    prev = current_user.last_seen_at
    if prev is None:
        should_touch = True
    else:
        p = prev if prev.tzinfo else prev.replace(tzinfo=timezone.utc)
        should_touch = (now - p).total_seconds() >= 60
    if should_touch:
        current_user.last_seen_at = now
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        picture=current_user.picture,
        area=current_user.area,
        package_id=current_user.package_id,
        is_paid=True,
        role=current_user.role,
    )


@app.post("/auth/logout")
def auth_logout(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    current_user.last_logout_at = datetime.now(timezone.utc)
    db.add(current_user)
    db.commit()
    return {"status": "ok", "user": current_user.email}


@app.post("/enterprise/snapshots")
def create_enterprise_snapshot(payload: EnterpriseSnapshotIn) -> dict[str, int]:
    db: Session = SessionLocal()
    try:
        snapshot = enterprise_api.save_snapshot(
            db,
            EnterpriseSnapshotCreate(
                tenant_id=payload.tenant_id,
                team_id=payload.team_id,
                focus_score=payload.focus_score,
                cognitive_load=payload.cognitive_load,
                blink_rate=payload.blink_rate,
                gaze_speed=payload.gaze_speed,
            ),
        )
        return {"id": snapshot.id}
    finally:
        db.close()


@app.post("/admin/recommendations")
def get_admin_recommendations(payload: RecommendationIn) -> dict[str, object]:
    expression_payload = {
        "expression_fatigue": payload.expression_fatigue,
        "expression_stress": payload.expression_stress,
        "expression_distraction": payload.expression_distraction,
        "expression_positivity": payload.expression_positivity,
        "dominant_expression": payload.dominant_expression,
    }

    llm_recommendations = llm_advisor.suggest(
        module_id=payload.module_id,
        focus_score=payload.focus_score,
        cognitive_load=payload.cognitive_load,
        blink_rate=payload.blink_rate,
        gaze_speed=payload.gaze_speed,
        posture_shift=payload.posture_shift,
        cursor_chaos=payload.cursor_chaos,
        expressions=expression_payload,
        minute_window=payload.minute_window,
    )
    if llm_recommendations:
        return {"recommendations": llm_recommendations, "source": "llm"}

    rule_based = recommendation_engine.suggest(
        module_id=payload.module_id,
        focus_score=payload.focus_score,
        cognitive_load=payload.cognitive_load,
        blink_rate=payload.blink_rate,
        gaze_speed=payload.gaze_speed,
        posture_shift=payload.posture_shift,
        cursor_chaos=payload.cursor_chaos,
        expressions=expression_payload,
        minute_window=payload.minute_window,
    )
    return {"recommendations": rule_based, "source": "rule"}


@app.websocket("/ws/focus")
async def focus_websocket(websocket: WebSocket) -> None:
    """
    Receive camera-derived metrics and stream computed focus values back.
    """
    await websocket.accept()
    try:
        while True:
            payload = await websocket.receive_text()
            camera_feed: dict[str, Any] = json.loads(payload)
            result = focus_engine.process_camera_feed(camera_feed)
            result["timestamp"] = datetime.now(timezone.utc).isoformat()
            await websocket.send_json(result)
    except WebSocketDisconnect:
        return
