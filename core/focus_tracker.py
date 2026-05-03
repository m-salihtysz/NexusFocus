from __future__ import annotations

import base64
import math
from dataclasses import dataclass

import cv2
import mediapipe as mp
import numpy as np


@dataclass
class FocusMetrics:
    blink_rate: float
    gaze_speed: float
    gaze_x: float
    gaze_y: float
    head_pitch: float
    head_yaw: float
    head_roll: float


class FocusTracker:
    """MediaPipe-based focus tracker utility layer."""

    LEFT_EYE = (33, 160, 158, 133, 153, 144)
    RIGHT_EYE = (362, 385, 387, 263, 373, 380)
    LEFT_IRIS = (468, 469, 470, 471)
    RIGHT_IRIS = (473, 474, 475, 476)

    def __init__(self) -> None:
        self._face_mesh = None
        solutions = getattr(mp, "solutions", None)
        if solutions is not None and hasattr(solutions, "face_mesh"):
            self._face_mesh = solutions.face_mesh.FaceMesh(
                static_image_mode=False,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )
        self._previous_gaze: tuple[float, float] | None = None

    def decode_base64_frame(self, frame_b64: str) -> np.ndarray | None:
        encoded = frame_b64.split(",", 1)[-1]
        try:
            binary = base64.b64decode(encoded)
            np_buffer = np.frombuffer(binary, dtype=np.uint8)
            return cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)
        except (ValueError, TypeError):
            return None

    def extract_metrics_from_frame(self, frame: np.ndarray) -> FocusMetrics | None:
        if self._face_mesh is None:
            return None

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = self._face_mesh.process(rgb_frame)
        if not result.multi_face_landmarks:
            return None

        landmarks = result.multi_face_landmarks[0].landmark
        left_ear = self._eye_aspect_ratio(landmarks, self.LEFT_EYE)
        right_ear = self._eye_aspect_ratio(landmarks, self.RIGHT_EYE)
        ear = (left_ear + right_ear) / 2.0

        left_iris = self._avg_point(landmarks, self.LEFT_IRIS)
        right_iris = self._avg_point(landmarks, self.RIGHT_IRIS)
        gaze_x = (left_iris[0] + right_iris[0]) / 2.0
        gaze_y = (left_iris[1] + right_iris[1]) / 2.0

        gaze_speed = 0.0
        if self._previous_gaze is not None:
            distance = math.dist(self._previous_gaze, (gaze_x, gaze_y))
            gaze_speed = min(distance * 35.0, 1.0)
        self._previous_gaze = (gaze_x, gaze_y)

        blink_rate = max(0.05, min(0.60, (0.33 - ear) * 2.4 + 0.20))
        head_pitch, head_yaw, head_roll = self._head_pose_from_landmarks(landmarks)

        return FocusMetrics(
            blink_rate=blink_rate,
            gaze_speed=gaze_speed,
            gaze_x=gaze_x,
            gaze_y=gaze_y,
            head_pitch=head_pitch,
            head_yaw=head_yaw,
            head_roll=head_roll,
        )

    def check_gaze_direction(self, gaze_x: float, gaze_y: float) -> bool:
        """
        Return True when gaze point is roughly on-screen center region.
        Coordinates are expected in normalized range [0, 1].
        """
        return 0.2 <= gaze_x <= 0.8 and 0.2 <= gaze_y <= 0.8

    def calculate_focus_score(self, metrics: FocusMetrics) -> int:
        """
        Compute a 0-100 focus score from blink, gaze and head pose signals.
        """
        gaze_on_screen = self.check_gaze_direction(metrics.gaze_x, metrics.gaze_y)
        gaze_penalty = min(metrics.gaze_speed * 15.0, 35.0)
        blink_penalty = min(abs(metrics.blink_rate - 0.25) * 120.0, 25.0)
        head_penalty = min(
            abs(metrics.head_pitch) * 0.8
            + abs(metrics.head_yaw) * 0.8
            + abs(metrics.head_roll) * 0.4,
            30.0,
        )

        raw_score = 100.0 - gaze_penalty - blink_penalty - head_penalty
        if not gaze_on_screen:
            raw_score -= 10.0

        return max(0, min(100, int(round(raw_score))))

    @staticmethod
    def _point(landmarks, idx: int) -> tuple[float, float]:
        return landmarks[idx].x, landmarks[idx].y

    def _avg_point(self, landmarks, indices: tuple[int, ...]) -> tuple[float, float]:
        points = [self._point(landmarks, idx) for idx in indices]
        xs = [point[0] for point in points]
        ys = [point[1] for point in points]
        return sum(xs) / len(xs), sum(ys) / len(ys)

    def _eye_aspect_ratio(self, landmarks, eye: tuple[int, ...]) -> float:
        p1 = np.array(self._point(landmarks, eye[0]))
        p2 = np.array(self._point(landmarks, eye[1]))
        p3 = np.array(self._point(landmarks, eye[2]))
        p4 = np.array(self._point(landmarks, eye[3]))
        p5 = np.array(self._point(landmarks, eye[4]))
        p6 = np.array(self._point(landmarks, eye[5]))

        vertical = np.linalg.norm(p2 - p6) + np.linalg.norm(p3 - p5)
        horizontal = np.linalg.norm(p1 - p4) + 1e-6
        return vertical / (2.0 * horizontal)

    def _head_pose_from_landmarks(self, landmarks) -> tuple[float, float, float]:
        forehead = landmarks[10]
        chin = landmarks[152]
        nose = landmarks[1]
        left_cheek = landmarks[234]
        right_cheek = landmarks[454]
        left_eye_outer = landmarks[33]
        right_eye_outer = landmarks[263]

        pitch = ((chin.y - forehead.y) - 0.34) * 140.0
        yaw = (nose.x - (left_cheek.x + right_cheek.x) / 2.0) * 260.0
        roll = (right_eye_outer.y - left_eye_outer.y) * 220.0

        return (
            max(-45.0, min(45.0, pitch)),
            max(-45.0, min(45.0, yaw)),
            max(-45.0, min(45.0, roll)),
        )
