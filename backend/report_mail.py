"""Kurumsal panel HTML e-posta raporu.

Gonderim: (1) NEXUSFOCUS_RESEND_API_KEY varsa Resend HTTPS API,
          (2) degilse NEXUSFOCUS_SMTP_HOST ile SMTP.
"""

from __future__ import annotations

import os
import smtplib
import ssl
from email.message import EmailMessage
from html import escape

import requests

_RESEND_URL = "https://api.resend.com/emails"


def _resend_api_key() -> str:
    return (os.getenv("NEXUSFOCUS_RESEND_API_KEY") or os.getenv("RESEND_API_KEY") or "").strip()


def smtp_host_configured() -> bool:
    return bool(_smtp_host())


def mail_configured() -> bool:
    """Resend API anahtari veya SMTP sunucusu tanimli mi."""
    return bool(_resend_api_key()) or smtp_host_configured()


def mail_transport() -> str:
    if _resend_api_key():
        return "resend"
    if smtp_host_configured():
        return "smtp"
    return "none"


def smtp_configured() -> bool:
    """Geriye donuk: artik mail_configured() kullanin."""
    return mail_configured()


def _smtp_host() -> str:
    return (os.getenv("NEXUSFOCUS_SMTP_HOST") or os.getenv("SMTP_HOST") or "").strip()


def _smtp_settings() -> tuple[str, int, str, str, str, bool]:
    host = _smtp_host()
    port = int(os.getenv("NEXUSFOCUS_SMTP_PORT") or os.getenv("SMTP_PORT") or "587")
    user = (os.getenv("NEXUSFOCUS_SMTP_USER") or os.getenv("SMTP_USER") or "").strip()
    password = os.getenv("NEXUSFOCUS_SMTP_PASSWORD") or os.getenv("SMTP_PASSWORD") or ""
    mail_from = (
        os.getenv("NEXUSFOCUS_SMTP_FROM") or os.getenv("MAIL_FROM") or user or ""
    ).strip()
    raw_tls = (os.getenv("NEXUSFOCUS_SMTP_USE_TLS") or "true").lower()
    use_tls = raw_tls not in ("0", "false", "no", "off")
    return host, port, user, password, mail_from, use_tls


def _normalize_subject(subject: str) -> str:
    return subject.replace("\u2014", "-").replace("\u2013", "-")


def _resolve_from_resend(mail_from: str | None) -> str:
    explicit = (mail_from or "").strip()
    if explicit:
        return explicit
    for key in (
        "NEXUSFOCUS_MAIL_FROM",
        "NEXUSFOCUS_SMTP_FROM",
        "MAIL_FROM",
    ):
        v = (os.getenv(key) or "").strip()
        if v:
            return v
    return "NexusFocus <onboarding@resend.dev>"


def _send_via_resend(to_addr: str, subject: str, html_body: str, mail_from: str | None) -> None:
    key = _resend_api_key()
    if not key:
        raise RuntimeError("Resend API anahtari yok.")
    frm = _resolve_from_resend(mail_from)
    resp = requests.post(
        _RESEND_URL,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={
            "from": frm,
            "to": [to_addr],
            "subject": subject,
            "html": html_body,
        },
        timeout=45,
    )
    if resp.status_code >= 400:
        try:
            body = resp.json()
            msg = body.get("message") if isinstance(body, dict) else str(body)
        except Exception:
            msg = (resp.text or resp.reason or "").strip() or "Bilinmeyen hata"
        raise RuntimeError(f"Resend {resp.status_code}: {msg}") from None


def _send_via_smtp(to_addr: str, subject: str, html_body: str, mail_from: str | None) -> None:
    host, port, user, password, default_from, use_tls = _smtp_settings()
    if not host:
        raise RuntimeError("SMTP yapilandirilmamis (NEXUSFOCUS_SMTP_HOST bos).")
    sender = (mail_from or default_from or user).strip()
    if not sender:
        raise RuntimeError("Gonderen adresi yok (NEXUSFOCUS_SMTP_FROM veya SMTP_USER).")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to_addr
    msg.set_content(
        "Bu mesaj HTML formatindadir; lutfen HTML destekleyen bir posta istemcisi kullanin.",
        subtype="plain",
        charset="utf-8",
    )
    msg.add_alternative(html_body, subtype="html", charset="utf-8")

    context = ssl.create_default_context()
    if port == 465:
        with smtplib.SMTP_SSL(host, port, context=context, timeout=30) as server:
            if user:
                server.login(user, password)
            server.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=30) as server:
            server.ehlo()
            if use_tls:
                server.starttls(context=context)
                server.ehlo()
            if user:
                server.login(user, password)
            server.send_message(msg)


