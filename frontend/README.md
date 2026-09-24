# Antarctic Navigation AI — Frontend Application

React 19 + TypeScript + Vite tactical situational interface for the Antarctic Navigation Decision-Support System.

## Architecture

* `src/components/`: Modular screen components including Polar ECDIS chart, pilot HUD, voyage planner, and conflict resolver.
* `src/services/api/`: Centralized API service with timeout and error interceptors.
* `src/types/`: Shared TypeScript data models (`Vessel`, `Position`, `Waypoint`, `Route`, `RiskScore`, `Alert`).
* `src/data/`: Deterministic fallback dataset stores.

## Development

```bash
# Install dependencies
npm install

# Start development server on port 5173
npm run dev -- --host 127.0.0.1 --port 5173

# Run static linter
npm run lint

# Build production bundle
npm run build
```
