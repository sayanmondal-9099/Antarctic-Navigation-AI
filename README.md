# Antarctic Maritime Navigation Decision-Support System

An intelligent decision-support and visualization platform designed for polar navigation, sea ice hazard evaluation, multi-vessel collision deconfliction (COLREGS), and deterministic risk-aware route planning in the Southern Ocean.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Vanilla CSS Design System, Leaflet / SVG Polar ECDIS Charting |
| **Backend** | Python 3.11+, FastAPI, Pydantic V2, Uvicorn |
| **Geospatial & Routing** | Shapely (Polygon Hazards & Buffering), NetworkX (Lattice Graph A* Pathfinder) |
| **Data & Kinematics** | NumPy, Pandas, 4D Kinematic Drift Simulation |
| **Cloud, Auth & Hosting** | Supabase (Auth + PostgreSQL), Vercel (Frontend), Docker / Linux Container (FastAPI) |

---

## Project Structure

```text
Antarctic-Navigation-AI/
├── backend/
│   ├── app/
│   │   ├── api/            # API Route Handlers (telemetry, routing, health)
│   │   ├── core/           # Configuration & App Settings
│   │   ├── data/           # Filesystem Loader
│   │   ├── models/         # Pydantic V2 schemas (Vessel, Iceberg, Route, Risk)
│   │   ├── risk/           # 2D Spatial Risk Raster & Threat Engine
│   │   ├── routing/        # Lattice A* Pathfinder & COLREGS Deconfliction
│   │   ├── services/       # Ingestion Caching & Temporal Drift Forecast
│   │   └── main.py         # FastAPI Entrypoint & CORS Middleware
│   ├── tests/              # Automated Backend Unit & Integration Tests
│   ├── requirements.txt    # Python Dependencies
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── api/            # Re-exports for API Client
│   │   ├── components/     # UI Components (AntarcticMap, Navigator, etc.)
│   │   ├── data/           # Mock & Local Data Stores
│   │   ├── services/api/   # Centralized Axios API Service
│   │   ├── types/          # TypeScript Interface Definitions
│   │   ├── App.tsx         # Main App Shell & State Switcher
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts      # Dev Proxy Configuration
│   └── README.md
├── data/
│   ├── raw/                # Ingested NetCDF / GRIB2 Raw Data (gitignored)
│   ├── processed/          # Cached Normalized Geometries
│   ├── sample/             # Benchmark Offline Datasets (vessels.json, icebergs.json)
│   └── README.md
├── scripts/
│   ├── download/           # Download Adapters (Copernicus, ERA5, US NIC)
│   ├── preprocessing/      # Raster Interpolation & Polygonization
│   └── validation/         # Input Schema Validation
├── .env.example            # Environment Configuration Template
├── AGENTS.md               # Architecture Principles & Guidelines for AI Agents
└── README.md
```

---

## Step-by-Step Development Instructions

### 1. Prerequisites
* **Python**: `≥ 3.11`
* **Node.js**: `≥ 20.x`
* **npm**: `≥ 10.x`

---

### 2. Backend Setup & Run

#### A. Create & Activate Python Environment
```bash
# In the root directory:
python3 -m venv .venv
source .venv/bin/activate    # macOS / Linux
# .venv\Scripts\activate     # Windows
```

#### B. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

#### C. Start FastAPI Backend
```bash
# Start uvicorn development server on port 8000
python3 -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
* **API Root / Health**: `http://127.0.0.1:8000/api/health`
* **API Version**: `http://127.0.0.1:8000/api/version`
* **Interactive Docs**: `http://127.0.0.1:8000/docs`

#### D. Run Backend Tests
```bash
python3 backend/tests/test_health.py
# Or with unittest discovery:
PYTHONPATH=backend python3 -m unittest discover -s backend/tests
```

---

### 3. Frontend Setup & Run

#### A. Install Node Dependencies
```bash
cd frontend
npm install
```

#### B. Configure Environment Variables
Copy `.env.example` to `frontend/.env` (optional, defaults to `/api` proxy):
```env
VITE_API_BASE_URL=/api
```

#### C. Start Vite Development Server
```bash
npm run dev -- --host 127.0.0.1 --port 5173
```
Open **`http://127.0.0.1:5173`** in your browser.

#### D. Run Frontend Linter & Build Tests
```bash
npm run lint    # Oxlint static analysis
npm run build   # Production TypeScript bundle validation
```

---

## Core Operational Principles

1. **Safety-First Routing**: Optimization minimizes composite ice hazard risk and shallow bathymetric shoals rather than just shortest Euclidean distance.
2. **Deterministic Offline Fallback**: All engines seamlessly fall back to verified local datasets (`data/sample/`) if external feeds or cloud networks are unreachable.
3. **Multi-Vessel Deconfliction**: Active vessels monitor CPA (Closest Point of Approach) and TCPA with COLREGS Rule 14/15/16 evasion options.
4. **Explainable AI**: Every route details its distance, transit duration, ice thickness profile, and safety justification score.
