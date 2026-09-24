# 5-Minute Hackathon Demo Script

Target: 5 Minutes. This is the comprehensive presentation designed for technical and operational judges.

**[00:00 - 00:30] Introduction & Operational Picture**
*Action:* Open Command Center.
*Speaker:* "Welcome. Antarctic maritime operations suffer from severe data fragmentation, leading to catastrophic risk miscalculation. We built this Decision-Support System to unify fragmented scientific telemetry into a single, real-time deterministic risk engine."
*Action:* Point to the main map showing icebergs, sea-ice grid, and multiple vessels.

**[00:30 - 01:15] Problem Context & Vessel Selection**
*Action:* Open Fleet Panel -> Select Research Vessel 'Aurora Australis'.
*Speaker:* "Currently, ships plan routes independently using static charts. But ice drifts, weather changes, and other ships move. Let's look at the Aurora Australis, currently requesting a route to Palmer Base."

**[01:15 - 02:00] Risk Engine & Route Planning**
*Action:* Navigate to Route Calculator -> Calculate Route.
*Speaker:* "When we request a route, our backend doesn't just draw a line. An A* risk-aware algorithm processes 4 dynamic layers—Sea Ice, Icebergs, Weather, and Current. It outputs the safest corridor, quantifying the exact risk factors."
*Action:* Show the Route Summary panel highlighting the 'MODERATE' risk and 'FAVORABLE' currents.

**[02:00 - 02:45] Multi-Vessel Coordination (The Differentiator)**
*Action:* Navigate to Conflict Resolver -> Load 'Gerlache Crossing'.
*Speaker:* "The true differentiator is our multi-vessel physics engine. If a Supply Vessel crosses the Research Vessel's path, standard algorithms fail. Our system uses COLREGS deterministic kinematics to identify the collision vector (CPA) and instantly calculates a lay-by evasion route."
*Action:* Point to the intersection graphic on the map.

**[02:45 - 03:30] ML Forecasting**
*Action:* Zoom into an iceberg cluster.
*Speaker:* "We don't just route based on the *current* state. Our ML forecasting module predicts short-horizon iceberg drift based on ocean currents. The A* engine adjusts corridors preemptively so we don't route a ship into a future hazard."

**[03:30 - 04:30] Controlled Emergency (SOS)**
*Action:* Open Navigator screen -> Click red 'SOS DISTRESS'.
*Speaker:* "But emergencies happen. A hull breach or engine failure requires instant multi-vessel coordination. When the Navigator broadcasts an SOS..."
*Action:* Show the flashing red Command Center header.
*Speaker:* "...The Command Center immediately receives the telemetry block, halting non-critical routings and locking onto the distress coordinates to coordinate rescue vessels."
*Action:* Click 'Deactivate Alarm'.

**[04:30 - 05:00] Architecture & Offline Resilience**
*Speaker:* "Finally, this entire system is designed for zero-connectivity. Built on React and FastAPI, if satellite links to Copernicus drop, the system intercepts network timeouts and seamlessly relies on localized deterministic kinematics and cached SQLite arrays. It never crashes."

*Action:* Click 'RESET DEMO'.
*Speaker:* "Thank you. We're ready for questions."
