from __future__ import annotations

from dataclasses import dataclass

from core.focus_tracker import FocusMetrics, FocusTracker


@dataclass
class MouseMetrics:
    speed: float = 0.0
    chaos: float = 0.0
    idle_ms: float = 0.0
    freeze_ratio: float = 0.0


@dataclass
class ScreenMetrics:
    is_visible: bool = True
    visible_ratio: float = 1.0
    away_count: int = 0
    away_streak_ms: float = 0.0
    site_switch_count: int = 0
    site_path: str = ""


@dataclass
class ExpressionMetrics:
    fatigue: float = 0.0
    stress: float = 0.0
    distraction: float = 0.0
    positivity: float = 0.0
    surprise: float = 0.0
    dominant: str = "neutral"


@dataclass
class HybridSignals:
    gaze_deviation: int
    posture_shift: int
    cursor_chaos: int
    cognitive_freeze: int
    emotional_reaction: int
    expression_fatigue: int = 0
    expression_stress: int = 0
    expression_distraction: int = 0
    expression_positivity: int = 0
    dominant_expression: str = "neutral"
    screen_focus: int = 100
    screen_away_count: int = 0
    screen_away_streak_sec: int = 0
    site_switch_count: int = 0


class HybridFocusScorer:
    """
    Module-aware focus scorer combining camera and cursor telemetry,
    enriched with MediaPipe Face Mesh blendshape expressions.
    """

    MODULE_CONFIG = {
        "kurumsal": {
            "primary_tracking": "Kafa + Goz Kirpma",
            "indicator": "Ergonomi ve Yorgunluk",
            "weights": {
                "focus": 0.30,
                "gaze_deviation": 0.15,
                "posture_shift": 0.30,
                "cursor_chaos": 0.05,
                "cognitive_freeze": 0.05,
                "emotional_reaction": 0.15,
            },
        },
        "ogrenci": {
            "primary_tracking": "Kafa + Goz (Okuma)",
            "indicator": "Anlama ve Sabitlik",
            "weights": {
                "focus": 0.35,
                "gaze_deviation": 0.30,
                "posture_shift": 0.15,
                "cursor_chaos": 0.05,
                "cognitive_freeze": 0.10,
                "emotional_reaction": 0.05,
            },
        },
        "freelance": {
            "primary_tracking": "Fare + Kafa",
            "indicator": "Akis (Flow) ve Verim",
            "weights": {
                "focus": 0.25,
                "gaze_deviation": 0.10,
                "posture_shift": 0.15,
                "cursor_chaos": 0.30,
                "cognitive_freeze": 0.15,
                "emotional_reaction": 0.05,
            },
        },
    }

    def score(
        self,
        module_id: str,
        focus_score: int,
        metrics: FocusMetrics,
        mouse: MouseMetrics,
        tracker: FocusTracker,
        expressions: ExpressionMetrics | None = None,
        screen: ScreenMetrics | None = None,
    ) -> tuple[int, HybridSignals, dict[str, str], str]:
        module_key = module_id if module_id in self.MODULE_CONFIG else "ogrenci"
        config = self.MODULE_CONFIG[module_key]
        expr = expressions or ExpressionMetrics()
        scr = screen or ScreenMetrics()
        signals = self._build_signals(
            metrics=metrics, mouse=mouse, tracker=tracker, expr=expr, screen=scr
        )
        weights = config["weights"]

        weighted = (
            focus_score * weights["focus"]
            + (100 - signals.gaze_deviation) * weights["gaze_deviation"]
            + (100 - signals.posture_shift) * weights["posture_shift"]
            + (100 - signals.cursor_chaos) * weights["cursor_chaos"]
            + (100 - signals.cognitive_freeze) * weights["cognitive_freeze"]
            + (100 - signals.emotional_reaction) * weights["emotional_reaction"]
        )
        weighted += signals.expression_positivity * 0.05
        weighted *= 0.5 + signals.screen_focus / 200.0
        hybrid_score = max(0, min(100, int(round(weighted))))

        return (
            hybrid_score,
            signals,
            {
                "primary_tracking_type": config["primary_tracking"],
                "focus_indicator": config["indicator"],
            },
            self._feedback(module_key, signals),
        )

    def _build_signals(
        self,
        metrics: FocusMetrics,
        mouse: MouseMetrics,
        tracker: FocusTracker,
        expr: ExpressionMetrics,
        screen: ScreenMetrics,
    ) -> HybridSignals:
        gaze_ok = tracker.check_gaze_direction(metrics.gaze_x, metrics.gaze_y)
        gaze_deviation = 18 if gaze_ok else 72
        gaze_deviation = int(min(100, gaze_deviation + expr.distraction * 25))

        posture_shift = int(
            min(
                100.0,
                abs(metrics.head_pitch) * 1.1
                + abs(metrics.head_yaw) * 1.1
                + abs(metrics.head_roll) * 0.7,
            )
        )
        cursor_chaos = int(min(100.0, mouse.chaos * 100.0))
        freeze_from_idle = min(100.0, max(0.0, (mouse.idle_ms - 1200.0) / 30.0))
        freeze_from_ratio = min(100.0, mouse.freeze_ratio * 100.0)
        cognitive_freeze = int(max(freeze_from_idle, freeze_from_ratio))

        # Emotional reaction now blends blink anomaly with real Face Mesh expressions
        blink_anomaly = abs(metrics.blink_rate - 0.24) * 220.0
        head_motion = abs(metrics.head_roll) * 0.6
        expression_load = (expr.fatigue * 60.0) + (expr.stress * 60.0)
        emotional_reaction = int(
            min(100.0, blink_anomaly * 0.4 + head_motion + expression_load)
        )

        screen_focus = int(round(max(0.0, min(1.0, screen.visible_ratio)) * 100))
        screen_away_count = int(screen.away_count)
        screen_away_streak_sec = int(screen.away_streak_ms / 1000.0)

        switch_nudge = min(28.0, float(screen.site_switch_count or 0) * 2.2)

        return HybridSignals(
            gaze_deviation=gaze_deviation,
            posture_shift=posture_shift,
            cursor_chaos=cursor_chaos,
            cognitive_freeze=cognitive_freeze,
            emotional_reaction=emotional_reaction,
            expression_fatigue=int(round(expr.fatigue * 100)),
            expression_stress=int(round(expr.stress * 100)),
            expression_distraction=int(
                min(100.0, round(expr.distraction * 100) + switch_nudge)
            ),
            expression_positivity=int(round(expr.positivity * 100)),
            dominant_expression=expr.dominant,
            screen_focus=screen_focus,
            screen_away_count=screen_away_count,
            screen_away_streak_sec=screen_away_streak_sec,
            site_switch_count=int(screen.site_switch_count or 0),
        )

    def _feedback(self, module_id: str, signals: HybridSignals) -> str:
        if signals.site_switch_count > 10:
            return (
                "Kisa surede cok sayfa / URL degisimi algilandi; tek goreve sabitlenmek "
                "bilissel yuku dusurur."
            )
        if signals.screen_away_streak_sec > 30:
            return "30 saniyeyi askin suredir pencere disindasin, geri donup mevcut isi tamamla."
        if signals.screen_focus < 60:
            return "Son 5 dakikada cok sik sekme degistirdin, dikkati tek noktaya cek."

        if signals.expression_stress > 60:
            return "Yuz ifaden gergin gorunuyor, omuz-boyun kaslarini gevset ve derin nefes al."
        if signals.expression_fatigue > 65:
            return "Yorgunluk sinyali yuksek, 5 dakikalik mola ile gozlerini dinlendir."
        if signals.expression_distraction > 60:
            return "Dikkat dagilmis gibi gorunuyor, ekrandaki tek hedefe geri don."

        if module_id == "kurumsal":
            if signals.posture_shift > 65:
                return "Omuzlarin gergin gorunuyor, 1 dakika esneme yap."
            if signals.emotional_reaction > 60:
                return "Yorgunluk artiyor, toplantidan once kisa bir nefes molasi ver."
            return "Postur dengeli, bu ritimle devam edebilirsin."

        if module_id == "freelance":
            if signals.cursor_chaos > 70:
                return "Fare hareketlerin daginik, tek goreve odaklanmayi dene."
            if signals.cognitive_freeze > 70:
                return "Fare ve bakis uzun sure sabit, mini mola ile akisi tazele."
            return "Akis stabil, sprint ritmini koru."

        if signals.gaze_deviation > 60:
            return "Kafan sik sapti, anlama dusmeden once kisa bir mola ver."
        if signals.cognitive_freeze > 70:
            return "Uzun sure ayni noktadasin, konuyu parcali adimlara bol."
        if signals.expression_positivity > 50:
            return "Pozitif mod yakalandi, bu motivasyonla calismaya devam et."
        return "Odak duzeyi iyi, okumaya bu tempoyla devam et."
