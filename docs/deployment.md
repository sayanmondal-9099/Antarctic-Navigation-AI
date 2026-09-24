# Deployment Strategy

This document describes the production deployment architecture for the Antarctic Navigation Decision-Support System.

## Target Production Architecture

```text
USER ──► VERCEL (React 19 + Vite SPA) ──► FASTAPI BACKEND (Render / Docker) ──► SUPABASE (Auth + PostgreSQL RLS)
```

### 1. Frontend (React 19 + TypeScript + Vite)
- **Target:** Vercel (Global Edge CDN)
- **Root Directory:** `frontend`
- **Framework Preset:** `Vite`
- **Build Command:** `npm run build`
- **Output Directory:** `dist/`
- **Routing Configuration:** SPA route rewrite configured via `vercel.json` (`"source": "/(.*)", "destination": "/index.html"`).
- **Environment Variables:**
  - `VITE_API_BASE_URL`: Live FastAPI backend URL (e.g. `https://antarctic-api.onrender.com/api`).
  - `VITE_SUPABASE_URL`: Public Supabase Project URL.
  - `VITE_SUPABASE_ANON_KEY`: Public Supabase Anonymous Key.

### 2. Backend (FastAPI + Python Scientific Container)
- **Target:** Render, Railway, Fly.io, or AWS App Runner / Google Cloud Run (Containerized Linux PaaS).
- **Runtime:** `backend/Dockerfile` with Debian Linux and GEOS/GDAL/PROJ spatial C-libraries.
- **Run Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables:**
  - `APP_ENV=production`
  - `FRONTEND_URL`: Production Vercel domain to enforce strict CORS.
  - `SUPABASE_URL`: Supabase project URL.
  - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (backend-only).
  - `SUPABASE_JWT_SECRET`: Supabase JWT secret for cryptographic bearer token validation.

### 3. Database & Authentication (Supabase)
- **Target:** Supabase (Auth + Managed PostgreSQL).
- **Tables:** `profiles`, `vessels`, `routes`, `route_waypoints`, `alerts`, `simulation_sessions`.
- **Security:** PostgreSQL Row Level Security (RLS) policies matching polar operator roles (`COMMAND_CENTER`, `NAVIGATOR`, `CAPTAIN`, `SCIENTIST`).

## Local / Offline Demo Mode
The application retains 100% deterministic offline fallback regardless of external connectivity:
- Backend: Local loopback on `:8000`.
- Frontend: Local Vite server on `:5173`.
- In offline mode, the system bypasses external services and loads verified benchmark datasets from `data/sample/`.
