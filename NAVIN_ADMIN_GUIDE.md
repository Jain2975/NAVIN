# NAVIN — Admin User Guide

> This document is for parking structure administrators and operators.  
> It explains every screen in the NAVIN system and how to manage it.

---

## Table of Contents

1. [Quick Start — Getting NAVIN Running](#quick-start)
2. [Testing on Your Phone](#testing-on-your-phone)
3. [Page-by-Page Walkthrough](#page-by-page-walkthrough)
   - [Entry Gate (Home Page)](#1-entry-gate--home-page)
   - [Navigate Page](#2-navigate-page)
   - [Parked Page](#3-parked-page)
   - [Exit Gate Page](#4-exit-gate-page)
   - [Admin Dashboard](#5-admin-dashboard)
4. [QR Code Setup](#qr-code-setup)
5. [Understanding Sensor Data](#understanding-sensor-data)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Starting the Servers

Open two terminal windows:

**Terminal 1 — Backend (API Server)**
```bash
cd /Users/shivambajaj/Desktop/NAVIN/backend
poetry run uvicorn app.main:app --reload --port 8000
```
You should see: `Uvicorn running on http://127.0.0.1:8000`

**Terminal 2 — Frontend (Web App)**
```bash
cd /Users/shivambajaj/Desktop/NAVIN/frontend
npm run dev
```
You should see:
```
VITE ready in 250ms
➜  Local:   http://localhost:5173/
➜  Network: http://YOUR_IP:5173/
```

### Accessing NAVIN

| Device | URL | Use case |
|--------|-----|----------|
| **Your laptop** | `http://localhost:5173/` | Development & admin access |
| **Phone (same WiFi)** | `http://YOUR_IP:5173/` | Testing the full driver flow with sensors |
| **API docs** | `http://localhost:8000/docs` | Swagger UI for testing API directly |

> **YOUR_IP** is the "Network" address shown when Vite starts (e.g., `10.0.92.55`)

---

## Testing on Your Phone

### Android (Recommended for Testing)

1. Make sure your phone and laptop are on the **same WiFi network**
2. Open **Chrome** on your Android phone
3. Type the Network URL from Vite: `http://YOUR_LAPTOP_IP:5173/`
4. The app loads — camera and sensors work immediately on HTTP
5. Try the full flow: Demo Entry → see sensors updating → tap a bay to park → exit

### iPhone (Requires HTTPS)

iPhone Safari blocks sensor access on plain HTTP. Two options:

**Option A: ngrok tunnel (easiest)**
```bash
# Install ngrok (one-time)
brew install ngrok

# In a new terminal, tunnel port 5173
ngrok http 5173
```
ngrok gives you a `https://xxxxx.ngrok.io` URL — open that on iPhone Safari.

**Option B: Deploy to Vercel**
Once deployed, the HTTPS URL works natively on iPhone.

### What to Expect on Your Phone

- **Entry Page**: Camera opens showing the live viewfinder with a scanning overlay
- **Navigate Page**: Sensor values update in real-time as you move the phone
  - Tilt, rotate, walk around — watch the numbers change
  - The activity status changes: UNKNOWN → WALKING → STATIONARY
  - After 8 seconds of being still → PARKED state triggers
- **On Desktop**: Sensor values show 0.0 (no hardware) — this is normal

---

## Page-by-Page Walkthrough

### 1. Entry Gate (Home Page)

**URL**: `http://localhost:5173/` or `http://YOUR_IP:5173/`

**What the driver sees:**
```
┌─────────────────────────────┐
│         🅿️ NAVIN            │
│    Indoor Parking Navigation │
│                              │
│   ┌──────────────────────┐   │
│   │                      │   │
│   │    📷 Live Camera    │   │
│   │    with scan overlay │   │
│   │                      │   │
│   └──────────────────────┘   │
│                              │
│  Point camera at entry QR    │
│                              │
│  ┌──────────────────────┐    │
│  │ 🧪 Demo Entry (No QR)│    │
│  └──────────────────────┘    │
└──────────────────────────────┘
```

**How it works:**
1. The camera opens automatically and scans for QR codes
2. When a valid NAVIN QR is detected, it reads the `structure_id` and `gate` number
3. A new session is created on the backend (POST `/api/sessions/entry`)
4. The driver is automatically redirected to the Navigate page

**Demo Entry button**: For testing without a printed QR code — creates a session using the demo parking structure (`struct_demo_001`)

**What the admin should know:**
- The camera error "play() request was interrupted" is normal on desktop — it still works
- On phone, you must grant camera permission when prompted
- QR codes must contain valid JSON: `{"structure_id": "struct_demo_001", "gate": 1, "type": "entry"}`

---

### 2. Navigate Page

**URL**: `http://localhost:5173/navigate/SESSION_ID`

**What the driver sees:**
```
┌──────────────────────────────┐
│  🧭 Navigate          ⏸️     │
│  Session: 289371be…   STATIONARY│
├──────────────────────────────┤
│  Sensor Data           🟢 LIVE│
│  🧭 Magnetometer  📐 Accelerometer│
│  Alpha   25.3°     X   0.1m/s²│
│  Beta   -12.1°     Y   9.8m/s²│
│  Gamma   41.7°     Z   0.3m/s²│
│  ──────────────────────────── │
│  Magnitude  Steps  Pressure   │
│    9.8       47      1013     │
├──────────────────────────────┤
│  ┌────────────────────────┐  │
│  │    🗺️ Floor Map        │  │
│  │  🟢🟢🟢🟢🟢            │  │
│  │  🟢🟢🟢🟢🟢            │  │
│  │       🔵 (you)         │  │
│  └────────────────────────┘  │
├──────────────────────────────┤
│  Parking Bays    🟢 Free 🔴 Taken│
│  [Floor 1] Floor 2           │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐  │
│  │A1│ │B1│ │C1│ │D1│ │E1│  │
│  │⚡│ │⚡│ │🟢│ │🟢│ │🟢│  │
│  ├──┤ ├──┤ ├──┤ ├──┤ ├──┤  │
│  │F1│ │G1│ │H1│ │I1│ │J1│  │
│  │🟢│ │🟢│ │🟢│ │🟢│ │🟢│  │
│  └──┘ └──┘ └──┘ └──┘ └──┘  │
└──────────────────────────────┘
```

**How it works:**

1. **Sensor Display**: Shows real-time magnetometer (compass heading) and accelerometer data
   - On phone: values update 60 times/second as you move
   - On desktop: shows 0.0 for all values (no sensor hardware)
   - The green "LIVE" dot confirms sensor collection is active

2. **Activity Status** (top-right corner):
   - `❓ UNKNOWN` — just started, no data yet
   - `🚶 WALKING` — accelerometer detects movement + steps
   - `⏸️ STATIONARY` — movement stopped for < 8 seconds
   - `🅿️ PARKED` — still for 8+ seconds → triggers parking banner

3. **Floor Map**: Dark-themed Leaflet map showing:
   - Green circles = free bays
   - Red circles = occupied bays
   - Blue dot = estimated user position

4. **Occupancy Grid**: Tap a **green bay** to park in it
   - Green border + label = free (tappable)
   - Red border + label = occupied (disabled)
   - ⚡ icon = EV charging bay
   - Floor tabs switch between Floor 1 / Floor 2

5. **Parking Banner**: When the classifier detects PARKED state:
   - A green-glowing banner appears: "Vehicle appears parked — select your bay"
   - Driver taps a free bay → session becomes "parked"
   - Can dismiss with "I'm still walking" if it was a false positive

**What the admin should know:**
- Bay status updates every 10 seconds (polling)
- The occupancy grid reflects real-time changes across all users
- Sensor batches are stored in the database for later analysis

---

### 3. Parked Page

**URL**: `http://localhost:5173/parked/SESSION_ID`

**What the driver sees:**
```
┌──────────────────────────────┐
│          🚗                  │
│     Vehicle Parked           │
│   Your parking is confirmed  │
├──────────────────────────────┤
│   ┌──────┐  ┌──────┐        │
│   │ Bay  │  │ Zone │        │
│   │2c7279│  │  H   │        │
│   └──────┘  └──────┘        │
│   ┌─────────────────┐       │
│   │    Duration      │       │
│   │    5h 30m        │       │
│   └─────────────────┘       │
├──────────────────────────────┤
│  Session: 289371be-112…      │
│  Status:  PARKED             │
├──────────────────────────────┤
│  ┌──────────────────────┐    │
│  │  🚪 Exit Parking      │    │
│  └──────────────────────┘    │
└──────────────────────────────┘
```

**How it works:**
1. Shows confirmation that the vehicle is parked
2. **Bay ID**: The specific parking bay assigned
3. **Zone**: The zone letter (A–J) assigned at entry
4. **Duration**: Live timer counting up from entry time (updates every second)
5. **Session info**: Session ID and PARKED status badge
6. **Exit Parking button**: When the driver is leaving:
   - Calls `POST /api/sessions/{id}/exit`
   - Frees the bay (occupied → free)
   - Calculates total duration
   - Clears session from browser storage
   - Redirects to Exit page

**What the admin should know:**
- The duration timer is calculated client-side (entry_time vs now)
- The session persists in `localStorage` — survives page refresh
- If a driver closes the browser without exiting, their session stays "parked" until manually resolved

---

### 4. Exit Gate Page

**URL**: `http://localhost:5173/exit`

**What the driver sees:**
```
┌──────────────────────────────┐
│          ✅                  │
│    Session Complete          │
│  Thank you for using NAVIN.  │
│       Drive safely!          │
│                              │
│  ┌──────────────────────┐    │
│  │  Start New Session    │    │
│  └──────────────────────┘    │
└──────────────────────────────┘
```

**How it works:**
1. Simple confirmation that the session has ended
2. The parking bay has been freed for the next driver
3. "Start New Session" button returns to the Entry Gate page
4. `localStorage` has been cleared — fresh start

**What the admin should know:**
- This page is shown after a successful exit
- The backend has recorded: entry time, exit time, duration, bay used, zone, and all sensor batches

---

### 5. Admin Dashboard

**URL**: `http://localhost:5173/admin`

**What the admin sees:**
```
┌──────────────────────────────────────────────┐
│  ⚙️ Admin Dashboard                🔄 Refresh│
├──────────────────────────────────────────────┤
│  ┌────┐  ┌────┐  ┌──────┐  ┌────────┐      │
│  │ 🟢 │  │ 🅿️ │  │  🚪  │  │   📦   │      │
│  │  3  │  │  5  │  │  12  │  │   47   │      │
│  │Active│ │Parked│ │Exited│  │Batches │      │
│  │      │ │      │ │Today │  │ Today  │      │
│  └────┘  └────┘  └──────┘  └────────┘      │
├──────────────────────────────────────────────┤
│  [📋 Sessions] [📜 Logs] [📱 QR Codes]      │
├──────────────────────────────────────────────┤
│  ID        Status   Zone  Entry    Duration  │
│  289371be… EXITED    H    12:51:24   1m     │
│  35fdedfa… ACTIVE    J    12:40:41   —      │
│  78bf47ce… EXITED    G    12:40:12   0m     │
└──────────────────────────────────────────────┘
```

**Three tabs:**

#### 📋 Sessions Tab
- Shows the last 100 sessions in reverse chronological order
- Each row shows: truncated session ID, status badge, assigned zone, entry time, duration
- Status badges are color-coded:
  - 🟢 **ACTIVE** (blue) — driver is navigating, hasn't parked yet
  - 🟠 **PARKED** (orange) — vehicle is in a bay
  - ✅ **EXITED** (green) — session complete

#### 📜 Logs Tab
- Shows the last 50 lines from the server log file (`logs/navin.log`)
- Color-coded: red for errors, yellow for warnings, gray for info
- Useful for debugging API issues in real-time
- Log entries include timestamps and request details

#### 📱 QR Codes Tab
- Displays the **Entry QR** and **Exit QR** codes for `struct_demo_001`
- Each QR has a "Download to print" link
- Print these and place at your parking structure's entry/exit gates
- QR contains: `{"structure_id": "struct_demo_001", "gate": 1, "type": "entry"}`

**Dashboard auto-refreshes every 15 seconds.** Click 🔄 Refresh for immediate update.

**Stats explanation:**
- **Active**: Sessions where the driver entered but hasn't parked yet (navigating)
- **Parked**: Sessions where the driver has selected a bay (vehicle in structure)
- **Exited Today**: Sessions completed today (since midnight UTC)
- **Batches Today**: Number of sensor data uploads received today

---

## QR Code Setup

### For Your Parking Structure

1. Go to `http://localhost:5173/admin` → click **📱 QR Codes** tab
2. Download the **Entry QR** and **Exit QR** PNG images
3. Print them large (at least 15×15 cm) on white paper
4. Laminate for durability
5. Mount at your parking structure:
   - **Entry QR** → on the pillar at the entry gate, at phone-camera height (~1.5m)
   - **Exit QR** → on the pillar at the exit gate

### Alternatively, access QR images directly:
- Entry QR: `http://localhost:8000/api/qr/struct_demo_001`
- Exit QR: `http://localhost:8000/api/qr/struct_demo_001/exit`

### Creating QR for a New Structure

```bash
# Create a new structure via API
curl -X POST http://localhost:8000/api/structures \
  -H "Content-Type: application/json" \
  -d '{"name": "My Parking Garage", "total_bays": 50, "floor_count": 3}'

# Response: {"id": "abc123...", "name": "My Parking Garage"}
# Use that ID for QR codes:
# http://localhost:8000/api/qr/abc123...
```

---

## Understanding Sensor Data

### What the Numbers Mean

On the Navigate page, the Sensor Data panel shows:

| Reading | Source | What it tells us |
|---------|--------|-----------------|
| **Alpha** | Magnetometer | Compass heading (0–360°). Changes when you rotate |
| **Beta** | Magnetometer | Phone tilt front/back (-180 to 180°) |
| **Gamma** | Magnetometer | Phone tilt left/right (-90 to 90°) |
| **X** | Accelerometer | Sideways force (m/s²) |
| **Y** | Accelerometer | Forward/backward force (m/s²) |
| **Z** | Accelerometer | Up/down force (~9.8 = gravity when flat) |
| **Magnitude** | Computed | √(x²+y²+z²) — should be ~9.8 when phone is still |
| **Steps** | Computed | Increments when phone detects a step (magnitude spike > 12.0) |
| **Pressure** | Barometer | Atmospheric pressure in hPa (changes between floors) |

### Activity States

The system automatically detects what the driver is doing:

| State | Icon | How it's detected | What happens |
|-------|------|-------------------|--------------|
| UNKNOWN | ❓ | Initial state | Nothing — waiting for data |
| WALKING | 🚶 | Accel variance > 1.2 + steps > 3 | Sensor batches stream to server |
| STATIONARY | ⏸️ | Accel variance drops, < 2 seconds | Monitoring continues |
| PARKED | 🅿️ | Stationary for 8+ seconds | Green banner: "confirm parking?" |

---

## Troubleshooting

### Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| **Sensors show 0.0** | Desktop has no sensor hardware | Normal — test on phone instead |
| **Camera doesn't open** | Permission denied | Allow camera access in browser settings |
| **"Camera access denied" error** | Browser blocked the camera | Click the lock icon → allow camera |
| **Phone can't reach app** | Not on same WiFi | Connect both to same network |
| **Phone shows "connection refused"** | Vite not bound to 0.0.0.0 | Already configured — restart `npm run dev` |
| **iOS sensors don't work** | Requires HTTPS | Use ngrok: `ngrok http 5173` |
| **Bay click doesn't work** | Bay is occupied (red) | Only green (free) bays are tappable |
| **Session lost after refresh** | Browser cleared localStorage | Session ID persists in localStorage normally |
| **"Session not found" error** | Backend restarted (SQLite reset) | Re-seed: `poetry run python seed.py` |
| **Swagger shows 422 error** | Missing required field | Check the request body matches schema |

### Reseeding the Database

If you need to reset all data (start fresh):
```bash
cd /Users/shivambajaj/Desktop/NAVIN/backend
poetry run python seed.py
```
This clears all existing structures and bays, then creates the demo structure with 20 fresh bays.

### Checking Server Health

```bash
# Backend health
curl http://localhost:8000/
# Expected: {"app":"NAVIN","version":"1.0.0","status":"running"}

# Frontend health
curl -s http://localhost:5173/ | head -5
# Expected: HTML with "NAVIN" title
```

### Viewing Logs

```bash
# Live log tail
tail -f /Users/shivambajaj/Desktop/NAVIN/backend/logs/navin.log

# Or via admin dashboard
open http://localhost:5173/admin  # → click "Logs" tab
```