def send_html_email(to_addr: str, subject: str, html_body: str, mail_from: str | None = None) -> None:
    safe_subject = _normalize_subject(subject)
    if _resend_api_key():
        _send_via_resend(to_addr, safe_subject, html_body, mail_from)
        return
    _send_via_smtp(to_addr, safe_subject, html_body, mail_from)


def _status_tr(status: str) -> str:
    s = (status or "").strip()
    if s == "invited":
        return "Davet gonderildi"
    if s == "accepted":
        return "Giris uygun"
    return s or "—"


def _format_work_minutes(m: float | int | None) -> str:
    if m is None:
        return "—"
    try:
        x = float(m)
    except (TypeError, ValueError):
        return "—"
    if x <= 0:
        return "—"
    if x < 1:
        return "< 1 dk"
    if x >= 120:
        return f"{(x / 60.0):.1f} sa"
    return f"{x:.1f} dk"


def _h(v: object | None) -> str:
    if v is None:
        return "—"
    return escape(str(v))


def build_kurumsal_report_html(
    *,
    tenant_name: str,
    panel_id: str,
    company_code: str,
    employee_count: int,
    employees: list[dict],
    analytics: list[dict],
    member_activity: list[dict] | None = None,
    member_productivity: list[dict] | None = None,
) -> str:
    th = 'style="padding:8px;border:1px solid #334155;background:#0f172a;color:#94a3b8;font-size:12px;text-align:left"'
    td = 'style="padding:8px;border:1px solid #1e293b;font-size:12px;color:#e2e8f0"'
    tdr = 'style="padding:8px;border:1px solid #1e293b;font-size:12px;color:#e2e8f0;text-align:right"'
    intro = (
        f"<p style='margin:0 0 16px;color:#cbd5e1;font-size:14px'>"
        f"<strong style='color:#f8fafc'>{escape(tenant_name)}</strong> kurumsal ozeti. "
        f"Panel ID: <code style='color:#22d3ee'>{escape(panel_id)}</code>, "
        f"sirket kodu: <code>{escape(company_code)}</code>, "
        f"planlanan calisan sayisi: {employee_count}."
        f"</p>"
    )

    emp_rows = []
    for e in employees:
        emp_rows.append(
            "<tr>"
            f"<td {td}>{_h(e.get('email'))}</td>"
            f"<td {td}>{_h(e.get('role'))}</td>"
            f"<td {td}>{_h(_status_tr(str(e.get('status') or '')))}</td>"
            f"<td {td}>{_h(e.get('created_at'))}</td>"
            "</tr>"
        )
    emp_table = (
        "<table style='border-collapse:collapse;width:100%;max-width:900px;margin-bottom:24px'>"
        "<caption style='caption-side:top;text-align:left;padding:0 0 8px;color:#f1f5f9;font-weight:600'>"
        "Calisan listesi</caption>"
        "<thead><tr>"
        f"<th {th}>E-posta</th><th {th}>Rol</th><th {th}>Durum</th><th {th}>Olusturulma</th>"
        "</tr></thead><tbody>"
        + ("".join(emp_rows) if emp_rows else f"<tr><td colspan='4' {td}>Kayit yok.</td></tr>")
        + "</tbody></table>"
    )

    member_block = ""
    if member_activity:
        m_rows = []
        for m in member_activity:
            m_rows.append(
                "<tr>"
                f"<td {td}>{_h(m.get('user_id'))}</td>"
                f"<td {td}>{_h(m.get('email'))}</td>"
                f"<td {td}>{_h(m.get('role'))}</td>"
                f"<td {td}>{_h(m.get('last_login_at'))}</td>"
                f"<td {td}>{_h(m.get('last_logout_at'))}</td>"
                f"<td {td}>{_h(m.get('last_seen_at'))}</td>"
                f"<td {td}>{_h(m.get('last_focus_at'))}</td>"
                f"<td {td}>{_h(m.get('status_label'))}</td>"
                "</tr>"
            )
        member_block = (
            "<table style='border-collapse:collapse;width:100%;max-width:1000px;margin-bottom:24px'>"
            "<caption style='caption-side:top;text-align:left;padding:0 0 8px;color:#f1f5f9;font-weight:600'>"
            "Tenant kullanicilari (oturum ozeti)</caption>"
            "<thead><tr>"
            f"<th {th}>Kullanici ID</th><th {th}>E-posta</th><th {th}>Rol</th>"
            f"<th {th}>Son giris</th><th {th}>Son cikis</th><th {th}>Son panel</th>"
            f"<th {th}>Son odak</th><th {th}>Durum</th>"
            "</tr></thead><tbody>"
            + "".join(m_rows)
            + "</tbody></table>"
        )

    prod_block = ""
    if member_productivity:
        p_rows = []
        for p in member_productivity:
            p_rows.append(
                "<tr>"
                f"<td {td}>{_h(p.get('user_id'))}</td>"
                f"<td {td}>{_h(p.get('email'))}</td>"
                f"<td {td}>{_h(p.get('role'))}</td>"
                f"<td {td}>{_h(p.get('last_login_at'))}</td>"
                f"<td {td}>{_h(p.get('last_logout_at'))}</td>"
                f"<td {td}>{_h(p.get('last_focus_at'))}</td>"
                f"<td {tdr}>{_h(p.get('focus_session_count'))}</td>"
                f"<td {tdr}>{_h(p.get('focus_minutes_est'))}</td>"
                f"<td {tdr}>{_h(p.get('avg_hybrid_score'))}</td>"
                f"<td {td}>{_h(p.get('productivity_label'))}</td>"
                "</tr>"
            )
        prod_block = (
            "<table style='border-collapse:collapse;width:100%;max-width:1100px;margin-bottom:24px'>"
            "<caption style='caption-side:top;text-align:left;padding:0 0 8px;color:#f1f5f9;font-weight:600'>"
            "Calisan verimlilik ozeti</caption>"
            "<thead><tr>"
            f"<th {th}>Kullanici ID</th><th {th}>E-posta</th><th {th}>Rol</th>"
            f"<th {th}>Son giris</th><th {th}>Son cikis</th><th {th}>Son odak</th>"
            f"<th {th} style='text-align:right'>Oturum</th>"
            f"<th {th} style='text-align:right'>Odak dk (tahmini)</th>"
            f"<th {th} style='text-align:right'>Ort. odak</th>"
            f"<th {th}>Etiket</th>"
            "</tr></thead><tbody>"
            + "".join(p_rows)
            + "</tbody></table>"
        )

    ana_rows = []
    for a in analytics:
        last_at = a.get("last_session_at")
        last_str = "—" if last_at in (None, "") else _h(last_at)
        est = _format_work_minutes(a.get("estimated_work_minutes"))
        avg_h = a.get("avg_hybrid_score")
        avg_c = a.get("avg_cognitive_load")
        avg_h_s = f"{float(avg_h):.1f}" if avg_h is not None else "—"
        avg_c_s = f"{float(avg_c):.1f}" if avg_c is not None else "—"
        lid = a.get("linked_user_id")
        lid_s = "—" if lid is None else _h(lid)
        ana_rows.append(
            "<tr>"
            f"<td {td}>{_h(a.get('employee_id'))}</td>"
            f"<td {td}>{_h(a.get('email'))}</td>"
            f"<td {td}>{lid_s}</td>"
            f"<td {td}>{_h(a.get('role'))}</td>"
            f"<td {td}>{_h(_status_tr(str(a.get('status') or '')))}</td>"
            f"<td {tdr}>{_h(a.get('session_count'))}</td>"
            f"<td {tdr}>{escape(est)}</td>"
            f"<td {tdr}>{escape(avg_h_s)}</td>"
            f"<td {tdr}>{escape(avg_c_s)}</td>"
            f"<td {td}>{last_str}</td>"
            "</tr>"
        )
    ana_table = (
        "<table style='border-collapse:collapse;width:100%;max-width:1100px;margin-bottom:16px'>"
        "<caption style='caption-side:top;text-align:left;padding:0 0 8px;color:#f1f5f9;font-weight:600'>"
        "Calisan odak / oturum analizi</caption>"
        "<thead><tr>"
        f"<th {th}>Calisan ID</th><th {th}>E-posta</th><th {th}>Kullanici ID</th>"
        f"<th {th}>Rol</th><th {th}>Durum</th><th {th} style='text-align:right'>Oturum</th>"
        f"<th {th} style='text-align:right'>Tahmini calisma</th>"
        f"<th {th} style='text-align:right'>Ort. odak</th><th {th} style='text-align:right'>Ort. bil. yuk</th>"
        f"<th {th}>Son veri</th>"
        "</tr></thead><tbody>"
        + ("".join(ana_rows) if ana_rows else f"<tr><td colspan='10' {td}>Kayit yok.</td></tr>")
        + "</tbody></table>"
    )

    foot = (
        "<p style='margin:16px 0 0;font-size:11px;color:#64748b'>"
        "Panelde gosterilen sanal ornek (demo) satirlari bu rapora dahil degildir; "
        "yalnizca veritabanindaki gercek kayitlar yer alir."
        "</p>"
    )

    return (
        "<!DOCTYPE html><html><head><meta charset='utf-8'></head>"
        "<body style='margin:16px;font-family:system-ui,-apple-system,sans-serif;background:#020617'>"
        f"<div style='max-width:1100px'>{intro}{emp_table}{member_block}{prod_block}{ana_table}{foot}</div>"
        "</body></html>"
    )
