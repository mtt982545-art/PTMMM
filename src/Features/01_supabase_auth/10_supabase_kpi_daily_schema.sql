-- Supabase/Postgres schema for daily KPI tables
-- This can be run in the Supabase SQL editor (public schema).

CREATE TABLE IF NOT EXISTS public.inventory_kpi_daily (
    id BIGSERIAL PRIMARY KEY,
    data_date DATE NOT NULL,
    org_id UUID NOT NULL,
    warehouse_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    opening_qty NUMERIC(18,2) NOT NULL DEFAULT 0,
    received_qty NUMERIC(18,2) NOT NULL DEFAULT 0,
    shipped_qty NUMERIC(18,2) NOT NULL DEFAULT 0,
    adjustment_qty NUMERIC(18,2) NOT NULL DEFAULT 0,
    closing_qty NUMERIC(18,2) NOT NULL DEFAULT 0,
    stockout_events INTEGER NOT NULL DEFAULT 0,
    avg_lead_time_days NUMERIC(10,2),
    inventory_turnover NUMERIC(18,4),
    etl_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    batch_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_kpi_daily_uniq
ON public.inventory_kpi_daily (data_date, org_id, warehouse_id, product_id);

CREATE INDEX IF NOT EXISTS inventory_kpi_daily_date_idx
ON public.inventory_kpi_daily (data_date);

CREATE TABLE IF NOT EXISTS public.fleet_kpi_daily (
    id BIGSERIAL PRIMARY KEY,
    data_date DATE NOT NULL,
    org_id UUID NOT NULL,
    warehouse_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    is_external BOOLEAN NOT NULL DEFAULT FALSE,
    vendor_id TEXT,
    total_trips INTEGER NOT NULL DEFAULT 0,
    loaded_trips INTEGER NOT NULL DEFAULT 0,
    ontime_deliveries INTEGER NOT NULL DEFAULT 0,
    late_deliveries INTEGER NOT NULL DEFAULT 0,
    ontime_rate NUMERIC(5,2),
    avg_trip_distance_km NUMERIC(10,2),
    avg_trip_duration_hours NUMERIC(10,2),
    utilization_rate NUMERIC(5,2),
    total_distance_km NUMERIC(12,2),
    total_cost NUMERIC(18,2),
    cost_per_km NUMERIC(18,4),
    etl_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    batch_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS fleet_kpi_daily_uniq
ON public.fleet_kpi_daily (data_date, org_id, warehouse_id, vehicle_id);

CREATE INDEX IF NOT EXISTS fleet_kpi_daily_date_idx
ON public.fleet_kpi_daily (data_date);

/*
Row Level Security (RLS) can be enabled to restrict access per organization/warehouse.
Example (adjust to your auth schema):

ALTER TABLE public.inventory_kpi_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_kpi_daily_select_policy
ON public.inventory_kpi_daily
FOR SELECT
USING ( org_id = current_setting('app.current_org_id')::uuid );

ALTER TABLE public.fleet_kpi_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY fleet_kpi_daily_select_policy
ON public.fleet_kpi_daily
FOR SELECT
USING ( org_id = current_setting('app.current_org_id')::uuid );
*/
