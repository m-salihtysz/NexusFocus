from __future__ import annotations

import secrets
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.auth import decode_access_token, get_current_user, get_db
from backend.models import Employee, FocusSession, Tenant, User
from backend.report_mail import (
    build_kurumsal_report_html,
    mail_configured,
    mail_transport,
    send_html_email,
)

router = APIRouter(prefix="/tenants", tags=["tenants"])

_REPORT_EMAIL_COOLDOWN_SEC = 60
_last_report_email_ts: dict[int, float] = {}


def _recipient_for_report_email(db: Session, tenant: Tenant) -> str:
    """Raporu her zaman sirketi kuran (owner) hesabinin e-postasina gonderir.
    Kullanici kim olursa olsun (owner veya staff), rapor sirket sahibine ulastirilir.
    """
    owner = db.query(User).filter(User.id == tenant.owner_user_id).first()
    if owner and owner.email:
        return owner.email.strip().lower()
    return ""


class TenantCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    company_code: str = Field(min_length=2, max_length=32)
    employee_count: int = Field(default=1, ge=1, le=10000)
    package_id: str = Field(default="standart")


class TenantUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    company_code: str | None = Field(default=None, min_length=2, max_length=32)
    employee_count: int | None = Field(default=None, ge=1, le=10000)
    package_id: str | None = None


class TenantOut(BaseModel):
    id: int
    name: str
    panel_id: str
    company_code: str
    employee_count: int
    package_id: str
    is_paid: bool
    owner_user_id: int | None


class EmployeeCreate(BaseModel):
    email: EmailStr
    role: str = Field(default="staff", pattern="^(owner|staff|viewer)$")


class EmployeeOut(BaseModel):
    id: int
    email: str
    role: str
    status: str
    created_at: datetime


class ReportEmailResponse(BaseModel):
    ok: bool = True
    sent_to: str


class ReportEmailStatusOut(BaseModel):
    """Rapor e-postasi icin sunucu yapilandirmasi (API anahtari donmez)."""

    ready: bool
    transport: str  # resend | smtp | none


class TenantMemberActivityOut(BaseModel):
    user_id: int
    email: str
    name: str | None
    role: str
    area: str | None
    last_login_at: datetime | None
    last_logout_at: datetime | None
    last_seen_at: datetime | None
    last_focus_at: datetime | None
    status: str
    status_label: str


class TenantMemberProductivityOut(BaseModel):
    user_id: int
    email: str
    name: str | None
    role: str
    employee_status: str | None = None
    last_login_at: datetime | None
    last_logout_at: datetime | None
    last_seen_at: datetime | None
    first_focus_at: datetime | None
    last_focus_at: datetime | None
    focus_session_count: int = 0
    focus_minutes_est: float | None = None
    avg_hybrid_score: float | None = None
    avg_cognitive_load: float | None = None
    productivity_label: str


class EmployeeAnalyticsOut(BaseModel):
    employee_id: int
    email: str
    role: str
    status: str
    linked_user_id: int | None = None
    session_count: int = 0
    avg_hybrid_score: float | None = None
    avg_cognitive_load: float | None = None
    first_session_at: datetime | None = None
    last_session_at: datetime | None = None
    estimated_work_minutes: float | None = Field(
        default=None,
        description="Ilk-son oturum araligi ile ~10 sn ornek sayisi; tavanli tahmini dk",
    )


# Istemci recordFocusSession ile ~10 sn aralik (App.jsx) — tahmini sure hesabi
_FOCUS_SESSION_TICK_SEC = 10.0


def _estimated_work_minutes(
    count: int,
    first_at: datetime | None,
    last_at: datetime | None,
) -> float | None:
    if count <= 0:
        return None
    tick_min = float(count) * (_FOCUS_SESSION_TICK_SEC / 60.0)
    if first_at is None or last_at is None:
        return round(tick_min, 1)
    span_sec = max(0.0, (last_at - first_at).total_seconds())
    span_min = span_sec / 60.0
    # Ayni dakikada cok ornek: span kucuk kalir; tick tabanini da dikkate al
    raw = max(span_min, tick_min)
    # Tek seferde asiri yuksek sayim (or. bot): makul tavan (ornek basina max 15 dk)
    cap = float(count) * 15.0
    return round(min(raw, cap), 1)


