# Antarctic Navigation AI

Monorepo containing:

| Directory  | Stack                         |
|------------|-------------------------------|
| `backend/` | Python 3.13 · FastAPI · Uvicorn |
| `frontend/`| React 19 · TypeScript · Vite  |

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | ≥ 3.11 |
| Node.js | ≥ 20 |
| npm | ≥ 10 |

---

## Backend

### 1 — Create / activate the virtual environment

```bash
python3 -m venv .venv          # create (skip if .venv already exists)
source .venv/bin/activate      # macOS / Linux
# .venv\Scripts\activate       # Windows
```

### 2 — Install dependencies

```bash
pip install -r backend/requirements.txt
```

### 3 — Start the development server

```bash
uvicorn app.main:app --reload --app-dir backend
```

### 4 — Run tests

```bash
PYTHONPATH=backend python3 -m unittest discover -s backend/tests
```

The API will be available at **http://localhost:8000**.

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Returns `{"status":"ok", "service":"...", "timestamp":"..."}` |
| `GET /docs` | Auto-generated Swagger UI |
| `GET /redoc` | ReDoc documentation |

---

## Frontend

### 1 — Install dependencies

```bash
cd frontend
npm install
```

### 2 — Start the development server

```bash
npm run dev
```

The app will be available at **http://localhost:5173**.

Vite proxies every `/api/*` request to `http://localhost:8000`, so start the
backend first to see live health data.

### Other scripts

```bash
npm run lint    # run Oxlint
npm run build   # production build (TypeScript + Vite)
npm run preview # preview the production build locally
```

---

## Environment variables

### Frontend (`frontend/.env.local`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_BASE_URL` | `/api` (proxied) | Override backend URL for production |

---

## Project structure

```
Antarctic-Navigation-AI/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          ← FastAPI app + CORS
│   │   └── routes/
│   │       ├── __init__.py
│   │       └── health.py    ← GET /api/health
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_health.py   ← endpoint tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts    ← axios API client
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── vite.config.ts       ← dev proxy config
│   └── package.json
└── README.md
```
