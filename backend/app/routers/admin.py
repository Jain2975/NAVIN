"""Admin router — sessions overview, log tail, aggregate stats, floor plan management."""
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.session import Session as SessionModel, SensorBatch
from pathlib import Path
from loguru import logger
from datetime import datetime, timedelta
import time
import shutil

UPLOAD_DIR = Path("uploads/floorplans")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter()


@router.post("/floorplan")
async def upload_floorplan(
    file: UploadFile = File(...),
    structure_id: str = Form(...),
    floor: int = Form(0),
    width_meters: float = Form(50.0),
    height_meters: float = Form(30.0),
):
    """Upload a floor plan image for a structure + floor."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"{structure_id}_floor{floor}.{ext}"
    filepath = UPLOAD_DIR / filename

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Save metadata alongside
    meta_path = UPLOAD_DIR / f"{structure_id}_floor{floor}.meta"
    meta_path.write_text(f"{width_meters},{height_meters},{filename}")

    logger.info(f"Floor plan uploaded: {filename} ({width_meters}x{height_meters}m)")
    return {
        "uploaded": True,
        "filename": filename,
        "structure_id": structure_id,
        "floor": floor,
        "width_meters": width_meters,
        "height_meters": height_meters,
    }


@router.get("/floorplan/{structure_id}")
def get_floorplan(structure_id: str, floor: int = 0):
    """Serve the floor plan image."""
    meta_path = UPLOAD_DIR / f"{structure_id}_floor{floor}.meta"
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail="No floor plan uploaded for this structure/floor")

    parts = meta_path.read_text().strip().split(",")
    filename = parts[2]
    filepath = UPLOAD_DIR / filename

    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Floor plan file missing")

    return FileResponse(filepath, media_type="image/png")


@router.get("/floorplan/{structure_id}/meta")
def get_floorplan_meta(structure_id: str, floor: int = 0):
    """Get floor plan metadata (dimensions)."""
    meta_path = UPLOAD_DIR / f"{structure_id}_floor{floor}.meta"
    if not meta_path.exists():
        return {"exists": False}

    parts = meta_path.read_text().strip().split(",")
    return {
        "exists": True,
        "width_meters": float(parts[0]),
        "height_meters": float(parts[1]),
        "filename": parts[2],
        "url": f"/api/admin/floorplan/{structure_id}?floor={floor}",
    }


@router.get("/sessions")
def get_sessions(db: Session = Depends(get_db)):
    t0 = time.perf_counter()
    sessions = db.query(SessionModel).order_by(SessionModel.entry_time.desc()).limit(100).all()
    ms = round((time.perf_counter() - t0) * 1000, 1)
    logger.info(f"GET /admin/sessions | {len(sessions)} results | {ms}ms")
    return {
        "sessions": [
            {
                "id": s.id,
                "structure_id": s.structure_id,
                "status": s.status,
                "assigned_zone": s.assigned_zone,
                "entry_time": s.entry_time.isoformat(),
                "exit_time": s.exit_time.isoformat() if s.exit_time else None,
                "duration_mins": s.duration_mins,
                "parked_bay_id": s.parked_bay_id,
            }
            for s in sessions
        ],
        "total": len(sessions),
    }


@router.get("/logs")
def get_logs():
    log_path = Path("logs/navin.log")
    if not log_path.exists():
        return {"lines": ["No logs yet"]}
    lines = log_path.read_text().strip().split("\n")
    return {"lines": lines[-50:]}


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    t0 = time.perf_counter()

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    active = db.query(func.count(SessionModel.id)).filter(
        SessionModel.status == "active"
    ).scalar()

    parked = db.query(func.count(SessionModel.id)).filter(
        SessionModel.status == "parked"
    ).scalar()

    exited_today = db.query(func.count(SessionModel.id)).filter(
        SessionModel.status == "exited",
        SessionModel.exit_time >= today_start,
    ).scalar()

    batches_today = db.query(func.count(SensorBatch.id)).filter(
        SensorBatch.recorded_at >= today_start,
    ).scalar()

    ms = round((time.perf_counter() - t0) * 1000, 1)
    logger.info(f"GET /admin/stats | {ms}ms")
    return {
        "active": active,
        "parked": parked,
        "exited_today": exited_today,
        "batches_today": batches_today,
    }
