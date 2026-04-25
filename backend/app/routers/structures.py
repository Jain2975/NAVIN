"""Structures router — list and create parking structures."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.structure import Structure
from app.schemas.structure import StructureCreate
from loguru import logger
import time

router = APIRouter()


@router.get("")
def list_structures(db: Session = Depends(get_db)):
    t0 = time.perf_counter()
    structures = db.query(Structure).all()
    ms = round((time.perf_counter() - t0) * 1000, 1)
    logger.info(f"GET /structures | {len(structures)} results | {ms}ms")
    return [
        {"id": s.id, "name": s.name, "total_bays": s.total_bays}
        for s in structures
    ]


@router.post("")
def create_structure(payload: StructureCreate, db: Session = Depends(get_db)):
    t0 = time.perf_counter()
    structure = Structure(
        name=payload.name,
        address=payload.address,
        entry_lat=payload.entry_lat,
        entry_lng=payload.entry_lng,
        total_bays=payload.total_bays,
        floor_count=payload.floor_count,
    )
    db.add(structure)
    db.commit()
    db.refresh(structure)
    ms = round((time.perf_counter() - t0) * 1000, 1)
    logger.info(f"POST /structures | {structure.id} | {ms}ms")
    return {"id": structure.id, "name": structure.name}
