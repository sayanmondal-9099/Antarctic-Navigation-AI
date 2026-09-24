# System Architecture

## High-Level Data Flow

```mermaid
graph TD
    %% External Sources
    subgraph Data Sources
        C[Copernicus Marine]
        N[NSIDC Ice Data]
        E[ERA5 Weather]
        AIS[Live AIS Feeds]
    end

    %% Ingestion & AI layer
    subgraph Backend Engine [FastAPI (Python)]
        DI[Data Ingestion API]
        NORM[Normalization Layer]
        FC[ML Forecasting / Iceberg Drift]
        RISK[Risk Engine]
        MV[Multi-Vessel Intelligence]
        AStar[A* Route Optimizer]
    end

    %% Storage & Auth
    subgraph Persistence & Auth [Supabase]
        SA[(Supabase Auth)]
        SPG[(Supabase PostgreSQL RLS)]
        CACHE[(Local JSON Benchmark Datasets)]
    end

    %% Frontend
    subgraph Client [Vercel (React 19 + TypeScript)]
        CC[Command Center UI]
        NAV[Navigator UI]
        MAP[Interactive 3D / 2D Tactical Map]
    end

    %% Flow logic
    C & N & E & AIS -->|REST / NetCDF| DI
    DI -->|If Offline| CACHE
    CACHE -.->|Fallback| NORM
    DI --> NORM
    NORM --> FC
    FC --> RISK
    RISK --> AStar
    MV --> AStar
    AStar -->|JSON Routes| CC
    
    SA <-->|JWT Tokens| CC
    SPG <-->|RLS State| CC
    CC <--> MAP
    NAV -->|SOS Distress| CC
```

## Offline Fallback Matrix
| Component | Primary | Fallback (No Internet) |
| :--- | :--- | :--- |
| **Auth** | Supabase Auth (JWT) | Deterministic Demo Tokens (`DEMO_TOKEN_*`) |
| **Telemetry** | Live APIs (Copernicus) | `/data/sample/` Verified JSON Benchmarks |
| **Forecasting** | ML Drift Baseline | Deterministic Kinematics (CPA/TCPA) |
| **Routing** | Dynamic Lattice A* | Deterministic safe corridors |
