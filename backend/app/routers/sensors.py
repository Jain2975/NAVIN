"""Sensors router — batch ingest and position estimation."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.session import SensorBatch, Session as SessionModel
from app.schemas.session import SensorBatchPayload
from loguru import logger
import time

router = APIRouter()


@router.post("/batch")
def ingest_batch(payload: SensorBatchPayload, db: Session = Depends(get_db)):
    t0 = time.perf_counter()

    # Verify session exists
    session = db.query(SessionModel).filter(SessionModel.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    batch = SensorBatch(
        session_id=payload.session_id,
        sample_count=len(payload.samples),
        raw_data={"samples": payload.samples},
    )
    db.add(batch)
    db.commit()

    ms = round((time.perf_counter() - t0) * 1000, 1)
    logger.info(f"POST /sensors/batch | session={payload.session_id} | {len(payload.samples)} samples | {ms}ms")
    return {"received": True, "sample_count": len(payload.samples)}


@router.get("/position/{session_id}")
def get_position(session_id: str, db: Session = Depends(get_db)):
    """Nearest-neighbour position estimate (Phase 1: simplified stub)."""
    t0 = time.perf_counter()

    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Phase 1: Return a basic position based on assigned zone
    # In Phase 2, this would use SLAM / magnetic fingerprinting
    zone_positions = {
        "A": {"x": 2.0, "y": 1.0},
        "B": {"x": 4.0, "y": 1.0},
        "C": {"x": 6.0, "y": 1.0},
        "D": {"x": 2.0, "y": 3.0},
        "E": {"x": 4.0, "y": 3.0},
        "F": {"x": 6.0, "y": 3.0},
        "G": {"x": 2.0, "y": 5.0},
        "H": {"x": 4.0, "y": 5.0},
        "I": {"x": 6.0, "y": 5.0},
        "J": {"x": 8.0, "y": 5.0},
    }

    zone = session.assigned_zone or "A"
    pos = zone_positions.get(zone, {"x": 0.0, "y": 0.0})

    ms = round((time.perf_counter() - t0) * 1000, 1)
    logger.info(f"GET /sensors/position/{session_id} | zone={zone} | {ms}ms")
    return {"x": pos["x"], "y": pos["y"], "floor": 0, "confidence": 0.65}
