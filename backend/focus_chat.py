"""
Odak verisi + kullanici sorusu icin kural tabanli sohbet yaniti (LLM yokken).
"""
from __future__ import annotations

from typing import Any

from backend.student_rhythm import MIN_SESSIONS_FOR_RHYTHM


def _fmt_hours(hours: list[int]) -> str:
    if not hours:
        return "henüz net bir tepe saati görünmüyor"
    hs = sorted(set(int(h) for h in hours))[:10]
    return ", ".join(f"{h:02d}:00" for h in hs)


def _heatmap_compact(heatmap: list[dict[str, Any]], top: int = 8) -> list[str]:
    rows = [h for h in heatmap if h.get("count")]
    rows.sort(key=lambda x: (-(x.get("avg_hybrid") or 0), -x.get("count", 0)))
    out: list[str] = []
    for h in rows[:top]:
        ah = h.get("avg_hybrid")
        if ah is not None:
            out.append(f"{int(h['hour']):02d}:00 → ort. {ah:.0f} ({h.get('count', 0)} örnek)")
    return out


def rule_based_focus_chat(
    message: str,
    rhythm: dict[str, Any],
    user_area: str,
    live_hybrid: int | None = None,
    live_load: int | None = None,
) -> str:
    m = (message or "").strip().lower()
    total = int(rhythm.get("total_sessions") or 0)
    best = list(rhythm.get("best_hours") or [])
    insights = list(rhythm.get("insights") or [])
    heatmap = list(rhythm.get("heatmap") or [])

    if any(x in m for x in ("merhaba", "selam", "hey", "günaydın", "iyi günler")):
        base = (
            "Merhaba! Odak ritmin, hangi saatlerde daha verimli olduğun veya mola planı "
            "hakkında soru sorabilirsin."
        )
        if total < MIN_SESSIONS_FOR_RHYTHM:
            return f"{base} Şu an kayıtlı oturum sayın az; birkaç gün çalıştıkça saatlik analiz netleşecek."
        return base

    if any(
        x in m
        for x in (
            "teşekkür",
            "tesekkur",
            "sağ ol",
            "sagol",
            "eyvallah",
            "eyv",
        )
    ):
        return "Rica ederim; bol verimli çalışmalar."

    if total < MIN_SESSIONS_FOR_RHYTHM:
        return (
            f"Şu an {total} oturum görünüyor; saatlik güvenilir özet için en az "
            f"{MIN_SESSIONS_FOR_RHYTHM} kayıt birikmesi iyi olur. "
            "NexusFocus’u açık tutup birkaç çalışma bloğu tamamladığında "
            "“hangi saatte daha odaklıyım” gibi sorulara daha net yanıt verebilirim."
        )

    time_q = any(
        k in m
        for k in (
            "saat",
            "ne zaman",
            "zaman",
            "günün",
            "gunduz",
            "gece",
            "sabah",
            "öğle",
            "ogle",
            "akşam",
            "aksam",
            "ritim",
            "tepe",
            "en iyi",
            "daha odak",
            "verim",
        )
    )
    weak_q = any(
        k in m
        for k in (
            "zayıf",
            "zayif",
            "düşük",
            "dusuk",
            "kötü",
            "kotu",
            "yorgun",
            "molam",
            "mola",
        )
    )

    if time_q and not weak_q:
        lines = [
            f"Kayıtlarına göre en güçlü göründüğün saatler: {_fmt_hours(best)}.",
        ]
        if insights:
            lines.append(insights[0])
        return " ".join(lines)

    if weak_q:
        tail = [x for x in insights if any(w in x.lower() for w in ("düşüyor", "dusuyor", "aralığında", "mola"))]
        if tail:
            return tail[0]
        if len(insights) > 1:
            return insights[1]
        return (
            "Belirgin bir “düşük performans” bandı henüz çıkmıyor; düzenli kayıt oldukça "
            "zayıf saat aralıklarını da özetleyebilirim. Şimdilik kısa molalar ve uyku "
            "düzeni genel olarak işe yarar."
        )

    if live_hybrid is not None and any(k in m for k in ("şu an", "su an", "anlık", "anlik", "şimdi", "simdi")):
        return (
            f"Canlı hibrit skorun yaklaşık {live_hybrid}. "
            f"Bilişsel yük {live_load if live_load is not None else '—'}. "
            "Bu değerler anlık sensör özetidir; gün içi trend için saatlik ritim sekmesine bak."
        )

    top_lines = _heatmap_compact(heatmap, top=5)
    if top_lines:
        joined = " ".join(insights[:2]) if insights else ""
        return (
            "Özet: " + joined + " "
            "Güçlü saat örnekleri — " + " | ".join(top_lines)
        ).strip()

    if insights:
        return " ".join(insights[:2])

    return (
        "Sorunu anladım; saatlik verilerin dengeli görünüyor. "
        "Daha net yanıt için örneğin “günün hangi saatinde daha odaklıyım?” diye sorabilirsin."
    )
