# Hackathon Demo Runbook

This guide ensures a seamless, deterministic presentation of the Antarctic Maritime Navigation System.

## Pre-requisites
- Ensure node and python 3.13 are installed.
- Ensure ports `5173` and `8000` are clear.

## Startup
1. **Terminal 1 (Backend):**
   ```bash
   cd backend
   uv run uvicorn app.main:app --reload --port 8000
   ```
2. **Terminal 2 (Frontend):**
   ```bash
   cd frontend
   npm run dev
   ```
3. Open `http://localhost:5173` in a maximized browser window.

## Demonstration Flow
1. **Login:** Log in with `command@demo.local` using the password `password`. Note the smooth layout mapping and the immediate visual load of data layers.
2. **Verify System Health:** Point out the colored 'System Status' telemetry indicators at the top right of the Command Center verifying that the UI is seamlessly handling DEMO mock intercepts for missing environmental feeds.
3. **Select Vessel:** Open the Fleet Panel, click "Ship B", and show the UI focusing and updating telemetry.
4. **Show Environmental Conditions:** Highlight the Risk Map cells turning colors and indicating safe vs dense ice limits based on weather.
5. **Calculate Route:** Go to the `Route Calculator` tab, select "Palmer Base" destination for "Ship B", and hit 'Calculate'. Watch the A* Engine return an optimal route in real-time.
6. **Compare Routes:** Discuss the alternative routes shown, emphasizing the differing Risk Scores (e.g., standard vs optimized).
7. **Show Multi-Vessel Conflict:** Open the `Conflict Resolver` tab and present Scenario 2 (crossing vectors). Show how the system visually illustrates collisions and recalculates a safe alternative starboard lay-by path.
8. **Show Forecast:** Return to the Map and highlight how iceberg rendering and vectors use localized drift forecasting over time.
9. **Trigger Controlled Alert:** Simulate a Blizzard via the Navigator window's Environment control toggle. Note the updated risk assessment dynamically turning sections of the route 'CRITICAL'.
10. **Trigger SOS:** Open the `Navigator` tab, scroll down, and trigger the red "SOS DISTRESS" alarm to broadcast a general collision or hull breach.
11. **Acknowledge SOS:** Check that the top-level notification header immediately flashes red. Click 'Deactivate Alarm / Broadcast Rescue' to verify the UI correctly suppressing and resolving the distress condition without breaking logic.
12. **Reset Demo:** Reload the webpage (cmd+r or ctrl+r) to clear the active routes and start a fresh visual instance if demonstrating to multiple judges.

