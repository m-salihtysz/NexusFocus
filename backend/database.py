from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./nexusfocus.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_sqlite_user_activity_columns() -> None:
    """Mevcut SQLite DB: users tablosuna oturum kolonlari (create_all yeni kolon eklemez)."""
    if "sqlite" not in str(engine.url).lower():
        return
    insp = inspect(engine)
    if "users" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("users")}
    with engine.begin() as conn:
        if "last_logout_at" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_logout_at DATETIME"))
        if "last_seen_at" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_seen_at DATETIME"))
