# Hackathon Demo Script (5-Minute Presentation)

This script provides a structured 5-minute flow for presenting the Antarctic Navigation AI.

**[00:00] Introduction & Login**
"Welcome to the Antarctic Maritime Navigation Decision-Support System. I'm going to demonstrate how our platform ensures safe passage in one of the most hazardous environments on earth."
- *Action:* Log into the system using the mock `command@demo.local` account.
- *Action:* Point out the Command Center loading and verify the 'DEMO MODE' indicator is active in the top-right header for the presentation.

**[00:20] Operational Picture**
"Here is the tactical ECDIS map. Notice the telemetry on the right, providing real-time conditions. Even if we lose connection to Copernicus or NSIDC, the system intercepts with offline heuristics seamlessly."
- *Action:* Hover over an iceberg polygon or weather cell.

**[00:45] Vessel Selection**
- *Action:* Click on "Ship B (Aurora Australis)" in the Fleet panel to focus telemetry.
- "We're currently monitoring the Aurora Australis on its way to Palmer Base."

**[01:00] Risk Visualization**
- *Action:* Toggle the environment grid to "Storm/Blizzard".
- "Watch as the risk matrix dynamically recalculates. The environmental layer clearly demarcates critical hazard zones."

**[01:20] Route Calculation**
- *Action:* Switch to the **Route Calculator** tab. Click 'Calculate Route' for Ship B.
- "Our A* risk-aware engine computes the safest traversal in milliseconds, dynamically avoiding dense sea-ice concentrations."

**[01:45] Route Comparison**
- *Action:* Show the Alternative Routes pane.
- "We offer multiple routes depending on operational limits—safest vs. fastest—each with an average risk score and detailed leg-by-leg explanations."

**[02:10] Multi-Vessel Conflict**
- *Action:* Open the **Conflict Resolver** tab and select 'Scenario: Gerlache Crossing'.
- "With multiple vessels operating in tight corridors, we apply COLREGS deterministic physics."

**[02:30] Conflict Resolution**
- *Action:* Show the intersecting paths and CPA/TCPA calculations.
- "The AI detects a collision vector and immediately plots a starboard lay-by evasion route to deconflict."

**[02:50] ML Forecast Drift**
- *Action:* Switch back to the main map and point out an iceberg.
- "While deterministic physics are the fallback, our ML forecasting models predict short-term iceberg drift. You can see the projected path intersecting our shipping lane over the next 12 hours."

**[03:40] Simulated SOS**
- *Action:* Open the **Navigator** pilot view and click the red 'SOS DISTRESS' button.
- "If a vessel suffers a hull breach or engine failure, a pilot can broadcast an SOS."

**[04:00] Command Center Acknowledgment**
- *Action:* Watch the top header flash red with 'CRITICAL DISTRESS SIGNAL'.
- "The Command Center immediately receives this telemetry. We can acknowledge and lock onto the vessel's coordinates instantly to coordinate rescue."

**[04:20] Architecture Summary & Close**
- *Action:* Click 'Deactivate Alarm' to resolve the alert.
- "This architecture runs on React, FastAPI, and Supabase, and is capable of functioning completely offline on a ship's local network using fallback JSON benchmark stores if cloud connectivity drops. Thank you."

## Demo Backup Plan (Plan A/B/C)
- **Plan A (Deployed):** Run the demo using the live Vercel/Cloud Run URLs.
- **Plan B (Local Demo):** Use `npm run dev` and `uvicorn` on loopback (this is the safest method).
- **Plan C (Failsafe):** If both fail, present the offline architecture diagrams and `walkthrough.md` files while speaking to the system's capabilities.
