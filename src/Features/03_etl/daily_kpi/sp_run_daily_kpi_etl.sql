-- ============================================================
-- PTMMM: Daily KPI ETL Procedure (TiDB / MySQL Dialect)
-- File   : db/etl/sp_run_daily_kpi_etl.sql
-- Versi  : v0.3.0-supabase-tidb-integration
-- Tujuan :
--   - Menjalankan ETL harian KPI ke tabel:
--       * inventory_kpi_daily
--       * fleet_kpi_daily
--   - Menjaga konsistensi dengan:
--       * Supabase Auth (org_id, warehouse_id, role)
--       * Prisma (TiDB) schema operasional
--       * ETL Sheets (Orders/Shipments/Events)
--
-- Catatan:
--   - Sumber data diasumsikan berasal dari VIEW:
--       * vw_inventory_kpi_source
--       * vw_fleet_kpi_source
--     View ini boleh digabung dari:
--       - orders, shipments, scan_event, tracking_ping
--       - data import Spreadsheet (Apps Script → /api/etl/spreadsheet)
--   - Prosedur ini hanya fokus ke agregasi harian, tanpa RLS.
--     RLS & filtering dilakukan di API berdasarkan UserContext Supabase.
-- ============================================================

DROP PROCEDURE IF EXISTS sp_run_daily_kpi_etl;
DELIMITER $$

