from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import Base, engine
from app.core.logger import setup_logging
from app.routers import sessions, occupancy, sensors, structures, qr, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()  # start logger before anything else
    Base.metadata.create_all(bind=engine)  # safety net if alembic skipped
    yield


app = FastAPI(title="NAVIN API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://navin.vercel.app",  # update with your actual Vercel URL
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(occupancy.router, prefix="/api/occupancy", tags=["occupancy"])
app.include_router(sensors.router, prefix="/api/sensors", tags=["sensors"])
app.include_router(structures.router, prefix="/api/structures", tags=["structures"])
app.include_router(qr.router, prefix="/api/qr", tags=["qr"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.get("/")
def root():
    return {"app": "NAVIN", "version": "1.0.0", "status": "running"}
