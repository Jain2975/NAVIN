from pydantic import BaseModel
from datetime import datetime


# ── Session Schemas ──────────────────────────────────────────────────

class EntryPayload(BaseModel):
    structure_id: str
    gate: int = 1
    device_hash: str | None = None


class ParkPayload(BaseModel):
    bay_id: str


class SessionResponse(BaseModel):
    id: str
    status: str
    assigned_zone: str | None = None
    parked_bay_id: str | None = None
    structure_id: str
    entry_time: datetime
    exit_time: datetime | None = None
    duration_mins: int | None = None

    model_config = {"from_attributes": True}


class SessionCreated(BaseModel):
    session_id: str
    assigned_zone: str | None = None
    status: str


class SessionParked(BaseModel):
    id: str
    status: str
    parked_bay_id: str | None = None


class SessionExited(BaseModel):
    id: str
    status: str
    duration_mins: int | None = None
    exit_time: str | None = None


# ── Sensor Schemas ───────────────────────────────────────────────────

class SensorBatchPayload(BaseModel):
    session_id: str
    samples: list[dict]


class SensorBatchResponse(BaseModel):
    received: bool = True
    sample_count: int


class PositionResponse(BaseModel):
    x: float
    y: float
    floor: int
    confidence: float
