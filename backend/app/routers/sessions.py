"""Sessions router — entry, status, park, exit."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services import session_service
from app.schemas.session import EntryPayload, ParkPayload
from loguru import logger
import time

router = APIRouter()


@router.post("/entry")
def create_session(payload: EntryPayload, db: Session = Depends(get_db)):
    t0 = time.perf_counter()
    try:
        session = session_service.create(
            db, payload.structure_id, payload.gate, payload.device_hash
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    ms = round((time.perf_counter() - t0) * 1000, 1)
    logger.info(f"POST /sessions/entry | {session.id} | {ms}ms")
    return {
        "session_id": session.id,
        "assigned_zone": session.assigned_zone,
        "status": session.status,
    }


@router.get("/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    from app.models.session import Session as S
    from app.models.structure import Bay

    session = db.query(S).filter(S.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    bay_number = None
    if session.parked_bay_id:
        bay = db.query(Bay).filter(Bay.id == session.parked_bay_id).first()
        bay_number = bay.bay_number if bay else None

    return {
        "id": session.id,
        "status": session.status,
        "assigned_zone": session.assigned_zone,
        "parked_bay_id": session.parked_bay_id,
        "bay_number": bay_number,
        "structure_id": session.structure_id,
        "entry_time": session.entry_time.isoformat(),
    }


@router.post("/{session_id}/park")
def park_session(session_id: str, payload: ParkPayload, db: Session = Depends(get_db)):
    t0 = time.perf_counter()
    try:
        session = session_service.park(db, session_id, payload.bay_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    ms = round((time.perf_counter() - t0) * 1000, 1)
    logger.info(f"POST /sessions/{session_id}/park | {ms}ms")
    return {
        "id": session.id,
        "status": session.status,
        "parked_bay_id": session.parked_bay_id,
    }


@router.post("/{session_id}/exit")
def exit_session(session_id: str, db: Session = Depends(get_db)):
    t0 = time.perf_counter()
    try:
        session = session_service.exit_session(db, session_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    ms = round((time.perf_counter() - t0) * 1000, 1)
    logger.info(f"POST /sessions/{session_id}/exit | {ms}ms")
    return {
        "id": session.id,
        "status": session.status,
        "duration_mins": session.duration_mins,
        "exit_time": session.exit_time.isoformat() if session.exit_time else None,
    }
