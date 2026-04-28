"""Shared test fixtures — in-memory SQLite + test client."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app as fastapi_app
from app.models.structure import Structure, Bay
import app.models  # noqa — register models


# In-memory SQLite for tests (isolated, fast)
TEST_DB_URL = "sqlite://"

engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture(autouse=True)
def setup_db():
    """Create all tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    """Provide a test DB session."""
    session = TestSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    """FastAPI test client with DB override."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app) as c:
        yield c
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def seeded_db(db):
    """Seed the DB with a demo structure and 10 bays."""
    s = Structure(
        id="test_struct",
        name="Test Structure",
        address="Test Addr",
        total_bays=10,
        floor_count=1,
    )
    db.add(s)
    db.flush()

    for i, letter in enumerate("ABCDEFGHIJ"):
        db.add(Bay(
            structure_id=s.id,
            bay_number=f"{letter}1",
            floor=0,
            bay_type="ev" if i < 2 else "regular",
        ))
    db.commit()
    return s


@pytest.fixture
def seeded_client(seeded_db, client):
    """Client with a seeded DB."""
    return client
