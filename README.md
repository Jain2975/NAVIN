# 🧭 NAVIN — Indoor Parking Navigation PWA

NAVIN is a Progressive Web App that helps drivers navigate inside parking structures using phone sensors. It uses accelerometer, gyroscope, and compass data to track movement and detect when a vehicle has parked.

## 🏗️ Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│   React Frontend    │────▶│   FastAPI Backend    │
│   (Vite + Tailwind) │     │   (Python 3.11+)    │
│                     │     │                     │
│  • QR Scanner       │     │  • Session API      │
│  • Sensor Display   │     │  • Occupancy API    │
│  • Floor Map        │     │  • Sensor Ingest    │
│  • Occupancy Grid   │     │  • Admin Dashboard  │
│  • Activity AI      │     │  • QR Generation    │
└─────────────────────┘     └──────┬──────────────┘
                                   │
                            ┌──────▼──────────────┐
                            │   SQLite Database    │
                            │   (SQLAlchemy ORM)   │
                            └─────────────────────┘
```

## ✨ Features

- **QR Code Entry/Exit** — Scan at gate to start/end session
- **Real-time Sensors** — Accelerometer, gyroscope, compass via browser APIs
- **Activity Detection** — State machine classifies: Walking → Stationary → Parked
- **Dead Reckoning Map** — Canvas-based floor map with heading + step-based positioning
- **Admin Dashboard** — Live stats, session table, log viewer, QR codes, floor plan upload
- **Floor Plan Upload** — Admin can upload a custom parking structure image
- **Mobile-First UI** — Dark glassmorphism design, optimized for phones

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** with [Poetry](https://python-poetry.org/)
- **Node.js 18+** with npm

### Backend

```bash
cd backend
poetry install
poetry run python seed.py          # seed demo data
poetry run uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                        # runs on http://localhost:5173
```

### Test on Phone

1. Ensure phone + laptop are on **same WiFi**
2. Open `http://<YOUR_LAN_IP>:5173/` on your phone
3. **Android**: Set Chrome flag `chrome://flags/#unsafely-treat-insecure-origin-as-secure` with your LAN URL to enable sensors
4. **iOS**: Use `ngrok http 5173` for HTTPS tunnel

## 📁 Project Structure

```
NAVIN/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + CORS
│   │   ├── database.py          # SQLAlchemy engine
│   │   ├── models/              # ORM models (Session, Structure, Bay)
│   │   ├── schemas/             # Pydantic validation
│   │   ├── routers/             # API routes (sessions, occupancy, sensors, admin, qr)
│   │   └── services/            # Business logic
│   ├── alembic/                 # Database migrations
│   ├── tests/                   # Pytest suite (20 tests)
│   ├── seed.py                  # Demo data seeder
│   └── pyproject.toml           # Poetry config
├── frontend/
│   ├── src/
│   │   ├── pages/               # Entry, Navigate, Parked, Exit, Admin
│   │   ├── components/          # SensorDisplay, FloorMap, OccupancyGrid, QRScanner
│   │   ├── hooks/               # useSensors (accel + gyro + compass)
│   │   ├── utils/               # ActivityClassifier state machine
│   │   └── services/api.js      # Axios API client
│   ├── index.html
│   └── vite.config.js
├── NAVIN_APPLICATION_GUIDE.md   # Technical documentation
└── NAVIN_ADMIN_GUIDE.md         # Admin operations manual
```

## 🧪 Running Tests

```bash
cd backend
poetry run pytest tests/ -v       # 20 tests, ~0.2s
```

## 📱 User Flow

1. **Entry Gate** → Scan QR code (or tap Demo Entry)
2. **Navigate** → Walk with phone, see live sensors + map position
3. **Park** → Activity AI detects stillness → select bay
4. **Exit Gate** → Session complete, bay freed

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions/entry` | Create session |
| GET | `/api/sessions/{id}` | Get session details |
| POST | `/api/sessions/{id}/park` | Park in a bay |
| POST | `/api/sessions/{id}/exit` | End session |
| GET | `/api/occupancy/{struct_id}` | Bay status list |
| GET | `/api/occupancy/{struct_id}/summary` | Free/occupied counts |
| POST | `/api/sensors/batch` | Ingest sensor data |
| GET | `/api/sensors/position/{session_id}` | Get estimated position |
| GET | `/api/qr/{struct_id}` | Generate entry QR image |
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/sessions` | All sessions |
| GET | `/api/admin/logs` | Server log tail |
| POST | `/api/admin/floorplan` | Upload floor plan |
| GET | `/api/admin/floorplan/{struct_id}` | Serve floor plan image |

## 📄 License

MIT