def _generate_panel_id(company_code: str) -> str:
    suffix = secrets.token_hex(3).upper()
    return f"ADM-{company_code.upper()}-{suffix}"


def _to_tenant_out(tenant: Tenant) -> TenantOut:
    return TenantOut(
        id=tenant.id,
        name=tenant.name,
        panel_id=tenant.panel_id,
        company_code=tenant.company_code,
        employee_count=tenant.employee_count,
        package_id=tenant.package_id,
        is_paid=True,
        owner_user_id=tenant.owner_user_id,
    )


def _require_tenant(db: Session, current_user: User) -> Tenant:
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found for current user",
        )
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


_ACTIVE_SEC = 600.0
_DAY_SEC = 86400.0


def _utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _within(now: datetime, dt: datetime | None, sec: float) -> bool:
    d = _utc(dt)
    if d is None:
        return False
    delta = (now - d).total_seconds()
    return 0.0 <= delta <= sec


def _member_activity_status(
    now: datetime,
    last_login: datetime | None,
    last_logout: datetime | None,
    last_seen: datetime | None,
    last_focus: datetime | None,
) -> tuple[str, str]:
    """(kod, turkce_aciklama) — cikis yalnizca /auth/logout ile yazilir; sekme kapatma kayitli degil."""
    if last_login is None:
        return ("no_login", "Kayitli giris zamani yok")
    li, lo = _utc(last_login), _utc(last_logout)
    if lo is not None and li is not None and lo >= li:
        return ("logged_out", "Uygulamadan cikis kaydedildi")
    if _within(now, last_seen, _ACTIVE_SEC):
        return ("active_panel", "Son 10 dk icinde panel acildi")
    if _within(now, last_focus, _ACTIVE_SEC):
        return ("active_focus", "Son 10 dk icinde odak verisi")
    if li is not None and (lo is None or li > lo):
        if _within(now, last_seen, _DAY_SEC) or _within(now, last_focus, _DAY_SEC):
            return ("recent", "Son 24 saatte aktivite")
        return ("stale", "Giris var; son aktivite 24 saati asti veya bilinmiyor")
    return ("unknown", "Durum belirlenemedi")


