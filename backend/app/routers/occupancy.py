"""Occupancy router — bay statuses and summary."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services import occupancy_service
from loguru import logger
import time

router = APIRouter()


@router.get("/{structure_id}")
def get_occupancy(structure_id: str, db: Session = Depends(get_db)):
    t0 = time.perf_counter()
    bays = occupancy_service.get_bays(db, structure_id)
    ms = round((time.perf_counter() - t0) * 1000, 1)
    logger.info(f"GET /occupancy/{structure_id} | {len(bays)} bays | {ms}ms")
    return {
        "bays": [
            {
                "id": b.id,
                "bay_number": b.bay_number,
                "floor": b.floor,
                "status": b.status,
                "bay_type": b.bay_type,
                "confidence": b.confidence,
            }
            for b in bays
        ]
    }


@router.get("/{structure_id}/summary")
def get_occupancy_summary(structure_id: str, db: Session = Depends(get_db)):
    t0 = time.perf_counter()
    summary = occupancy_service.get_summary(db, structure_id)
    ms = round((time.perf_counter() - t0) * 1000, 1)
    logger.info(f"GET /occupancy/{structure_id}/summary | {ms}ms")
    return summary
