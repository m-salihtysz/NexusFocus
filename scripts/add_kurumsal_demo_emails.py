#!/usr/bin/env python3
"""
Kurumsal tenant'a ekstra calisan e-postalari ekler (employees tablosu).

Kullanim (proje kokunden):
  python scripts/add_kurumsal_demo_emails.py
  python scripts/add_kurumsal_demo_emails.py --tenant-id 1
  python scripts/add_kurumsal_demo_emails.py --emails "a@x.com,b@y.com"

Varsayilan: ilk tenant (id sirali) ve ornek example.com adresleri.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import func  # noqa: E402

from backend.database import SessionLocal  # noqa: E402
from backend.models import Employee, Tenant  # noqa: E402

DEFAULT_EMAILS = [
    "kurumsal.demo.calisan1@example.com",
    "kurumsal.demo.calisan2@example.com",
    "kurumsal.demo.calisan3@example.com",
]


def main() -> None:
    parser = argparse.ArgumentParser(description="Kurumsal employees tablosuna e-posta ekler.")
    parser.add_argument(
        "--tenant-id",
        type=int,
        default=None,
        help="Hedef tenant id; verilmezse en kucuk id'li tenant kullanilir.",
    )
    parser.add_argument(
        "--emails",
        type=str,
        default=None,
        help="Virgulle ayrilmis e-posta listesi; yoksa varsayilan demo adresleri.",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        tenant_id = args.tenant_id
        if tenant_id is None:
            t = db.query(Tenant).order_by(Tenant.id.asc()).first()
            if not t:
                print("Hata: Veritabaninda tenant yok. Once admin ile tenant olusturun.")
                sys.exit(1)
            tenant_id = t.id
            print(f"Tenant secildi: id={tenant_id} panel_id={t.panel_id} name={t.name!r}")
        else:
            t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
            if not t:
                print(f"Hata: tenant_id={tenant_id} bulunamadi.")
                sys.exit(1)
            print(f"Tenant: id={tenant_id} panel_id={t.panel_id}")

        emails = (
            [e.strip().lower() for e in args.emails.split(",") if e.strip()]
            if args.emails
            else DEFAULT_EMAILS
        )

        added = 0
        skipped = 0
        for raw in emails:
            email_norm = raw.strip().lower()
            exists = (
                db.query(Employee)
                .filter(Employee.tenant_id == tenant_id, func.lower(Employee.email) == email_norm)
                .first()
            )
            if exists:
                print(f"  Atlandi (zaten var): {email_norm}")
                skipped += 1
                continue
            db.add(
                Employee(
                    tenant_id=tenant_id,
                    email=email_norm,
                    role="staff",
                    status="invited",
                )
            )
            added += 1
            print(f"  Eklendi: {email_norm} (staff, invited)")

        db.commit()
        print(f"Bitti: {added} yeni kayit, {skipped} atlandi.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