@router.post("", response_model=TenantOut, status_code=status.HTTP_201_CREATED)
def create_tenant(
    payload: TenantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TenantOut:
    if current_user.tenant_id:
        existing = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
        if existing:
            return _to_tenant_out(existing)

    tenant = Tenant(
        name=payload.name,
        panel_id=_generate_panel_id(payload.company_code),
        company_code=payload.company_code.upper(),
        employee_count=payload.employee_count,
        package_id=payload.package_id or "standart",
        is_paid=True,
        owner_user_id=current_user.id,
    )
    db.add(tenant)
    db.flush()

    current_user.tenant_id = tenant.id
    current_user.role = "owner"
    current_user.package_id = payload.package_id or "standart"
    current_user.is_paid = True

    owner_employee = Employee(
        tenant_id=tenant.id,
        email=(current_user.email or "").strip().lower(),
        role="owner",
        status="accepted",
    )
    db.add(owner_employee)

    db.commit()
    db.refresh(tenant)
    return _to_tenant_out(tenant)


@router.get("/me", response_model=TenantOut)
def get_my_tenant(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TenantOut:
    return _to_tenant_out(_require_tenant(db, current_user))


@router.patch("/me", response_model=TenantOut)
def update_my_tenant(
    payload: TenantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TenantOut:
    tenant = _require_tenant(db, current_user)
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can update tenant")

    if payload.name is not None:
        tenant.name = payload.name
    if payload.company_code is not None:
        tenant.company_code = payload.company_code.upper()
    if payload.employee_count is not None:
        tenant.employee_count = payload.employee_count
    if payload.package_id is not None:
        tenant.package_id = payload.package_id
        tenant.is_paid = True
        current_user.package_id = payload.package_id
        current_user.is_paid = True

    db.commit()
    db.refresh(tenant)
    return _to_tenant_out(tenant)


def compute_employee_analytics(db: Session, tenant: Tenant) -> list[EmployeeAnalyticsOut]:
    """Tenant calisanlari + focus_sessions ozeti (e-posta raporu ve GET endpoint icin ortak)."""
    employees = (
        db.query(Employee)
        .filter(Employee.tenant_id == tenant.id)
        .order_by(Employee.id.asc())
        .all()
    )
    results: list[EmployeeAnalyticsOut] = []
    for emp in employees:
        email_norm = (emp.email or "").strip().lower()
        linked = (
            db.query(User)
            .filter(User.tenant_id == tenant.id, func.lower(User.email) == email_norm)
            .first()
        )
        if not linked:
            results.append(
                EmployeeAnalyticsOut(
                    employee_id=emp.id,
                    email=emp.email,
                    role=emp.role,
                    status=emp.status,
                    linked_user_id=None,
                    session_count=0,
                    avg_hybrid_score=None,
                    avg_cognitive_load=None,
                    first_session_at=None,
                    last_session_at=None,
                    estimated_work_minutes=None,
                )
            )
            continue

        row = (
            db.query(
                func.count(FocusSession.id),
                func.avg(FocusSession.hybrid_score),
                func.avg(FocusSession.cognitive_load),
                func.min(FocusSession.created_at),
                func.max(FocusSession.created_at),
            )
            .filter(FocusSession.user_id == linked.id)
            .first()
        )
        cnt, avg_h, avg_c, first_at, last_at = row if row else (0, None, None, None, None)
        count = int(cnt or 0)
        est_min = _estimated_work_minutes(count, first_at, last_at)
        results.append(
            EmployeeAnalyticsOut(
                employee_id=emp.id,
                email=emp.email,
                role=emp.role,
                status=emp.status,
                linked_user_id=linked.id,
                session_count=count,
                avg_hybrid_score=float(avg_h) if avg_h is not None else None,
                avg_cognitive_load=float(avg_c) if avg_c is not None else None,
                first_session_at=first_at,
                last_session_at=last_at,
                estimated_work_minutes=est_min,
            )
        )
    return results


@router.get("/me/employees/analytics", response_model=list[EmployeeAnalyticsOut])
def list_employee_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[EmployeeAnalyticsOut]:
    """Calisan (Employee) kayitlari ile ayni e-postaya sahip kullanicinin odak oturumu ozeti."""
    tenant = _require_tenant(db, current_user)
    if current_user.role not in ("owner", "staff"):
        raise HTTPException(
            status_code=403,
            detail="Only owner or staff can view team analytics",
        )
    return compute_employee_analytics(db, tenant)


@router.get("/me/employees", response_model=list[EmployeeOut])
def list_tenant_employees(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[EmployeeOut]:
    """Tenant'a bagli calisan e-posta listesi (sadece owner gorebilir)."""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Sadece sirket sahibi calisan listesini gorebilir.")
    tenant = _require_tenant(db, current_user)
    employees = (
        db.query(Employee)
        .filter(Employee.tenant_id == tenant.id)
        .order_by(Employee.created_at.asc())
        .all()
    )
    return [
        EmployeeOut(
            id=emp.id,
            email=emp.email,
            role=emp.role,
            status=emp.status,
            created_at=emp.created_at or datetime.now(timezone.utc),
        )
        for emp in employees
    ]


def compute_tenant_member_activity(db: Session, tenant: Tenant) -> list[TenantMemberActivityOut]:
    """Tenant uyelerinin oturum / odak ozeti (API ve e-posta raporu ortak)."""
    members = (
        db.query(User)
        .filter(User.tenant_id == tenant.id)
        .order_by(User.email.asc())
        .all()
    )
    ids = [u.id for u in members]
    focus_map: dict[int, datetime] = {}
    if ids:
        rows = (
            db.query(FocusSession.user_id, func.max(FocusSession.created_at))
            .filter(FocusSession.user_id.in_(ids))
            .group_by(FocusSession.user_id)
            .all()
        )
        for uid, mx in rows:
            if uid is not None and mx is not None:
                focus_map[int(uid)] = mx
    now = datetime.now(timezone.utc)
    out: list[TenantMemberActivityOut] = []
    for u in members:
        lf = focus_map.get(u.id)
        code, label = _member_activity_status(
            now,
            u.last_login_at,
            u.last_logout_at,
            u.last_seen_at,
            lf,
        )
        out.append(
            TenantMemberActivityOut(
                user_id=u.id,
                email=u.email,
                name=u.name,
                role=u.role,
                area=u.area,
                last_login_at=u.last_login_at,
                last_logout_at=u.last_logout_at,
                last_seen_at=u.last_seen_at,
                last_focus_at=lf,
                status=code,
                status_label=label,
            )
        )
    return out


def _productivity_label(avg_hybrid_score: float | None, focus_minutes: float | None) -> str:
    if focus_minutes is None or focus_minutes <= 0:
        return "Veri yok"
    if avg_hybrid_score is None:
        return "Odak verisi var"
    if avg_hybrid_score >= 70:
        return "Yuksek verim"
    if avg_hybrid_score >= 45:
        return "Orta verim"
    return "Dusuk verim"


def compute_tenant_member_productivity(
    db: Session, tenant: Tenant
) -> list[TenantMemberProductivityOut]:
    """Tenant uyeleri icin giris/cikis + toplam odak + ortalama skor ozeti (panel ve rapor ortak)."""
    members = (
        db.query(User)
        .filter(User.tenant_id == tenant.id)
        .order_by(User.email.asc())
        .all()
    )
    ids = [u.id for u in members]

    # Employee status map (davet listesi) — e-posta bazli
    employees = (
        db.query(Employee)
        .filter(Employee.tenant_id == tenant.id)
        .order_by(Employee.id.asc())
        .all()
    )
    emp_status_by_email: dict[str, str] = {}
    for e in employees:
        key = (e.email or "").strip().lower()
        if key:
            emp_status_by_email[key] = e.status

    agg: dict[int, tuple[int, float | None, float | None, datetime | None, datetime | None]] = {}
    if ids:
        rows = (
            db.query(
                FocusSession.user_id,
                func.count(FocusSession.id),
                func.avg(FocusSession.hybrid_score),
                func.avg(FocusSession.cognitive_load),
                func.min(FocusSession.created_at),
                func.max(FocusSession.created_at),
            )
            .filter(FocusSession.user_id.in_(ids))
            .group_by(FocusSession.user_id)
            .all()
        )
        for uid, cnt, avg_h, avg_c, first_at, last_at in rows:
            if uid is None:
                continue
            agg[int(uid)] = (
                int(cnt or 0),
                float(avg_h) if avg_h is not None else None,
                float(avg_c) if avg_c is not None else None,
                first_at,
                last_at,
            )

    out: list[TenantMemberProductivityOut] = []
    for u in members:
        cnt, avg_h, avg_c, first_at, last_at = agg.get(u.id, (0, None, None, None, None))
        focus_minutes = round(float(cnt) * (_FOCUS_SESSION_TICK_SEC / 60.0), 1) if cnt > 0 else None
        out.append(
            TenantMemberProductivityOut(
                user_id=u.id,
                email=u.email,
                name=u.name,
                role=u.role,
                employee_status=emp_status_by_email.get((u.email or "").strip().lower()),
                last_login_at=u.last_login_at,
                last_logout_at=u.last_logout_at,
                last_seen_at=u.last_seen_at,
                first_focus_at=first_at,
                last_focus_at=last_at,
                focus_session_count=cnt,
                focus_minutes_est=focus_minutes,
                avg_hybrid_score=avg_h,
                avg_cognitive_load=avg_c,
                productivity_label=_productivity_label(avg_h, focus_minutes),
            )
        )
    return out


@router.get("/me/members/activity", response_model=list[TenantMemberActivityOut])
def list_tenant_members_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TenantMemberActivityOut]:
    """Tenant'a bagli kullanicilarin giris / cikis / son aktivite ozeti (sadece owner)."""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Bu veri sadece sirket sahibine aciktir.")
    tenant = _require_tenant(db, current_user)
    return compute_tenant_member_activity(db, tenant)


@router.get("/me/members/productivity", response_model=list[TenantMemberProductivityOut])
def list_tenant_members_productivity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TenantMemberProductivityOut]:
    """Calisanlarin giris/cikis + toplam odak + verim ozeti (sadece owner)."""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Bu veri sadece sirket sahibine aciktir.")
    tenant = _require_tenant(db, current_user)
    return compute_tenant_member_productivity(db, tenant)


@router.get("/me/report-email/status", response_model=ReportEmailStatusOut)
def report_email_status(
    current_user: User = Depends(get_current_user),
) -> ReportEmailStatusOut:
    """Sunucuda Resend API veya SMTP yapilandirildi mi (sadece owner)."""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Yetkiniz yok.")
    return ReportEmailStatusOut(ready=mail_configured(), transport=mail_transport())


@router.post(
    "/me/employees",
    response_model=EmployeeOut,
    status_code=status.HTTP_201_CREATED,
)
def add_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EmployeeOut:
    tenant = _require_tenant(db, current_user)
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can add employees")

    email_norm = str(payload.email).strip().lower()
    duplicate = (
        db.query(Employee)
        .filter(Employee.tenant_id == tenant.id, func.lower(Employee.email) == email_norm)
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Employee already exists")

    employee = Employee(
        tenant_id=tenant.id,
        email=email_norm,
        role=payload.role,
        status="invited",
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)

    return EmployeeOut(
        id=employee.id,
        email=employee.email,
        role=employee.role,
        status=employee.status,
        created_at=employee.created_at or datetime.now(timezone.utc),
    )


@router.delete("/me/employees/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    tenant = _require_tenant(db, current_user)
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can remove employees")

    employee = (
        db.query(Employee)
        .filter(Employee.id == employee_id, Employee.tenant_id == tenant.id)
        .first()
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    if employee.role == "owner":
        raise HTTPException(status_code=400, detail="Cannot remove owner")

    db.delete(employee)
    db.commit()


@router.post("/me/report-email", response_model=ReportEmailResponse)
def send_tenant_report_email(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    authorization: Optional[str] = Header(default=None),
) -> ReportEmailResponse:
    """Kurumsal calisan listesi ve analiz tablolarini HTML e-posta olarak gonderir.

    Alici her zaman oturumdaki yonetici hesabinin e-postasidir (Google ile giris adresi);
    istemci baska bir adrese yonlendiremez.
    """
    """Sirket raporunu kurucu (owner) e-postasina gonderir (sadece owner tetikleyebilir)."""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Sadece sirket sahibi rapor isteyebilir.")
    tenant = _require_tenant(db, current_user)
    if not mail_configured():
        raise HTTPException(
            status_code=503,
            detail=(
                "E-posta gonderimi yapilandirilmamis. "
                "Secenek A: NEXUSFOCUS_RESEND_API_KEY (Resend, https://resend.com). "
                "Secenek B: NEXUSFOCUS_SMTP_HOST ve SMTP kullanici/sifre. "
                "Backend .env dosyasina ekleyip sunucuyu yeniden baslatin."
            ),
        )
    to_addr = _recipient_for_report_email(db, tenant)
    if not to_addr:
        raise HTTPException(
            status_code=400,
            detail="Sirket sahibi (owner) e-postasi bulunamadi; rapor gonderilemez.",
        )

    now = time.time()
    last = _last_report_email_ts.get(current_user.id, 0.0)
    if now - last < _REPORT_EMAIL_COOLDOWN_SEC:
        raise HTTPException(
            status_code=429,
            detail=f"Rapor cok sik gonderiliyor; {_REPORT_EMAIL_COOLDOWN_SEC} saniye bekleyin.",
        )

    employees = (
        db.query(Employee)
        .filter(Employee.tenant_id == tenant.id)
        .order_by(Employee.created_at.asc())
        .all()
    )
    emp_out = [
        EmployeeOut(
            id=emp.id,
            email=emp.email,
            role=emp.role,
            status=emp.status,
            created_at=emp.created_at or datetime.now(timezone.utc),
        )
        for emp in employees
    ]
    analytics = compute_employee_analytics(db, tenant)
    activity = compute_tenant_member_activity(db, tenant)
    productivity = compute_tenant_member_productivity(db, tenant)
    html = build_kurumsal_report_html(
        tenant_name=tenant.name,
        panel_id=tenant.panel_id,
        company_code=tenant.company_code,
        employee_count=tenant.employee_count,
        employees=[e.model_dump(mode="json") for e in emp_out],
        analytics=[a.model_dump(mode="json") for a in analytics],
        member_activity=[m.model_dump(mode="json") for m in activity],
        member_productivity=[p.model_dump(mode="json") for p in productivity],
    )
    subject = f"NexusFocus kurumsal rapor - {tenant.name}"
    try:
        send_html_email(to_addr, subject, html)
    except Exception as exc:
        msg = str(exc)
        if len(msg) > 400:
            msg = msg[:400] + "..."
        raise HTTPException(
            status_code=502,
            detail=f"E-posta gonderilemedi: {msg}",
        ) from exc

    _last_report_email_ts[current_user.id] = now
    return ReportEmailResponse(sent_to=to_addr)
