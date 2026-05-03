from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    google_sub = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    picture = Column(String, nullable=True)
    area = Column(String, nullable=True)
    package_id = Column(String, default="standart", nullable=False)
    is_paid = Column(Boolean, default=True, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    role = Column(String, default="user", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    last_logout_at = Column(DateTime(timezone=True), nullable=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)

    tenant = relationship("Tenant", back_populates="members", foreign_keys=[tenant_id])


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    panel_id = Column(String, unique=True, index=True, nullable=False)
    company_code = Column(String, nullable=False)
    employee_count = Column(Integer, default=1, nullable=False)
    package_id = Column(String, default="standart", nullable=False)
    is_paid = Column(Boolean, default=True, nullable=False)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    members = relationship("User", back_populates="tenant", foreign_keys=[User.tenant_id])
    # delete-orphan kaldirildi: ORM oturumunda koleksiyon yenilenince davetli e-postalar
    # yanlislikla silinmesin. Tenant satiri silinirse FK ile employees temizlenir.
    employees = relationship(
        "Employee",
        back_populates="tenant",
        cascade="save-update, merge",
        passive_deletes=True,
    )


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(
        Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    email = Column(String, nullable=False, index=True)
    role = Column(String, default="staff", nullable=False)
    status = Column(String, default="invited", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tenant = relationship("Tenant", back_populates="employees")


class FocusSession(Base):
    __tablename__ = "focus_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    module_id = Column(String, nullable=False)
    focus_score = Column(Integer, nullable=False)
    hybrid_score = Column(Integer, nullable=False)
    cognitive_load = Column(Integer, nullable=False)
    blink_rate = Column(Float, nullable=False)
    gaze_speed = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EnterpriseFocusSnapshot(Base):
    """
    Anonymized model for enterprise analytics.
    It intentionally stores no names, emails, or direct identifiers.
    """

    __tablename__ = "enterprise_focus_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, index=True, nullable=False)
    team_id = Column(Integer, index=True, nullable=False)
    focus_score = Column(Integer, nullable=False)
    cognitive_load = Column(Integer, nullable=False)
    blink_rate = Column(Float, nullable=False)
    gaze_speed = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