CREATE PROCEDURE sp_run_daily_kpi_etl (
    IN p_data_date DATE,       -- tanggal data yang di-ETL (YYYY-MM-DD), NULL = kemarin
    IN p_batch_id  VARCHAR(64) -- batch_id unik (boleh NULL → auto)
)
BEGIN
    DECLARE v_data_date DATE;
    DECLARE v_batch_id  VARCHAR(64);
    DECLARE v_started_at DATETIME;
    DECLARE v_inventory_rows BIGINT DEFAULT 0;
    DECLARE v_fleet_rows BIGINT DEFAULT 0;

    SET v_started_at = NOW();

    -- Tentukan tanggal referensi (data_date)
    SET v_data_date = IFNULL(p_data_date, DATE_SUB(CURDATE(), INTERVAL 1 DAY));

    -- Batch id jika tidak diisi
    SET v_batch_id = IFNULL(p_batch_id, CONCAT('BATCH_', DATE_FORMAT(v_data_date, '%Y%m%d'), '_', DATE_FORMAT(v_started_at, '%H%i%s')));

    -- ========================================================
    -- 1. Hapus dulu data existing untuk data_date (idempotent)
    -- ========================================================
    DELETE FROM inventory_kpi_daily
    WHERE data_date = v_data_date;

    SET v_inventory_rows = ROW_COUNT();

    DELETE FROM fleet_kpi_daily
    WHERE data_date = v_data_date;

    SET v_fleet_rows = v_fleet_rows + ROW_COUNT(); -- sementara tampung (deleted rows)

    -- ========================================================
    -- 2. Insert ke inventory_kpi_daily
    -- ========================================================

    INSERT INTO inventory_kpi_daily (
        data_date,
        org_id,
        warehouse_id,
        sku_id,
        opening_qty,
        closing_qty,
        movement_in_qty,
        movement_out_qty,
        inventory_turnover,
        days_of_inventory,
        closing_stock_value,
        cogs_value,
        etl_timestamp,
        batch_id
    )
    SELECT
        s.data_date,
        s.org_id,
        s.warehouse_id,
        s.sku_id,
        SUM(s.opening_qty)          AS opening_qty,
        SUM(s.closing_qty)          AS closing_qty,
        SUM(s.movement_in_qty)      AS movement_in_qty,
        SUM(s.movement_out_qty)     AS movement_out_qty,
        CASE
            WHEN SUM(s.avg_stock_qty) > 0
                THEN SUM(s.movement_out_qty) / SUM(s.avg_stock_qty)
            ELSE 0
        END                         AS inventory_turnover,
        CASE
            WHEN SUM(s.cogs_value) > 0
                THEN SUM(s.closing_stock_value) / (SUM(s.cogs_value) / 30)
            ELSE NULL
        END                         AS days_of_inventory,
        SUM(s.closing_stock_value)  AS closing_stock_value,
        SUM(s.cogs_value)           AS cogs_value,
        NOW()                       AS etl_timestamp,
        v_batch_id                  AS batch_id
    FROM vw_inventory_kpi_source s
    WHERE s.data_date = v_data_date
      AND (s.is_test_data IS NULL OR s.is_test_data = 0)
    GROUP BY
        s.data_date,
        s.org_id,
        s.warehouse_id,
        s.sku_id;

    SET v_inventory_rows = v_inventory_rows + ROW_COUNT();

    -- ========================================================
    -- 3. Insert ke fleet_kpi_daily
    -- ========================================================

    INSERT INTO fleet_kpi_daily (
        data_date,
        org_id,
        warehouse_id,
        vehicle_id,
        is_external,
        vendor_id,
        total_trips,
        loaded_trips,
        ontime_deliveries,
        late_deliveries,
        ontime_rate,
        avg_trip_distance_km,
        avg_trip_duration_hours,
        utilization_rate,
        total_distance_km,
        total_cost,
        cost_per_km,
        etl_timestamp,
        batch_id
    )
    SELECT
        f.data_date,
        f.org_id,
        f.warehouse_id,
        f.vehicle_id,
        f.is_external,
        f.vendor_id,
        SUM(f.total_trips)            AS total_trips,
        SUM(f.loaded_trips)           AS loaded_trips,
        SUM(f.ontime_deliveries)      AS ontime_deliveries,
        SUM(f.late_deliveries)        AS late_deliveries,
        CASE
            WHEN (SUM(f.ontime_deliveries) + SUM(f.late_deliveries)) > 0
                THEN (SUM(f.ontime_deliveries) * 1.0)
                     / (SUM(f.ontime_deliveries) + SUM(f.late_deliveries))
            ELSE 0
        END                           AS ontime_rate,
        CASE
            WHEN SUM(f.total_trips) > 0
                THEN SUM(f.total_distance_km) / SUM(f.total_trips)
            ELSE 0
        END                           AS avg_trip_distance_km,
        CASE
            WHEN SUM(f.total_trips) > 0
                THEN SUM(f.total_duration_hours) / SUM(f.total_trips)
            ELSE 0
        END                           AS avg_trip_duration_hours,
        CASE
            WHEN SUM(f.total_trips) > 0
                THEN (SUM(f.loaded_trips) * 1.0) / SUM(f.total_trips)
            ELSE 0
        END                           AS utilization_rate,
        SUM(f.total_distance_km)      AS total_distance_km,
        SUM(f.total_cost)             AS total_cost,
        CASE
            WHEN SUM(f.total_distance_km) > 0
                THEN SUM(f.total_cost) / SUM(f.total_distance_km)
            ELSE 0
        END                           AS cost_per_km,
        NOW()                         AS etl_timestamp,
        v_batch_id                    AS batch_id
    FROM vw_fleet_kpi_source f
    WHERE f.data_date = v_data_date
      AND (f.is_test_data IS NULL OR f.is_test_data = 0)
    GROUP BY
        f.data_date,
        f.org_id,
        f.warehouse_id,
        f.vehicle_id,
        f.is_external,
        f.vendor_id;

    SET v_fleet_rows = v_fleet_rows + ROW_COUNT();

    -- ========================================================
    -- 4. Logging ke etl_logs (kalau tabel ini sudah ada)
    -- ========================================================

    INSERT INTO etl_logs (
        job_name,
        batch_id,
        data_date,
        started_at,
        finished_at,
        status,
        inventory_rows,
        fleet_rows,
        message
    )
    VALUES (
        'daily_kpi_etl',
        v_batch_id,
        v_data_date,
        v_started_at,
        NOW(),
        'SUCCESS',
        v_inventory_rows,
        v_fleet_rows,
        CONCAT('Daily KPI ETL completed for ', DATE_FORMAT(v_data_date, '%Y-%m-%d'))
    );

END$$
DELIMITER ;
