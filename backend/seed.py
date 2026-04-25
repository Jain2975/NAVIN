"""Seed the database with a demo parking structure and 20 bays."""
from app.database import SessionLocal, Base, engine
import app.models  # noqa — registers all models
from app.models.structure import Structure, Bay
import string

Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Clear existing data
db.query(Bay).delete()
db.query(Structure).delete()

# Create demo structure
s = Structure(
    id="struct_demo_001",
    name="Demo Parking Structure",
    address="123 Demo Street",
    total_bays=20,
    floor_count=2,
)
db.add(s)
db.flush()

# Create 20 bays: 10 per floor, first 2 on each floor are EV
for floor in [0, 1]:
    for i, letter in enumerate(string.ascii_uppercase[:10]):
        db.add(
            Bay(
                structure_id=s.id,
                bay_number=f"{letter}{floor + 1}",
                floor=floor,
                bay_type="ev" if i < 2 else "regular",
            )
        )

db.commit()
print(f"✅ Seeded: {s.id} with 20 bays (2 floors × 10 bays, 4 EV)")
db.close()
