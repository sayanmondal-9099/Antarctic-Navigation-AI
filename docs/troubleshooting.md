# Troubleshooting Guide

### Port Conflicts
- **Frontend (5173):** If `npm run dev` complains about port 5173 being in use, you can kill the process using:
  ```bash
  lsof -i :5173
  kill -9 <PID>
  ```
- **Backend (8000):** If `uvicorn` fails to bind, run:
  ```bash
  lsof -i :8000
  kill -9 <PID>
  ```

### Missing `.env` Configuration
If the frontend loads but cannot fetch any data (blank map or spinning loaders), ensure that `frontend/.env.development` exists and `VITE_API_BASE_URL` is set appropriately, though Vite proxy `/api` usually handles this out of the box in dev mode.

### Cache Invalidations / "Weird UI States"
If the presentation state gets poisoned due to random interactions or if the backend state differs from the frontend:
- Use the **RESET DEMO** button in the Command Center header (which clears local UI state via reload).
- If problems persist, clear your browser's Local Storage and Session Storage.

### Supabase Unresponsive / Offline Mode
If Supabase is unreachable or not yet configured, the system automatically falls back to offline DEMO mode. Ensure `VITE_DEMO_MODE=true`. This activates the synthetic authentication provider and offline navigation datasets, bypassing the need for an active Supabase cloud connection.
