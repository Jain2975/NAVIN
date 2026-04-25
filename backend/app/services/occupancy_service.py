"""Occupancy service — bay status queries and aggregation."""
from sqlalchemy.orm import Session
from app.models.structure import Bay


def get_bays(db: Session, structure_id: str) -> list[Bay]:
    """Return all bays for a structure."""
    return db.query(Bay).filter(Bay.structure_id == structure_id).all()


def get_summary(db: Session, structure_id: str) -> dict:
    """Return counts of bay statuses."""
    bays = get_bays(db, structure_id)
    total = len(bays)
    free = sum(1 for b in bays if b.status == "free")
    occupied = sum(1 for b in bays if b.status == "occupied")
    uncertain = total - free - occupied
    return {
        "total": total,
        "free": free,
        "occupied": occupied,
        "uncertain": uncertain,
    }
