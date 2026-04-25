# NAVIN — Application Architecture & Flow Documentation

> **NAVIN** = GPS-free Indoor Parking Navigation using smartphone sensors + QR sessions.  
> No app install — runs entirely in the browser (PWA).

---

## Table of Contents

1. [How It Works — The Big Picture](#how-it-works)
2. [Sensor Data Architecture](#sensor-data-architecture)
3. [User Flow — Step by Step](#user-flow)
4. [Backend Architecture](#backend-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [API Reference](#api-reference)
7. [File-by-File Breakdown](#file-by-file-breakdown)

---

## How It Works

```
   Driver arrives                                     Driver leaves
       │                                                    │
       ▼                                                    ▼
  ┌─────────┐    ┌───────────┐    ┌─────────┐    ┌──────────┐
  │  SCAN   │───▶│ NAVIGATE  │───▶│ PARKED  │───▶│   EXIT   │
  │ Entry QR│    │ to free   │    │ confirm │    │ Scan QR  │
  │         │    │ bay       │    │         │    │          │
  └─────────┘    └───────────┘    └─────────┘    └──────────┘
       │              │                │               │
       ▼              ▼                ▼               ▼
  Session created  Sensors stream   Bay → occupied   Bay → free
  Zone assigned    Position updates  Session → parked Session → exited
```

**The key insight**: GPS doesn't work inside parking structures because concrete/steel blocks satellite signals. NAVIN replaces GPS with sensors that DO work indoors:

- **Magnetometer** — Earth's magnetic field is distorted differently by steel beams in each zone, creating a unique magnetic "fingerprint"
- **Accelerometer** — Detects if you're walking or stopped (parked)
- **Barometer** — Pressure changes between floors

---

## Sensor Data Architecture

### How Sensor Data Flows Through the Application

```
┌──────────────────────── PHONE (Browser) ────────────────────────┐
│                                                                  │
│  devicemotion event (60Hz)     deviceorientation event (60Hz)   │
│         │                              │                         │
│         ▼                              ▼                         │
│  ┌──────────────┐              ┌───────────────┐                │
│  │ useSensors.js│              │ useSensors.js  │                │
│  │              │              │                │                │
│  │ accel_x/y/z  │              │ alpha (compass)│                │
│  │ accel_mag    │              │ beta  (tilt)   │                │
│  │ step_count   │              │ gamma (roll)   │                │
│  └──────┬───────┘              └───────┬────────┘                │
│         │                              │                         │
│         ▼                              ▼                         │
│  ┌─────────────────────────────────────────────┐                │
│  │         SENSOR STATE (updated 60x/sec)       │                │
│  │  {                                           │                │
│  │    mag_x: 25.3,    accel_x: 0.12,           │                │
│  │    mag_y: -12.1,   accel_y: 9.78,           │                │
│  │    mag_z: 41.7,    accel_z: 0.34,           │                │
│  │    pressure: 1013.2,  steps: 47             │                │
│  │  }                                           │                │
│  └──────────┬──────────────────┬────────────────┘                │
│             │                  │                                  │
│     ┌───────▼────────┐  ┌─────▼──────────────┐                  │
│     │ SensorDisplay  │  │ ActivityClassifier  │                  │
│     │ (shows live    │  │ (state machine)     │                  │
│     │  numbers on    │  │                     │                  │
│     │  screen)       │  │ UNKNOWN → WALKING   │                  │
│     └────────────────┘  │ WALKING → STATIONARY│                  │
│                         │ STATIONARY → PARKED │                  │
│             │           └──────────┬──────────┘                  │
│             │                      │                              │
│      Every 2 seconds:              │ After 8s stationary:        │
│      POST /api/sensors/batch       │ Show "Confirm parking?"     │
│             │                      │                              │
└─────────────┼──────────────────────┼──────────────────────────────┘
              │                      │
              ▼                      ▼
┌──────── BACKEND ──────────┐   ┌──────────────────┐
│  SensorBatch table         │   │ POST /sessions/   │
│  (stores raw samples       │   │  {id}/park        │
│   for analysis)            │   │ Bay → occupied    │
│                            │   └──────────────────┘
│  GET /sensors/position/    │
│  (returns x,y,floor)       │
└────────────────────────────┘
```

### Sensor Permission Handling

| Platform | Sensors | Camera (QR) | What's needed |
|----------|---------|-------------|---------------|
| **Desktop Chrome** | ❌ No hardware | ✅ Webcam works | Just `localhost:5173` |
| **Android Chrome** | ✅ Works | ✅ Works | Same WiFi, access via laptop's LAN IP |
| **iPhone Safari** | ⚠️ Needs HTTPS + user gesture | ⚠️ Needs HTTPS | Requires ngrok or deployment |

On **iOS**, sensors need explicit permission via `DeviceMotionEvent.requestPermission()` — this MUST be called from a user gesture (button click), not on page load. The `useSensors.js` hook handles this automatically.

### Activity Classifier State Machine

```
                    ┌─────────────┐
           ┌───────▶│   UNKNOWN   │◀──── reset()
           │        └──────┬──────┘
           │               │ accel variance > threshold
           │               │ + steps > 3
           │               ▼
           │        ┌─────────────┐
           │        │   WALKING   │◀─────────────────┐
           │        └──────┬──────┘                   │
           │               │ accel variance drops     │
           │               ▼                          │
    movement       ┌─────────────┐                    │
    detected       │ STATIONARY  │──── movement ──────┘
           │       └──────┬──────┘    detected
           │              │
           │              │ stationary > 8 seconds
           │              ▼
           │       ┌─────────────┐
           └───────│   PARKED    │ ──▶ trigger parking confirmation
                   └─────────────┘
```

**Thresholds** (tunable):
- `WALK_THRESHOLD = 1.2` — accelerometer magnitude variance needed to count as walking
- `STATIONARY_WINDOW = 8000ms` — how long stationary before declaring PARKED
- `WALKING_MIN_STEPS = 3` — minimum steps to confirm WALKING state

---

## User Flow — Step by Step

### 1. Entry Gate (Scan QR)
1. User opens browser, sees QR scanner
2. Points camera at entry QR code on pillar
3. QR contains: `{"structure_id": "struct_demo_001", "gate": 1, "type": "entry"}`
4. Frontend POSTs to `/api/sessions/entry`
5. Backend creates session, assigns a zone (based on free bay distribution)
6. Session ID saved to `localStorage` (survives page refresh)
7. User redirected to Navigate page

### 2. Navigate (Walk to Bay)
1. Sensor collection starts (magnetometer + accelerometer)
2. Live sensor values displayed on screen (proof for demo)
3. Occupancy grid shows free (green) / occupied (red) bays
4. Floor map shows position dot (updates from sensor data)
5. Activity classifier monitors walking/stationary state

### 3. Parked (Vehicle Stopped)
1. When classifier detects 8+ seconds stationary → "Confirm parking?" banner
2. User selects their bay from the occupancy grid
3. Frontend POSTs to `/api/sessions/{id}/park`
4. Bay status changes: `free` → `occupied` (red on grid)
5. User sees parking confirmation with bay number, floor, duration timer

### 4. Exit Gate (Scan QR)
1. User scans exit QR at gate
2. Frontend POSTs to `/api/sessions/{id}/exit`
3. Bay freed: `occupied` → `free` (green on grid)
4. Duration and exit time displayed
5. Session closed

### 5. Admin Dashboard
- Sessions table with status badges (active/parked/exited)
- Live sensor batch counter
- Log tail (last 50 lines, auto-refresh every 15s)
- Aggregate stats: active, parked, exited today, batches today

---

## Backend Architecture

```
backend/
├── app/
│   ├── main.py          ─── FastAPI entry point
│   ├── config.py        ─── Environment config
│   ├── database.py      ─── SQLAlchemy setup
│   ├── models/          ─── ORM models (database tables)
│   ├── schemas/         ─── Pydantic validation schemas
│   ├── routers/         ─── API route handlers
│   ├── services/        ─── Business logic layer
│   └── core/            ─── Logging setup
├── alembic/             ─── Database migrations
├── seed.py              ─── Demo data seeder
└── pyproject.toml       ─── Poetry dependencies
```

### Data Flow: Request → Response

```
HTTP Request
    │
    ▼
FastAPI Router (validates input with Pydantic schema)
    │
    ▼
Service Layer (business logic, DB queries)
    │
    ▼
SQLAlchemy ORM (models map to database tables)
    │
    ▼
SQLite Database (local) / PostgreSQL (production)
    │
    ▼
Response (JSON)
```

---

## Frontend Architecture

```
frontend/src/
├── main.jsx             ─── React entry point
├── App.jsx              ─── Route definitions
├── index.css            ─── Global styles + Tailwind
├── pages/               ─── Full-screen page components
│   ├── EntryGate.jsx    ─── QR scanner + session creation
│   ├── Navigate.jsx     ─── Sensors + occupancy + map
│   ├── Parked.jsx       ─── Parking confirmation
│   ├── ExitGate.jsx     ─── Exit QR scanner
│   └── AdminDashboard.jsx ── Admin view
├── components/          ─── Reusable UI components
│   ├── QRScanner.jsx    ─── Camera + jsQR decoding
│   ├── QRCodeDisplay.jsx ── Renders QR from backend
│   ├── SensorDisplay.jsx ── Live sensor numbers
│   ├── OccupancyGrid.jsx ── Bay status grid
│   ├── FloorMap.jsx     ─── Leaflet map (lazy loaded)
│   └── ErrorBoundary.jsx ── Catches React crashes
├── hooks/               ─── Custom React hooks
│   ├── useSensors.js    ─── Sensor data collection
│   └── useOccupancy.js  ─── Occupancy polling
├── services/
│   └── api.js           ─── Axios API client
└── utils/
    └── activityClassifier.js ── Walking/parked state machine
```

---

## API Reference

| # | Method | Endpoint | Purpose | Returns |
|---|--------|----------|---------|---------|
| 1 | POST | `/api/sessions/entry` | Create session on QR scan | `{session_id, assigned_zone, status}` |
| 2 | GET | `/api/sessions/{id}` | Poll session status | `{id, status, assigned_zone, parked_bay_id}` |
| 3 | POST | `/api/sessions/{id}/park` | Mark parked, lock bay | `{id, status, parked_bay_id}` |
| 4 | POST | `/api/sessions/{id}/exit` | Close session, free bay | `{id, duration_mins, exit_time}` |
| 5 | GET | `/api/occupancy/{structure_id}` | All bays with status | `{bays: [{id, bay_number, floor, status}]}` |
| 6 | GET | `/api/occupancy/{structure_id}/summary` | Counts only | `{total, free, occupied, uncertain}` |
| 7 | POST | `/api/sensors/batch` | Ingest sensor batch | `{received: true, sample_count}` |
| 8 | GET | `/api/sensors/position/{session_id}` | Position estimate | `{x, y, floor, confidence}` |
| 9 | GET | `/api/qr/{structure_id}` | Entry QR as PNG | `image/png` |
| 10 | GET | `/api/qr/{structure_id}/exit` | Exit QR as PNG | `image/png` |
| 11 | GET | `/api/structures` | List all structures | `[{id, name, total_bays}]` |
| 12 | POST | `/api/structures` | Create structure | `{id, name}` |
| 13 | GET | `/api/admin/sessions` | All sessions | `{sessions: [...], total}` |
| 14 | GET | `/api/admin/logs` | Last 50 log lines | `{lines: [string]}` |
| 15 | GET | `/api/admin/stats` | Aggregate counts | `{active, parked, exited_today, batches_today}` |

---

## File-by-File Breakdown

### Backend Files

| File | Purpose |
|------|---------|
| `backend/pyproject.toml` | Poetry project config — all Python dependencies with exact version pins |
| `backend/poetry.lock` | Auto-generated lockfile — pins ALL transitive dependencies for reproducibility |
| `backend/.env` | Environment variables (DB URL, secret key, CORS origins). Never committed to git |
| `backend/.env.example` | Template showing all required env vars for new developers |
| `backend/seed.py` | Populates DB with demo parking structure (20 bays, 2 floors, 4 EV spots) |
| `backend/alembic.ini` | Alembic config — points to migration scripts, timezone=UTC |
| `backend/alembic/env.py` | Alembic runtime config — imports all models, reads DB URL from settings |
| `backend/alembic/versions/*.py` | Auto-generated migration files (database schema changes) |

| File | Purpose |
|------|---------|
| **`backend/app/main.py`** | FastAPI application factory. Registers CORS middleware, includes all 6 routers under `/api/*` prefixes, creates tables on startup as safety net |
| **`backend/app/config.py`** | Reads `.env` using pydantic-settings. Defines `Settings` class with database_url, secret_key, cors_origins, etc. |
| **`backend/app/database.py`** | Creates SQLAlchemy engine, session factory, and `Base` class. Provides `get_db()` dependency for all routers |
| **`backend/app/core/logger.py`** | Configures Loguru: stdout with colors + rotating file logger (`logs/navin.log`). Called at app startup |

| File | Purpose |
|------|---------|
| **`backend/app/models/structure.py`** | `Structure` ORM model (parking garage) + `Bay` model (individual parking spots). Tracks bay status: free/occupied |
| **`backend/app/models/session.py`** | `Session` model (one per driver visit) + `SensorBatch` model (stores raw sensor readings as JSON). Tracks lifecycle: active→parked→exited |
| **`backend/app/models/__init__.py`** | Imports all models — **critical** for Alembic to detect tables during migration autogenerate |

| File | Purpose |
|------|---------|
| **`backend/app/schemas/structure.py`** | Pydantic v2 schemas for Structure/Bay — validates API input and serializes output |
| **`backend/app/schemas/session.py`** | Pydantic v2 schemas for Session/SensorBatch — defines `EntryPayload`, `ParkPayload`, `SensorBatchPayload`, etc. |

| File | Purpose |
|------|---------|
| **`backend/app/services/session_service.py`** | Core business logic: `create()` assigns zone from free bays, `park()` locks bay + updates status, `exit_session()` frees bay + calculates duration |
| **`backend/app/services/occupancy_service.py`** | Queries bay statuses, computes summary counts (total/free/occupied/uncertain) |
| **`backend/app/services/qr_service.py`** | Generates QR code PNG images from JSON payloads using `qrcode` library |

| File | Purpose |
|------|---------|
| **`backend/app/routers/sessions.py`** | 4 routes: POST /entry (create), GET /{id} (status), POST /{id}/park, POST /{id}/exit. Uses session_service |
| **`backend/app/routers/occupancy.py`** | 2 routes: GET /{structure_id} (all bays), GET /{structure_id}/summary (counts) |
| **`backend/app/routers/sensors.py`** | 2 routes: POST /batch (ingest sensor data), GET /position/{session_id} (position estimate) |
| **`backend/app/routers/structures.py`** | 2 routes: GET / (list structures), POST / (create structure) |
| **`backend/app/routers/qr.py`** | 2 routes: GET /{structure_id} (entry QR PNG), GET /{structure_id}/exit (exit QR PNG) |
| **`backend/app/routers/admin.py`** | 3 routes: GET /sessions (all sessions), GET /logs (log tail), GET /stats (aggregate counts) |

### Frontend Files

| File | Purpose |
|------|---------|
| `frontend/index.html` | HTML shell with PWA meta tags, loads main.jsx |
| `frontend/vite.config.js` | Vite dev server config — proxies `/api/*` to FastAPI :8000, binds to 0.0.0.0 for LAN testing |
| `frontend/tailwind.config.js` | TailwindCSS config — NAVIN brand colors (indigo), custom animations, Inter font |
| `frontend/postcss.config.js` | PostCSS pipeline — TailwindCSS + autoprefixer |
| `frontend/vercel.json` | SPA rewrite rule — prevents 404 on page refresh in production |
| `frontend/.nvmrc` | Locks Node.js version to 20.14.0 for all developers |
| `frontend/.env.example` | Documents `VITE_API_BASE_URL` for production deployment |

| File | Purpose |
|------|---------|
| **`frontend/src/main.jsx`** | React entry point. Imports Leaflet CSS (MUST be before app CSS or tiles break), fixes Leaflet marker icons for Vite, wraps app in BrowserRouter |
| **`frontend/src/App.jsx`** | Route definitions: `/` → EntryGate, `/navigate/:id` → Navigate, `/parked/:id` → Parked, `/exit` → ExitGate, `/admin` → AdminDashboard. All lazy-loaded, all wrapped in ErrorBoundary |
| **`frontend/src/index.css`** | Global styles: TailwindCSS directives, glassmorphism `.glass-card`, gradient buttons (`.btn-primary`), status badges, glow effects, mesh background, dark theme |
| **`frontend/src/services/api.js`** | Axios HTTP client with all API helper functions. Uses `VITE_API_BASE_URL` for production, empty string for dev (Vite proxy) |
| **`frontend/src/utils/activityClassifier.js`** | State machine detecting WALKING→STATIONARY→PARKED from accelerometer variance. Runs at 60Hz on device, triggers parking confirmation after 8s stationary |
| **`frontend/src/hooks/useSensors.js`** | Custom React hook: requests sensor permissions (iOS special handling), attaches `devicemotion`/`deviceorientation` listeners, batches and posts data every 2s |
| **`frontend/src/hooks/useOccupancy.js`** | Custom React hook: polls `GET /api/occupancy/{structure_id}` every 10 seconds, returns bay array |
| **`frontend/src/components/QRScanner.jsx`** | Opens camera via `getUserMedia`, draws to canvas at half resolution, runs jsQR decoder at 10fps with 2s debounce to prevent double-scans |
| **`frontend/src/components/QRCodeDisplay.jsx`** | Displays QR code PNG from backend with download link for printing |
| **`frontend/src/components/SensorDisplay.jsx`** | Shows live sensor values (mag_x/y/z, accel_x/y/z, steps, pressure) updating in real-time as the phone moves |
| **`frontend/src/components/OccupancyGrid.jsx`** | Visual grid of parking bays — green (free), red (occupied), yellow (uncertain). Polls every 10s |
| **`frontend/src/components/FloorMap.jsx`** | Leaflet map showing bay markers + user position dot. **Always lazy-imported** to prevent `window` crash during SSR |
| **`frontend/src/components/ErrorBoundary.jsx`** | React class component that catches rendering errors and shows a recovery UI instead of blank screen |

### Root Files

| File | Purpose |
|------|---------|
| `.gitignore` | Excludes: `.venv/`, `__pycache__/`, `*.db`, `.env`, `logs/`, `node_modules/`, `dist/`, `.DS_Store` |

---

## Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React | 18.3.1 |
| **Build** | Vite | 5.2.11 |
| **Styling** | TailwindCSS | 3.4.3 |
| **Routing** | react-router-dom | 6.23.1 |
| **HTTP** | Axios | 1.7.2 |
| **QR Decode** | jsQR | 1.4.0 |
| **Maps** | Leaflet + react-leaflet | 1.9.4 + 4.2.1 |
| **Backend** | FastAPI | 0.111.0 |
| **Server** | Uvicorn | 0.29.0 |
| **ORM** | SQLAlchemy | 2.0.30 |
| **Migrations** | Alembic | 1.13.1 |
| **Validation** | Pydantic | 2.7.1 |
| **Logging** | Loguru | 0.7.2 |
| **QR Generate** | qrcode + Pillow | 7.4.2 + 10.3.0 |
| **Database** | SQLite (local) / PostgreSQL (prod) | — |
| **Python** | 3.11 (via conda) | 3.11.11 |
| **Node.js** | 22.x | 22.16.0 |
| **Package Mgmt** | Poetry (backend) / npm (frontend) | 2.2.1 / 10.9.2 |
