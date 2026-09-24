# Real Data Integration Architecture

## Source
- **Primary SAR:** Copernicus Data Space Ecosystem (CDSE) / Sentinel-1
- **Primary Sea-Ice:** NSIDC / NASA Worldview (AMSR2 / MODIS fallback)

## API Authentication
The `CopernicusService` backend module handles token generation via OData OIDC client credentials (`COPERNICUS_CLIENT_ID` / `COPERNICUS_CLIENT_SECRET`).

## Data Flow
1. **Frontend Init:** `AntarcticMap` invokes `/api/satellite/latest`.
2. **Backend Query:** 
   - `CopernicusService` searches the OData catalog for the latest Sentinel-1 GRD product intersecting the Antarctic WKT AOI.
   - `SeaIceService` generates WMTS URLs for NASA Worldview based on the current date (T-1 day).
3. **Frontend Layering:** 
   - The returned metadata determines if the application runs in "REAL OBSERVATION" or "DEMO SIMULATION" mode.
   - If real observations exist, `SpatialGlobeMap` dynamically layers the WMS/Proxy textures over the `AntarcticSurface` mesh.
4. **Caching:** 
   - Backend caches the Copernicus Bearer Token until expiry (usually 10 mins).
   - Frontend state holds the metadata response to prevent rapid re-fetching.

## Fallback
If the API is unreachable or no product is found, the system gracefully falls back to mock responses with "DEMO SIMULATION" markers, allowing the deterministic demo mode to run without breaking.
