from sqlalchemy import String, Integer, Float, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship, mapped_column, Mapped
from app.database import Base
from datetime import datetime
from uuid import uuid4


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid4())
    )
    structure_id: Mapped[str] = mapped_column(
        String, ForeignKey("structures.id"), nullable=False
    )
    entry_gate: Mapped[int] = mapped_column(Integer, default=1)
    exit_gate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    entry_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    exit_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    duration_mins: Mapped[int | None] = mapped_column(Integer, nullable=True)
    assigned_zone: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="active")
    device_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    parked_bay_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("bays.id"), nullable=True
    )

    structure = relationship("Structure", back_populates="sessions")
    parked_bay = relationship("Bay", back_populates="sessions")
    sensor_batches = relationship("SensorBatch", back_populates="session")


class SensorBatch(Base):
    __tablename__ = "sensor_batches"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        String, ForeignKey("sessions.id"), nullable=False
    )
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    sample_count: Mapped[int] = mapped_column(Integer, default=0)
    raw_data: Mapped[dict] = mapped_column(JSON, nullable=False)

    session = relationship("Session", back_populates="sensor_batches")
