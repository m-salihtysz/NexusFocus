"""
Saat bazli ogrenci odak ritmi: gecmis focus_sessions verisinden ozet + Turkce oneriler.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None  # type: ignore[misc,assignment]
MIN_SESSIONS_FOR_RHYTHM = 8
MIN_SAMPLES_PER_HOUR = 2
PEAK_AVG = 54
LOW_AVG = 44
LOW_SAMPLES = 3


def _ensure_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _tr_tz():
    """Istanbul; tzdata yoksa (Windows) UTC+3 sabit ofset."""
    if ZoneInfo is not None:
        try:
            return ZoneInfo("Europe/Istanbul")
        except Exception:
            pass
    return timezone(timedelta(hours=3), name="TR")


def _local_hour(dt: datetime) -> int:
    return int(_ensure_aware(dt).astimezone(_tr_tz()).hour)


def _format_hour_ranges(hours: list[int]) -> str:
    hs = sorted(set(hours))
    if not hs:
        return ""
    ranges: list[tuple[int, int]] = []
    start = prev = hs[0]
    for x in hs[1:]:
        if x == prev + 1:
            prev = x
        else:
            ranges.append((start, prev))
            start = prev = x
    ranges.append((start, prev))
    parts: list[str] = []
    for a, b in ranges:
        if a == b:
            parts.append(f"{a:02d}:00")
        else:
            parts.append(f"{a:02d}:00–{b:02d}:00")
    return " ve ".join(parts)


def build_student_rhythm(sessions: list[Any]) -> dict[str, Any]:
    """
    sessions: ORM FocusSession rows (created_at, hybrid_score), yalnizca ogrenci modulu filtrelidir.
    """
    total = len(sessions)
    if total < MIN_SESSIONS_FOR_RHYTHM:
        return {
            "total_sessions": total,
            "heatmap": _empty_heatmap(),
            "best_hours": [],
            "insights": [
                "Henüz yeterli oturum verisi yok. Birkaç gün düzenli çalıştıkça burada "
                "hangi saatlerde daha çok odaklandığını görebileceksin; şimdilik kısa "
                "Pomodoro bloklarıyla devam etmeni öneririm.",
            ],
        }

    by_hour: dict[int, list[int]] = defaultdict(list)
    for s in sessions:
        by_hour[_local_hour(s.created_at)].append(int(s.hybrid_score))

    avgs: dict[int, float] = {}
    counts: dict[int, int] = {}
    for h, vals in by_hour.items():
        counts[h] = len(vals)
        avgs[h] = round(sum(vals) / len(vals), 1)

    heatmap = []
    for h in range(24):
        if h in avgs:
            heatmap.append({"hour": h, "avg_hybrid": avgs[h], "count": counts[h]})
        else:
            heatmap.append({"hour": h, "avg_hybrid": None, "count": 0})

    peak_candidates = [
        (h, avgs[h], counts[h])
        for h in avgs
        if counts[h] >= MIN_SAMPLES_PER_HOUR and avgs[h] >= PEAK_AVG
    ]
    peak_candidates.sort(key=lambda x: -x[1])
    best_hours = [h for h, _, _ in peak_candidates[:4]]

    low_candidates = [
        (h, avgs[h], counts[h])
        for h in avgs
        if counts[h] >= LOW_SAMPLES and avgs[h] < LOW_AVG
    ]
    low_candidates.sort(key=lambda x: x[1])

    insights: list[str] = []

    if best_hours:
        label = _format_hour_ranges(best_hours)
        peak_avg = round(sum(avgs[h] for h in best_hours) / len(best_hours), 1)
        insights.append(
            f"Kayıtlarına göre {label} saatlerinde ortalama {peak_avg:.0f} civarında "
            f"çok odaklı çalışıyorsun; sınav ve ödev gibi ağır işleri bu zaman dilimine "
            f"planlaman verimini artırır."
        )
        morning = [h for h in best_hours if 5 <= h <= 11]
        evening = [h for h in best_hours if 18 <= h <= 23]
        if len(morning) >= 2:
            insights.append(
                "Sabah bandında güçlüsün; gece geç saatlere kaydırmadan önemli konuları "
                "öğlene kadar bitirmek uyku ritmini de korur."
            )
        elif len(evening) >= 2:
            insights.append(
                "Akşam saatlerinde performansın yükseliyor; gündüz hafif görevleri bitirip "
                "derin çalışmayı akşama bırakabilirsin."
            )

    if low_candidates:
        weak = low_candidates[:2]
        weak_label = _format_hour_ranges([h for h, _, _ in weak])
        insights.append(
            f"{weak_label} aralığında ortalaman düşüyor; bu saatlerde kısa mola, hafif tekrar "
            f"veya yürüyüş sonrası tekrar oturman daha iyi sonuç verir."
        )

    if not insights:
        insights.append(
            "Saatlik dağılımın oldukça dengeli görünüyor; haftanın benzer günlerinde aynı "
            "saatlerde çalışmaya devam etmek alışkanlığı pekiştirir."
        )

    return {
        "total_sessions": total,
        "heatmap": heatmap,
        "best_hours": sorted(best_hours),
        "insights": insights[:5],
    }


def _empty_heatmap() -> list[dict[str, Any]]:
    return [{"hour": h, "avg_hybrid": None, "count": 0} for h in range(24)]
