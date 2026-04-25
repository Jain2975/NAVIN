from pydantic import BaseModel
from datetime import datetime


# ── Structure Schemas ────────────────────────────────────────────────

class StructureCreate(BaseModel):
    name: str
    address: str | None = None
    entry_lat: float | None = None
    entry_lng: float | None = None
    total_bays: int = 0
    floor_count: int = 1

    model_config = {"from_attributes": True}


class StructureResponse(BaseModel):
    id: str
    name: str
    address: str | None = None
    total_bays: int
    floor_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Bay Schemas ──────────────────────────────────────────────────────

class BayResponse(BaseModel):
    id: str
    bay_number: str
    floor: int
    bay_type: str
    status: str
    confidence: float
    structure_id: str

    model_config = {"from_attributes": True}
