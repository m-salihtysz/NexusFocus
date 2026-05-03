class CognitiveLoadCalculator:
    """
    Estimates cognitive load using gaze speed and blink frequency.
    Returns a 0-100 score where higher means heavier cognitive load.
    """

    def calculate(self, gaze_speed: float, blink_rate: float) -> int:
        gaze_component = min(gaze_speed * 70.0, 70.0)
        blink_component = min(abs(blink_rate - 0.25) * 120.0, 30.0)
        return max(0, min(100, int(round(gaze_component + blink_component))))
