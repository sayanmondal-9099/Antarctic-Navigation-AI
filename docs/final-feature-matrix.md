# Final Feature Matrix

| Feature | Status | Data Source | Fallback Strategy | Demo Status |
| :--- | :--- | :--- | :--- | :--- |
| **Sea Ice** | Ready | NSIDC | Demo Cache | Ready |
| **Icebergs** | Ready | BYU/NIC | Demo Cache | Ready |
| **Weather** | Ready | ERA5 | Demo Cache | Ready |
| **Currents** | Ready | Copernicus | Demo Cache | Ready |
| **ML Forecast** | Experimental | Inference Engine | Kinematics Baseline | Ready |
| **AIS Tracking**| Optional | Simulated AIS | `vessels.json` | Ready |
| **Supabase** | Ready | PostgreSQL (RLS) | Mock Auth & Offline Datasets | Ready |
| **SOS / Alerts**| Ready | Client Event | Local Store | Ready |
| **A* Routing** | Ready | Live Compute | Static Waypoints | Ready |
