from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.auth import decode_access_token, get_current_user, get_db
from backend.focus_chat import rule_based_focus_chat
from backend.llm_advisor import LLMAdvisor
from backend.models import FocusSession, User
from backend.student_rhythm import build_student_rhythm

router = APIRouter(prefix="/focus", tags=["focus"])


class FocusSessionIn(BaseModel):
    module_id: str = Field(min_length=2, max_length=32)
    focus_score: int = Field(ge=0, le=100)
    hybrid_score: int = Field(ge=0, le=100)
    cognitive_load: int = Field(ge=0, le=100)
    blink_rate: float = Field(ge=0.0)
    gaze_speed: float = Field(ge=0.0)


class FocusSessionOut(BaseModel):
    id: int
    module_id: str
    focus_score: int
    hybrid_score: int
    cognitive_load: int
    blink_rate: float
    gaze_speed: float
    created_at: datetime


class HourHeat(BaseModel):
    hour: int = Field(ge=0, le=23)
    avg_hybrid: Optional[float] = None
    count: int = 0


class StudentRhythmOut(BaseModel):
    eligible: bool
    total_sessions: int
    heatmap: list[HourHeat]
    best_hours: list[int]
    insights: list[str]


class FocusChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    hybrid_score: Optional[int] = Field(default=None, ge=0, le=100)
    cognitive_load: Optional[int] = Field(default=None, ge=0, le=100)


class FocusChatOut(BaseModel):
    reply: str
    source: str = Field(description="llm | rules")


_chat_llm_singleton: Optional[LLMAdvisor] = None


def _focus_chat_llm() -> LLMAdvisor:
    global _chat_llm_singleton
    if _chat_llm_singleton is None:
        _chat_llm_singleton = LLMAdvisor()
    return _chat_llm_singleton


def _resolve_user(authorization: Optional[str], db: Session) -> Optional[User]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_access_token(token)
    except HTTPException:
        return None
    return db.query(User).filter(User.id == int(payload["sub"])).first()


@router.post(
    "/sessions",
    response_model=FocusSessionOut,
    status_code=status.HTTP_201_CREATED,
)
def record_focus_session(
    payload: FocusSessionIn,
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> FocusSessionOut:
    user = _resolve_user(authorization, db)
    session = FocusSession(
        user_id=user.id if user else None,
        module_id=payload.module_id,
        focus_score=payload.focus_score,
        hybrid_score=payload.hybrid_score,
        cognitive_load=payload.cognitive_load,
        blink_rate=payload.blink_rate,
        gaze_speed=payload.gaze_speed,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return FocusSessionOut(
        id=session.id,
        module_id=session.module_id,
        focus_score=session.focus_score,
        hybrid_score=session.hybrid_score,
        cognitive_load=session.cognitive_load,
        blink_rate=session.blink_rate,
        gaze_speed=session.gaze_speed,
        created_at=session.created_at,
    )


@router.get("/sessions/me", response_model=list[FocusSessionOut])
def my_focus_sessions(
    limit: int = 50,
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> list[FocusSessionOut]:
    user = _resolve_user(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    sessions = (
        db.query(FocusSession)
        .filter(FocusSession.user_id == user.id)
        .order_by(FocusSession.created_at.desc())
        .limit(min(max(limit, 1), 500))
        .all()
    )
    return [
        FocusSessionOut(
            id=item.id,
            module_id=item.module_id,
            focus_score=item.focus_score,
            hybrid_score=item.hybrid_score,
            cognitive_load=item.cognitive_load,
            blink_rate=item.blink_rate,
            gaze_speed=item.gaze_speed,
            created_at=item.created_at,
        )
        for item in sessions
    ]


@router.get("/insights/student-rhythm", response_model=StudentRhythmOut)
def student_rhythm_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StudentRhythmOut:
    """Ogrenci modulune ait gecmis oturumlardan saatlik odak ozeti ve AI tarzi oneriler."""
    empty_heat = [HourHeat(hour=h, avg_hybrid=None, count=0) for h in range(24)]
    if (current_user.area or "").lower() != "ogrenci":
        return StudentRhythmOut(
            eligible=False,
            total_sessions=0,
            heatmap=empty_heat,
            best_hours=[],
            insights=[],
        )

    sessions = (
        db.query(FocusSession)
        .filter(
            FocusSession.user_id == current_user.id,
            FocusSession.module_id == "ogrenci",
        )
        .order_by(FocusSession.created_at.desc())
        .limit(400)
        .all()
    )

    data = build_student_rhythm(sessions)
    heatmap = [HourHeat(**row) for row in data["heatmap"]]
    return StudentRhythmOut(
        eligible=True,
        total_sessions=int(data["total_sessions"]),
        heatmap=heatmap,
        best_hours=list(data["best_hours"]),
        insights=list(data["insights"]),
    )


@router.post("/insights/chat", response_model=FocusChatOut)
def focus_insights_chat(
    payload: FocusChatIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FocusChatOut:
    """
    Gecmis odak oturumlari (saatlik ritim) + istege bagli canli skorlar uzerinden
    kullanici sorusuna yanit. OPENAI_API_KEY varsa LLM, yoksa kural tabanli.
    """
    area = (current_user.area or "ogrenci").lower()
    if area not in ("ogrenci", "kurumsal", "freelance"):
        area = "ogrenci"

    sessions = (
        db.query(FocusSession)
        .filter(
            FocusSession.user_id == current_user.id,
            FocusSession.module_id == area,
        )
        .order_by(FocusSession.created_at.desc())
        .limit(400)
        .all()
    )

    rhythm = build_student_rhythm(sessions)
    heatmap_rows = rhythm.get("heatmap") or []
    compact_heat = [
        {"hour": int(row["hour"]), "avg_hybrid": row.get("avg_hybrid"), "count": int(row.get("count") or 0)}
        for row in heatmap_rows
    ]
    context: dict = {
        "user_area": area,
        "rhythm": {
            "total_sessions": int(rhythm.get("total_sessions") or 0),
            "best_hours": list(rhythm.get("best_hours") or []),
            "insights": list(rhythm.get("insights") or []),
            "heatmap": compact_heat,
        },
    }
    if payload.hybrid_score is not None or payload.cognitive_load is not None:
        context["live"] = {
            "hybrid_score": payload.hybrid_score,
            "cognitive_load": payload.cognitive_load,
        }

    advisor = _focus_chat_llm()
    llm_reply = None
    if advisor.is_enabled():
        llm_reply = advisor.chat_focus_qa(context, payload.message.strip())

    if llm_reply:
        return FocusChatOut(reply=llm_reply, source="llm")

    rules_reply = rule_based_focus_chat(
        payload.message,
        {**rhythm, "heatmap": compact_heat},
        user_area=area,
        live_hybrid=payload.hybrid_score,
        live_load=payload.cognitive_load,
    )
    return FocusChatOut(reply=rules_reply, source="rules")
