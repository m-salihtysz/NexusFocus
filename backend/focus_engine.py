from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from core.cognitive_load import CognitiveLoadCalculator
from core.focus_tracker import FocusMetrics, FocusTracker
from backend.hybrid_focus import (
    ExpressionMetrics,
    HybridFocusScorer,
    MouseMetrics,
    ScreenMetrics,
)


@dataclass
class FocusReading:
    focus_score: int
    hybrid_score: int
    cognitive_load: int
    module_id: str
    primary_tracking_type: str
    focus_indicator: str
    instant_feedback: str
    gaze_deviation: int
    posture_shift: int
    cursor_chaos: int
    cognitive_freeze: int
    emotional_reaction: int
    expression_fatigue: int
    expression_stress: int
    expression_distraction: int
    expression_positivity: int
    dominant_expression: str
    screen_focus: int
    screen_away_count: int
    screen_away_streak_sec: int
    blink_rate: float
    gaze_speed: float
    gaze_x: float
    gaze_y: float
    head_pitch: float
    head_yaw: float
    head_roll: float
    mouse_speed: float = 0.0
    mouse_idle_sec: float = 0.0
    tab_scope: str = "this_tab"
    site_switch_count: int = 0
    site_path: str = ""


class FocusEngine:
    """
    Converts live camera feed-derived signals into usable focus metrics.
    """

    def __init__(self) -> None:
        self.tracker = FocusTracker()
        self.load_calculator = CognitiveLoadCalculator()
        self.hybrid_scorer = HybridFocusScorer()

    def process_camera_feed(self, camera_feed: dict[str, Any]) -> dict[str, Any]:
        metrics = self._resolve_metrics(camera_feed)
        module_id = str(camera_feed.get("module_id", "ogrenci")).lower()
        mouse = self._resolve_mouse_metrics(camera_feed.get("mouse_metrics"))
        expressions = self._resolve_expressions(camera_feed.get("expressions"))
        screen = self._resolve_screen_metrics(camera_feed.get("screen_metrics"))

        focus_score = self.tracker.calculate_focus_score(metrics)
        cognitive_load = self.load_calculator.calculate(
            gaze_speed=metrics.gaze_speed, blink_rate=metrics.blink_rate
        )
        (
            hybrid_score,
            hybrid_signals,
            module_meta,
            feedback,
        ) = self.hybrid_scorer.score(
            module_id=module_id,
            focus_score=focus_score,
            metrics=metrics,
            mouse=mouse,
            tracker=self.tracker,
            expressions=expressions,
            screen=screen,
        )

        reading = FocusReading(
            focus_score=focus_score,
            hybrid_score=hybrid_score,
            cognitive_load=cognitive_load,
            module_id=module_id,
            primary_tracking_type=module_meta["primary_tracking_type"],
            focus_indicator=module_meta["focus_indicator"],
            instant_feedback=feedback,
            gaze_deviation=hybrid_signals.gaze_deviation,
            posture_shift=hybrid_signals.posture_shift,
            cursor_chaos=hybrid_signals.cursor_chaos,
            cognitive_freeze=hybrid_signals.cognitive_freeze,
            emotional_reaction=hybrid_signals.emotional_reaction,
            expression_fatigue=hybrid_signals.expression_fatigue,
            expression_stress=hybrid_signals.expression_stress,
            expression_distraction=hybrid_signals.expression_distraction,
            expression_positivity=hybrid_signals.expression_positivity,
            dominant_expression=hybrid_signals.dominant_expression,
            screen_focus=hybrid_signals.screen_focus,
            screen_away_count=hybrid_signals.screen_away_count,
            screen_away_streak_sec=hybrid_signals.screen_away_streak_sec,
            blink_rate=metrics.blink_rate,
            gaze_speed=metrics.gaze_speed,
            gaze_x=metrics.gaze_x,
            gaze_y=metrics.gaze_y,
            head_pitch=metrics.head_pitch,
            head_yaw=metrics.head_yaw,
            head_roll=metrics.head_roll,
            mouse_speed=mouse.speed,
            mouse_idle_sec=max(0.0, mouse.idle_ms / 1000.0),
            tab_scope=str(camera_feed.get("tab_scope") or "this_tab"),
            site_switch_count=int(getattr(screen, "site_switch_count", 0) or 0),
            site_path=str(getattr(screen, "site_path", "") or "")[:256],
        )

        # SECURITY: Raw frame is deleted from memory immediately after processing to ensure privacy.
        if "frame" in camera_feed:
            frame = camera_feed.pop("frame")
            del frame
        if "frame_b64" in camera_feed:
            encoded_frame = camera_feed.pop("frame_b64")
            del encoded_frame

        return asdict(reading)

    def _resolve_metrics(self, camera_feed: dict[str, Any]) -> FocusMetrics:
        frame_b64 = camera_feed.get("frame_b64")
        if isinstance(frame_b64, str) and frame_b64:
            frame = self.tracker.decode_base64_frame(frame_b64)
            if frame is not None:
                extracted = self.tracker.extract_metrics_from_frame(frame)
                del frame
                if extracted is not None:
                    return extracted

        return FocusMetrics(
            blink_rate=float(camera_feed.get("blink_rate", 0.25)),
            gaze_speed=float(camera_feed.get("gaze_speed", 0.2)),
            gaze_x=float(camera_feed.get("gaze_x", 0.5)),
            gaze_y=float(camera_feed.get("gaze_y", 0.5)),
            head_pitch=float(camera_feed.get("head_pitch", 0.0)),
            head_yaw=float(camera_feed.get("head_yaw", 0.0)),
            head_roll=float(camera_feed.get("head_roll", 0.0)),
        )

    @staticmethod
    def _resolve_mouse_metrics(raw_mouse: Any) -> MouseMetrics:
        if not isinstance(raw_mouse, dict):
            return MouseMetrics()
        return MouseMetrics(
            speed=float(raw_mouse.get("speed", 0.0)),
            chaos=float(raw_mouse.get("chaos", 0.0)),
            idle_ms=float(raw_mouse.get("idle_ms", 0.0)),
            freeze_ratio=float(raw_mouse.get("freeze_ratio", 0.0)),
        )

    @staticmethod
    def _resolve_screen_metrics(raw: Any) -> ScreenMetrics:
        if not isinstance(raw, dict):
            return ScreenMetrics()
        return ScreenMetrics(
            is_visible=bool(raw.get("is_visible", True)),
            visible_ratio=float(raw.get("visible_ratio", 1.0)),
            away_count=int(raw.get("away_count", 0)),
            away_streak_ms=float(raw.get("away_streak_ms", 0.0)),
            site_switch_count=int(raw.get("site_switch_count", 0)),
            site_path=str(raw.get("site_path", ""))[:512],
        )

    @staticmethod
    def _resolve_expressions(raw: Any) -> ExpressionMetrics:
        if not isinstance(raw, dict):
            return ExpressionMetrics()
        return ExpressionMetrics(
            fatigue=float(raw.get("fatigue", 0.0)),
            stress=float(raw.get("stress", 0.0)),
            distraction=float(raw.get("distraction", 0.0)),
            positivity=float(raw.get("positivity", 0.0)),
            surprise=float(raw.get("surprise", 0.0)),
            dominant=str(raw.get("dominant", "neutral")),
        )
