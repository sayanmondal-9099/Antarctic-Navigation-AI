# AGENTS.md — Architecture & Engineering Guidelines

This document establishes the architectural standards and core principles for all AI agents and engineers contributing to the **Antarctic Maritime Navigation Decision-Support System**.

---

## 1. Core Architectural Principles

1. **Safety-First Routing**:
   - System optimizes for `SAFE + EFFICIENT ROUTE`, never raw shortest distance.
   - Always maintain standard safety clearance buffers around dynamic iceberg polygons.
2. **Deterministic Fallback**:
   - Routing and risk systems MUST function 100% offline using `data/sample/` benchmark datasets if internet, Copernicus, weather APIs, or Supabase are unreachable.
3. **Modular Domain Separation**:
   - Do NOT create monolithic Python scripts or single bloated React components.
   - Keep ingestion, validation, risk engine, routing pathfinder, API routes, and UI screens in their respective directory structures.
4. **Multi-Vessel Awareness**:
   - Vessels are treated as dynamic obstacle/traffic contacts with CPA (Closest Point of Approach) and TCPA monitoring adhering to COLREGS rules.
5. **Explainability**:
   - Every recommended route must expose distance, duration, risk breakdown, and routing rationale.

---

## 2. API Contract Standards

* Base prefix for REST endpoints: `/api`
* Use Pydantic models for all request bodies and responses in `backend/app/models/schemas.py`.
* Endpoints must return structured HTTP errors (e.g., `HTTP 404`, `HTTP 422`, `HTTP 500`) without exposing raw tracebacks or secret tokens.

---

## 3. Frontend Standards

* Centralize all API calls in `frontend/src/services/api/` using typed methods.
* Base URL configured via `VITE_API_BASE_URL` environment variable (default: `/api` proxied to port `8000`).
* Handle API offline/failure states gracefully without crashing the UI.
* Maintain clean component exports in `frontend/src/components/index.ts`.
