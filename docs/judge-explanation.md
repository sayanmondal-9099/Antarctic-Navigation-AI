# Executive Summary for Hackathon Judges

## The Problem
Antarctic navigation is incredibly dangerous. Captains currently rely on fragmented, delayed information—checking weather on one screen, sea-ice limits on a printed chart, and radioing other ships for positions. A sudden storm or drifting iceberg can trap a vessel, and traditional route planners don't understand these dynamic hazards.

## The Solution
We built an **Antarctic Maritime Navigation Decision-Support System**. It acts as a centralized "brain" that ingests all environmental data (ice, weather, currents) and ship positions into a single tactical ECDIS (Electronic Chart Display and Information System). It calculates the safest routes automatically and alerts the fleet if a collision or hazard is imminent.

## The Data
Our architecture is designed to pull live telemetry from the European Space Agency's **Copernicus Marine Service** (for ocean currents) and the **National Snow and Ice Data Center (NSIDC)** (for sea-ice concentrations), alongside simulated live AIS tracking for fleet telemetry.

## The AI / ML Module
We use Machine Learning (ML) to forecast short-term **Iceberg Drift**. Instead of just knowing where an iceberg is *right now*, the ML engine predicts where it will be in 12 hours based on wind and current vectors. The routing engine uses this forecast to avoid routing ships into future danger.

## The Routing Engine
We utilize a heavily modified **A* (A-Star) Algorithm**. Unlike standard GPS which just finds the shortest distance, our A* pathfinder assigns a "risk weight" to every grid cell. If a cell contains heavy sea ice or a forecasted iceberg, the algorithm mathematically avoids it, calculating the safest "corridor".

## Multi-Vessel Coordination
A major innovation is our multi-vessel physics engine. If two ships are on intersecting paths in a narrow ice channel, standard planners fail. Our system uses maritime physics (COLREGS, CPA - Closest Point of Approach) to detect the conflict and actively calculate an evasion or "lay-by" route for the secondary vessel.

## Safety & Offline Architecture
Antarctica has terrible internet connectivity. Our biggest engineering achievement is the **Deterministic Fallback Engine**. If satellite links drop and the live data APIs fail, our FastAPI backend instantly falls back to cached SQLite data and baseline mathematical kinematics. The user interface never crashes, and the captain is never left blind.
