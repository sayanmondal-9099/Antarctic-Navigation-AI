-- =============================================================================
-- Antarctic Navigation AI — Supabase PostgreSQL Initial Schema & RLS Policies
-- Migration: 001_initial_schema.sql
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. PROFILES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'NAVIGATOR' CHECK (role IN ('COMMAND_CENTER', 'NAVIGATOR', 'CAPTAIN', 'SCIENTIST')),
    assigned_vessel_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. VESSELS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vessels (
    id TEXT PRIMARY KEY, -- e.g. 'vessel-A'
    name TEXT NOT NULL,
    call_sign TEXT,
    vessel_type TEXT DEFAULT 'Polar Research Vessel',
    ice_class TEXT DEFAULT 'PC2',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed_knots REAL NOT NULL DEFAULT 0.0,
    heading_degrees REAL NOT NULL DEFAULT 0.0,
    destination TEXT DEFAULT 'Demo Station',
    status TEXT NOT NULL DEFAULT 'cruising' CHECK (status IN ('cruising', 'icebreaking', 'anchored', 'stopped', 'emergency')),
    safety_radius_nm REAL NOT NULL DEFAULT 2.5,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. ROUTES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vessel_id TEXT REFERENCES public.vessels(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    routing_mode TEXT NOT NULL DEFAULT 'balanced' CHECK (routing_mode IN ('safest', 'balanced', 'fastest', 'deterministic')),
    total_distance_nm REAL NOT NULL,
    estimated_duration_hours REAL NOT NULL,
    average_risk_score REAL NOT NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
    risk_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    advisories TEXT[] NOT NULL DEFAULT '{}'::text[],
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. ROUTE WAYPOINTS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.route_waypoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    order_index INT NOT NULL,
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    ice_risk_score REAL NOT NULL DEFAULT 0.0,
    notes TEXT,
    CONSTRAINT uq_route_waypoint_order UNIQUE (route_id, order_index)
);

-- ── 5. ALERTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vessel_id TEXT REFERENCES public.vessels(id) ON DELETE CASCADE,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 6. SIMULATION SESSIONS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.simulation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    current_time_step REAL NOT NULL DEFAULT 0.0,
    vessel_states JSONB NOT NULL DEFAULT '[]'::jsonb,
    iceberg_states JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vessels_status ON public.vessels(status);
CREATE INDEX IF NOT EXISTS idx_routes_vessel ON public.routes(vessel_id);
CREATE INDEX IF NOT EXISTS idx_waypoints_route ON public.route_waypoints(route_id, order_index);
CREATE INDEX IF NOT EXISTS idx_alerts_vessel ON public.alerts(vessel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unack ON public.alerts(acknowledged) WHERE acknowledged = FALSE;

-- ── HELPER FUNCTIONS FOR RLS ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_assigned_vessel_id()
RETURNS TEXT AS $$
  SELECT assigned_vessel_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── ENABLE ROW LEVEL SECURITY ────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_waypoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_sessions ENABLE ROW LEVEL SECURITY;

-- ── RLS POLICIES: PROFILES ───────────────────────────────────────────────────
CREATE POLICY "profiles_select_own_or_command"
ON public.profiles FOR SELECT
USING (auth.uid() = id OR public.get_user_role() = 'COMMAND_CENTER');

CREATE POLICY "profiles_insert_own_or_command"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id OR public.get_user_role() = 'COMMAND_CENTER');

CREATE POLICY "profiles_update_own_or_command"
ON public.profiles FOR UPDATE
USING (auth.uid() = id OR public.get_user_role() = 'COMMAND_CENTER');

-- ── RLS POLICIES: VESSELS ────────────────────────────────────────────────────
CREATE POLICY "vessels_select_authenticated"
ON public.vessels FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "vessels_insert_command"
ON public.vessels FOR INSERT
TO authenticated
WITH CHECK (public.get_user_role() = 'COMMAND_CENTER');

CREATE POLICY "vessels_update_command_or_assigned_captain"
ON public.vessels FOR UPDATE
TO authenticated
USING (
    public.get_user_role() = 'COMMAND_CENTER' 
    OR (public.get_user_role() = 'CAPTAIN' AND public.get_assigned_vessel_id() = id)
);

-- ── RLS POLICIES: ROUTES ─────────────────────────────────────────────────────
CREATE POLICY "routes_select_authenticated"
ON public.routes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "routes_insert_authorized_roles"
ON public.routes FOR INSERT
TO authenticated
WITH CHECK (public.get_user_role() IN ('COMMAND_CENTER', 'NAVIGATOR', 'CAPTAIN'));

CREATE POLICY "routes_update_command_or_captain"
ON public.routes FOR UPDATE
TO authenticated
USING (
    public.get_user_role() = 'COMMAND_CENTER'
    OR (public.get_user_role() = 'CAPTAIN' AND public.get_assigned_vessel_id() = vessel_id)
);

CREATE POLICY "routes_delete_command_or_captain"
ON public.routes FOR DELETE
TO authenticated
USING (
    public.get_user_role() = 'COMMAND_CENTER'
    OR (public.get_user_role() = 'CAPTAIN' AND public.get_assigned_vessel_id() = vessel_id)
);

-- ── RLS POLICIES: ROUTE WAYPOINTS ───────────────────────────────────────────
CREATE POLICY "waypoints_select_authenticated"
ON public.route_waypoints FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "waypoints_insert_authorized_roles"
ON public.route_waypoints FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.routes r
        WHERE r.id = route_id
        AND public.get_user_role() IN ('COMMAND_CENTER', 'NAVIGATOR', 'CAPTAIN')
    )
);

CREATE POLICY "waypoints_modify_authorized_roles"
ON public.route_waypoints FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.routes r
        WHERE r.id = route_id
        AND (
            public.get_user_role() = 'COMMAND_CENTER'
            OR (public.get_user_role() = 'CAPTAIN' AND public.get_assigned_vessel_id() = r.vessel_id)
        )
    )
);

-- ── RLS POLICIES: ALERTS ─────────────────────────────────────────────────────
CREATE POLICY "alerts_select_authenticated"
ON public.alerts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "alerts_insert_command_or_service"
ON public.alerts FOR INSERT
TO authenticated
WITH CHECK (public.get_user_role() = 'COMMAND_CENTER');

CREATE POLICY "alerts_update_command_or_assigned_captain"
ON public.alerts FOR UPDATE
TO authenticated
USING (
    public.get_user_role() = 'COMMAND_CENTER'
    OR (public.get_user_role() = 'CAPTAIN' AND public.get_assigned_vessel_id() = vessel_id)
);

-- ── RLS POLICIES: SIMULATION SESSIONS ─────────────────────────────────────────
CREATE POLICY "simulation_sessions_manage_own"
ON public.simulation_sessions FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- ── AUTH USER CREATION TRIGGER ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, assigned_vessel_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'NAVIGATOR'),
        NEW.raw_user_meta_data->>'assigned_vessel_id'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
