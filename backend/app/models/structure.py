from sqlalchemy import String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship, mapped_column, Mapped
from app.database import Base
from datetime import datetime
from uuid import uuid4


class Structure(Base):
    __tablename__ = "structures"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid4())
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    address: Mapped[str | None] = mapped_column(String, nullable=True)
    entry_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    entry_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_bays: Mapped[int] = mapped_column(Integer, default=0)
    floor_count: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    bays = relationship("Bay", back_populates="structure", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="structure")


class Bay(Base):
    __tablename__ = "bays"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid4())
    )
    structure_id: Mapped[str] = mapped_column(
        String, ForeignKey("structures.id"), nullable=False
    )
    bay_number: Mapped[str] = mapped_column(String, nullable=False)
    floor: Mapped[int] = mapped_column(Integer, default=0)
    bay_type: Mapped[str] = mapped_column(String, default="regular")
    status: Mapped[str] = mapped_column(String, default="free")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    structure = relationship("Structure", back_populates="bays")
    sessions = relationship("Session", back_populates="parked_bay")
