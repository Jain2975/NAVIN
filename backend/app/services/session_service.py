"""Session service — create, park, exit workflows."""
from sqlalchemy.orm import Session
from app.models.session import Session as SessionModel, SensorBatch
from app.models.structure import Bay
from datetime import datetime
from loguru import logger
import random


def assign_zone(db: Session, structure_id: str) -> str:
    """Return a zone label (A–D) based on free bay distribution."""
    free = db.query(Bay).filter(
        Bay.structure_id == structure_id,
        Bay.status == "free",
    ).all()
    if not free:
        return "Any"
    # Pick zone from first letter of bay_number of a random free bay
    bay = random.choice(free)
    return bay.bay_number[0]  # e.g. 'A' from 'A1'


def create(
    db: Session,
    structure_id: str,
    entry_gate: int = 1,
    device_hash: str = None,
) -> SessionModel:
    zone = assign_zone(db, structure_id)
    session = SessionModel(
        structure_id=structure_id,
        entry_gate=entry_gate,
        assigned_zone=zone,
        device_hash=device_hash,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    logger.info(f"Session created: {session.id} → zone {zone}")
    return session


def park(db: Session, session_id: str, bay_id: str) -> SessionModel:
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise ValueError("Session not found")
    if session.status != "active":
        raise ValueError(f"Session already {session.status}")

    bay = db.query(Bay).filter(Bay.id == bay_id).first()
    if not bay:
        raise ValueError("Bay not found")
    if bay.status == "occupied":
        raise ValueError("Bay already occupied")

    bay.status = "occupied"
    session.parked_bay_id = bay_id
    session.status = "parked"
    db.commit()
    db.refresh(session)
    logger.info(f"Session {session_id} parked → bay {bay.bay_number}")
    return session


def exit_session(db: Session, session_id: str, exit_gate: int = 1) -> SessionModel:
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise ValueError("Session not found")
    if session.status == "exited":
        raise ValueError("Already exited")

    now = datetime.utcnow()
    duration = int((now - session.entry_time).total_seconds() / 60)

    # Free the bay
    if session.parked_bay_id:
        bay = db.query(Bay).filter(Bay.id == session.parked_bay_id).first()
        if bay:
            bay.status = "free"

    session.status = "exited"
    session.exit_time = now
    session.exit_gate = exit_gate
    session.duration_mins = duration
    db.commit()
    db.refresh(session)
    logger.info(f"Session {session_id} exited after {duration} min")
    return session
