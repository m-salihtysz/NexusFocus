from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from backend.models import EnterpriseFocusSnapshot


@dataclass
class EnterpriseSnapshotCreate:
    tenant_id: int
    team_id: int
    focus_score: int
    cognitive_load: int
    blink_rate: float
    gaze_speed: float


class EnterpriseAPI:
    """
    Service layer to persist anonymized focus analytics for enterprise customers.
    """

    def save_snapshot(
        self, db: Session, payload: EnterpriseSnapshotCreate
    ) -> EnterpriseFocusSnapshot:
        snapshot = EnterpriseFocusSnapshot(
            tenant_id=payload.tenant_id,
            team_id=payload.team_id,
            focus_score=payload.focus_score,
            cognitive_load=payload.cognitive_load,
            blink_rate=payload.blink_rate,
            gaze_speed=payload.gaze_speed,
        )
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)
        return snapshot
