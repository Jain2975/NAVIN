"""Tests for occupancy, sensors, admin, and QR endpoints."""


class TestOccupancy:
    def test_get_occupancy(self, seeded_client):
        res = seeded_client.get("/api/occupancy/test_struct")
        assert res.status_code == 200
        data = res.json()
        assert "bays" in data
        assert len(data["bays"]) == 10
        assert all(b["status"] == "free" for b in data["bays"])

    def test_get_occupancy_nonexistent(self, seeded_client):
        res = seeded_client.get("/api/occupancy/fake_struct")
        assert res.status_code == 200
        assert len(res.json()["bays"]) == 0

    def test_occupancy_summary(self, seeded_client):
        res = seeded_client.get("/api/occupancy/test_struct/summary")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 10
        assert data["free"] == 10
        assert data["occupied"] == 0


class TestSensors:
    def test_post_batch(self, seeded_client):
        # Create a session first
        create = seeded_client.post("/api/sessions/entry", json={
            "structure_id": "test_struct"
        })
        sid = create.json()["session_id"]

        res = seeded_client.post("/api/sensors/batch", json={
            "session_id": sid,
            "samples": [
                {"accel_x": 1.0, "accel_y": 2.0, "accel_z": 9.8, "accel_mag": 10.1, "steps": 3, "ts": 1700000000000},
                {"accel_x": 0.5, "accel_y": 1.5, "accel_z": 9.7, "accel_mag": 9.9, "steps": 4, "ts": 1700000001000},
            ]
        })
        assert res.status_code == 200
        data = res.json()
        assert data["received"] is True
        assert data["sample_count"] == 2

    def test_post_empty_batch(self, seeded_client):
        create = seeded_client.post("/api/sessions/entry", json={
            "structure_id": "test_struct"
        })
        sid = create.json()["session_id"]

        res = seeded_client.post("/api/sensors/batch", json={
            "session_id": sid,
            "samples": []
        })
        assert res.status_code == 200
        assert res.json()["sample_count"] == 0

    def test_get_position(self, seeded_client):
        create = seeded_client.post("/api/sessions/entry", json={
            "structure_id": "test_struct"
        })
        sid = create.json()["session_id"]

        res = seeded_client.get(f"/api/sensors/position/{sid}")
        assert res.status_code == 200
        data = res.json()
        assert "x" in data and "y" in data


class TestAdmin:
    def test_admin_stats(self, seeded_client):
        res = seeded_client.get("/api/admin/stats")
        assert res.status_code == 200
        data = res.json()
        assert "active" in data
        assert "parked" in data
        assert "exited_today" in data
        assert "batches_today" in data

    def test_admin_sessions(self, seeded_client):
        # Create a session
        seeded_client.post("/api/sessions/entry", json={"structure_id": "test_struct"})

        res = seeded_client.get("/api/admin/sessions")
        assert res.status_code == 200
        data = res.json()
        assert "sessions" in data
        assert len(data["sessions"]) >= 1

    def test_admin_logs(self, seeded_client):
        res = seeded_client.get("/api/admin/logs")
        assert res.status_code == 200
        assert "lines" in res.json()

    def test_floorplan_meta_none(self, seeded_client):
        res = seeded_client.get("/api/admin/floorplan/test_struct/meta")
        assert res.status_code == 200
        assert res.json()["exists"] is False


class TestQR:
    def test_qr_code_generation(self, seeded_client):
        res = seeded_client.get("/api/qr/test_struct")
        assert res.status_code == 200
        assert res.headers["content-type"] == "image/png"
        assert len(res.content) > 100  # has image data
