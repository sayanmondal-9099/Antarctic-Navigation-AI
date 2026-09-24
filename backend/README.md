# Antarctic Navigation AI — Backend API

FastAPI backend providing geospatial risk evaluation, A* lattice routing, 4D iceberg drift forecasting, and COLREGS multi-vessel collision deconfliction.

## Architecture

* `app/api/`: REST route handlers (`health.py`, `telemetry.py`, `routing.py`).
* `app/core/`: Application settings and environment configuration.
* `app/models/`: Pydantic V2 schemas for request bodies and responses.
* `app/risk/`: 2D multi-layer spatial risk grid builder (`grid.py`, `engine.py`).
* `app/routing/`: Lattice A* pathfinder and CPA/TCPA deconfliction (`astar_grid.py`, `deconfliction.py`).
* `app/services/`: Dynamic caching layer and kinematic temporal drift forecast.
* `tests/`: Automated unit & integration tests.

## Development

```bash
# Activate environment
source ../.venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server on port 8000
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Run tests
python3 tests/test_health.py
```
