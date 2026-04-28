"""Tests for session lifecycle: entry → park → exit."""
import time


class TestSessionLifecycle:
    """Full lifecycle: create → get → park → exit."""

    def test_create_session(self, seeded_client):
        res = seeded_client.post("/api/sessions/entry", json={
            "structure_id": "test_struct"
        })
        assert res.status_code == 200
        data = res.json()
        assert "session_id" in data
        assert data["status"] == "active"
        assert data["assigned_zone"] is not None

    def test_get_session(self, seeded_client):
        # Create
        create = seeded_client.post("/api/sessions/entry", json={
            "structure_id": "test_struct"
        })
        sid = create.json()["session_id"]

        # Get
        res = seeded_client.get(f"/api/sessions/{sid}")
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == sid
        assert data["status"] == "active"
        assert data["entry_time"] is not None

    def test_get_nonexistent_session(self, seeded_client):
        res = seeded_client.get("/api/sessions/fake-id-12345")
        assert res.status_code == 404

    def test_park_session(self, seeded_client):
        # Create session
        create = seeded_client.post("/api/sessions/entry", json={
            "structure_id": "test_struct"
        })
        sid = create.json()["session_id"]

        # Get a bay
        occ = seeded_client.get("/api/occupancy/test_struct")
        bay_id = occ.json()["bays"][0]["id"]

        # Park
        res = seeded_client.post(f"/api/sessions/{sid}/park", json={
            "bay_id": bay_id
        })
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "parked"
        assert data["parked_bay_id"] == bay_id

    def test_exit_session(self, seeded_client):
        # Create → Park → Exit
        create = seeded_client.post("/api/sessions/entry", json={
            "structure_id": "test_struct"
        })
        sid = create.json()["session_id"]

        occ = seeded_client.get("/api/occupancy/test_struct")
        bay_id = occ.json()["bays"][0]["id"]

        seeded_client.post(f"/api/sessions/{sid}/park", json={"bay_id": bay_id})

        res = seeded_client.post(f"/api/sessions/{sid}/exit")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "exited"
        assert data["duration_mins"] is not None
        assert data["exit_time"] is not None

    def test_park_already_parked(self, seeded_client):
        """Cannot park twice."""
        create = seeded_client.post("/api/sessions/entry", json={
            "structure_id": "test_struct"
        })
        sid = create.json()["session_id"]

        occ = seeded_client.get("/api/occupancy/test_struct")
        bays = occ.json()["bays"]

        seeded_client.post(f"/api/sessions/{sid}/park", json={"bay_id": bays[0]["id"]})
        res = seeded_client.post(f"/api/sessions/{sid}/park", json={"bay_id": bays[1]["id"]})
        assert res.status_code == 400

    def test_exit_without_parking(self, seeded_client):
        """Can exit even without parking (just walked through)."""
        create = seeded_client.post("/api/sessions/entry", json={
            "structure_id": "test_struct"
        })
        sid = create.json()["session_id"]
        res = seeded_client.post(f"/api/sessions/{sid}/exit")
        # Should work — exiting without parking is valid
        assert res.status_code == 200

    def test_bay_becomes_occupied_after_park(self, seeded_client):
        """Bay status flips to occupied after a session parks in it."""
        create = seeded_client.post("/api/sessions/entry", json={
            "structure_id": "test_struct"
        })
        sid = create.json()["session_id"]

        occ = seeded_client.get("/api/occupancy/test_struct")
        bay = occ.json()["bays"][0]
        assert bay["status"] == "free"

        seeded_client.post(f"/api/sessions/{sid}/park", json={"bay_id": bay["id"]})

        occ2 = seeded_client.get("/api/occupancy/test_struct")
        bay_after = next(b for b in occ2.json()["bays"] if b["id"] == bay["id"])
        assert bay_after["status"] == "occupied"

    def test_bay_freed_after_exit(self, seeded_client):
        """Bay becomes free again after session exits."""
        create = seeded_client.post("/api/sessions/entry", json={
            "structure_id": "test_struct"
        })
        sid = create.json()["session_id"]

        occ = seeded_client.get("/api/occupancy/test_struct")
        bay = occ.json()["bays"][0]

        seeded_client.post(f"/api/sessions/{sid}/park", json={"bay_id": bay["id"]})
        seeded_client.post(f"/api/sessions/{sid}/exit")

        occ2 = seeded_client.get("/api/occupancy/test_struct")
        bay_after = next(b for b in occ2.json()["bays"] if b["id"] == bay["id"])
        assert bay_after["status"] == "free"
