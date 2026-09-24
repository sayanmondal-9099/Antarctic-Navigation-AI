# Antarctic Navigation AI - Project Constitution and Rules

## Objective
Build a prototype decision-support system for Antarctic maritime navigation.

## Core Principle
Safety-first route optimization rather than shortest-distance routing.

## Technology Stack
- **Frontend:** React, TypeScript, Leaflet
- **Backend:** Python, FastAPI
- **Data:** NSIDC, BYU/NIC, Copernicus, ERA5, ISRO/MOSDAC (where available), AIS or simulated vessel positions
- **Routing:** NetworkX, A*, GeoPandas, Shapely
- **ML:** PyTorch, XGBoost, scikit-learn
- **Database/Auth:** Supabase (PostgreSQL + Supabase Auth)

## Development Rules
1. Keep frontend and backend separated.
2. Use typed API schemas.
3. Never hard-code API keys.
4. Store secrets in environment variables.
5. Never commit credentials.
6. Validate all external data.
7. Every external data source must have a fallback.
8. Historical/local datasets should support offline demo operation.
9. ML must never be the only source of navigation decisions.
10. Provide a deterministic fallback routing method.
11. Multi-vessel awareness must be represented as a risk/context layer.
12. Keep SOS monitoring independent from route calculation.
13. Do not claim the system is certified for real-world navigation.
14. Prefer simple, testable architecture over unnecessary complexity.
15. Do not add dependencies unless necessary.
16. Run tests after significant changes.
17. Explain major architectural changes before implementing them.

## Supabase Architecture
1. **Scope:** Supabase primarily manages: users, ships, routes, alerts, configuration, demo state.
2. **Data Pipeline:** Large scientific datasets should not automatically become PostgreSQL rows.
3. **Flow:** Scientific datasets -> Python data pipeline -> Processed GeoJSON / Parquet / JSON -> Backend -> Supabase -> Frontend.
