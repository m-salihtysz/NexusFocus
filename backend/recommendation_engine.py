from __future__ import annotations

from typing import Any, Optional


def _minute_window_lines(mw: dict[str, Any], module: str) -> list[str]:
    if not isinstance(mw, dict) or mw.get("insufficient"):
        return []
    if int(mw.get("samples") or 0) < 10:
        return []
    out: list[str] = []
    if mw.get("trend") == "down":
        out.append(
            "AI Onersi: Son ~60 sn'de hibrit skor dusus egiliminde; tek gorevi netlestir, "
            "bildirimleri kapat."
        )
    elif mw.get("trend") == "up":
        out.append(
            "AI Onersi: Son ~60 sn'de skor toparlaniyor; bu ritmi korumak icin dikkat "
            "dagiticiyi geri ekleme."
        )
    lp = mw.get("load_peak")
    if isinstance(lp, (int, float)) and lp > 78:
        out.append(
            "AI Onersi: Son dakikada bilissel yuk zirve yapti; gorevi 10-15 dk parcalara bol."
        )
    cm = mw.get("chaos_max")
    if isinstance(cm, (int, float)) and cm > 62:
        out.append(
            "AI Onersi: Imlek hareketleri son dakikada sik sik zipladi; tek pencere ve kapali sekme."
        )
    lf = mw.get("low_fraction")
    if isinstance(lf, (int, float)) and float(lf) >= 0.42:
        out.append(
            "AI Onersi: Son dakikada dusuk skorlu anlar fazla; 2 dk goz molasi + su ic."
        )
    fd = mw.get("fatigue_delta")
    if module == "ogrenci" and isinstance(fd, (int, float)) and int(fd) > 12:
        out.append("AI Onersi: Yorgunluk sinyali artiyor; 20-20-20 ve kisa esneme.")
    if module == "kurumsal" and isinstance(fd, (int, float)) and int(fd) > 12:
        out.append("AI Onersi: Yorgunluk egilimi yukseliyor; durusu duzelt, 1 dk omuz gevset.")
    return out[:2]


class RecommendationEngine:
    """
    Produces actionable recommendations for the admin panel.
    """

    def suggest(
        self,
        module_id: str,
        focus_score: int,
        cognitive_load: int,
        blink_rate: float,
        gaze_speed: float,
        posture_shift: int = 0,
        cursor_chaos: int = 0,
        expressions: dict | None = None,
        minute_window: Optional[dict[str, Any]] = None,
    ) -> list[str]:
        advice: list[str] = []
        module = module_id.lower()
        expr = expressions or {}
        fatigue = int(expr.get("expression_fatigue", 0))
        stress = int(expr.get("expression_stress", 0))
        distraction = int(expr.get("expression_distraction", 0))
        positivity = int(expr.get("expression_positivity", 0))

        if stress > 60:
            advice.append(
                "AI Onersi: Yuz ifaden gergin gorunuyor, 4-7-8 nefes teknigi ile rahatla."
            )
        if fatigue > 65:
            advice.append(
                "AI Onersi: Goz cevresi yorgun, 20-20-20 kuralini uygula ve isigi kontrol et."
            )
        if distraction > 60:
            advice.append(
                "AI Onersi: Mimiklerin dikkat dagilimina isaret ediyor, kapali sekme/bildirim sayisini azalt."
            )
        if positivity > 55:
            advice.append(
                "AI Onersi: Pozitif ruh hali yakaland\u0131, en yuksek oncelikli isi simdi tamamla."
            )

        if module == "kurumsal":
            if posture_shift > 60:
                advice.append(
                    "AI Onersi: Omuz-boyun gerginligi artmis, 1 dakikalik esneme molasi planla."
                )
            if blink_rate > 0.45:
                advice.append(
                    "AI Onersi: Ekipte yorgunluk sinyali var, toplantilari 25 dakikaya bol."
                )
            if focus_score < 60:
                advice.append(
                    "AI Onersi: Is dagilimini sadeleştir, tek gorevli sprint modeli uygula."
                )
            else:
                advice.append(
                    "AI Onersi: Kurumsal odak dengeli, mevcut ritmi korurken mikro molalari surdur."
                )
            if cognitive_load > 70:
                advice.append(
                    "AI Onersi: Bilissel yuk yuksek, baglam degisimini azalt ve bildirimleri kisitla."
                )
            advice.extend(_minute_window_lines(minute_window or {}, module))
            return advice[:6]

        if module == "ogrenci":
            if focus_score < 50:
                advice.append(
                    "AI Onersi: Kafan sik sapti, 20 dakikalik pomodoro ve 5 dakikalik mola uygula."
                )
            if cognitive_load > 75:
                advice.append(
                    "AI Onersi: Konuyu daha kucuk parcalara bol ve her parcayi ozetleyerek ilerle."
                )
            if gaze_speed > 0.70:
                advice.append(
                    "AI Onersi: Okuma stabilitesi dusuyor, satir takip teknigi veya not alma dene."
                )
            if blink_rate < 0.12:
                advice.append(
                    "AI Onersi: Goz yorgunlugu riski var, 20-20-20 kuralini uygula."
                )
            if not advice:
                advice.append(
                    "AI Onersi: Ogrenci modu stabil, mevcut tempo ve not cikarma duzeniyle devam et."
                )
            advice.extend(_minute_window_lines(minute_window or {}, module))
            return advice[:6]

        if focus_score < 45:
            advice.append("AI Onersi: 5 dakikalik toparlama molasi ver ve dikkati dagitanlari kapat.")
        elif focus_score < 70:
            advice.append("AI Onersi: 20 dakika odak + 5 dakika mola dongusune gec.")
        else:
            advice.append("AI Onersi: Odak duzeyi saglikli, mevcut calisma akisini koru.")

        if cognitive_load > 75:
            advice.append("AI Onersi: Bilissel yuk yuksek, gorevi alt parcalara bol.")
        elif cognitive_load > 55:
            advice.append("AI Onersi: 15 dakika baglam degistirmeden tek gorevde kal.")

        if blink_rate < 0.12:
            advice.append("AI Onersi: Dusuk kirpma hizi goz zorlanmasina isaret ediyor, kisa mola ver.")
        elif blink_rate > 0.45:
            advice.append("AI Onersi: Yuksek kirpma yorgunluk gostergesi olabilir, su ic ve reset at.")

        if gaze_speed > 0.70:
            advice.append("AI Onersi: Bakis hizi yuksek, paralel bildirimleri azalt.")
        if cursor_chaos > 65:
            advice.append("AI Onersi: Imlec hareketleri daginik, tek pencereye inerek calis.")

        advice.extend(_minute_window_lines(minute_window or {}, module))
        return advice[:6]
