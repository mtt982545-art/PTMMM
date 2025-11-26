-- 10_tidb_kpi_daily_schema.sql (UPDATED)
-- Schema KPI harian untuk inventory & fleet

CREATE TABLE IF NOT EXISTS inventory_kpi_daily (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    data_date DATE NOT NULL,
    org_id CHAR(36) NOT NULL,
    warehouse_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    opening_qty DECIMAL(18,2) NOT NULL DEFAULT 0,
    received_qty DECIMAL(18,2) NOT NULL DEFAULT 0,
    shipped_qty DECIMAL(18,2) NOT NULL DEFAULT 0,
    adjustment_qty DECIMAL(18,2) NOT NULL DEFAULT 0,
    closing_qty DECIMAL(18,2) NOT NULL DEFAULT 0,
    stockout_events INT NOT NULL DEFAULT 0,
    avg_lead_time_days DECIMAL(10,2) NULL,
    inventory_turnover DECIMAL(18,4) NULL,
    etl_timestamp DATETIME NOT NULL,
    batch_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_inventory_kpi_daily (data_date, org_id, warehouse_id, product_id),
    INDEX idx_inventory_kpi_daily_date (data_date),
    INDEX idx_inv_kpi_org_wh_date (org_id, warehouse_id, data_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS fleet_kpi_daily (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    data_date DATE NOT NULL,
    org_id CHAR(36) NOT NULL,
    warehouse_id VARCHAR(50) NOT NULL,
    vehicle_id VARCHAR(50) NOT NULL,
    is_external TINYINT(1) NOT NULL DEFAULT 0,
    vendor_id VARCHAR(50) NULL,
    total_trips INT NOT NULL DEFAULT 0,
    loaded_trips INT NOT NULL DEFAULT 0,
    ontime_deliveries INT NOT NULL DEFAULT 0,
    late_deliveries INT NOT NULL DEFAULT 0,
    ontime_rate DECIMAL(5,2) NULL,
    avg_trip_distance_km DECIMAL(10,2) NULL,
    avg_trip_duration_hours DECIMAL(10,2) NULL,
    utilization_rate DECIMAL(5,2) NULL,
    total_distance_km DECIMAL(12,2) NULL,
    total_cost DECIMAL(18,2) NULL,
    cost_per_km DECIMAL(18,4) NULL,
    etl_timestamp DATETIME NOT NULL,
    batch_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_fleet_kpi_daily (data_date, org_id, warehouse_id, vehicle_id),
    INDEX idx_fleet_kpi_daily_date (data_date),
    INDEX idx_fleet_kpi_org_wh_date (org_id, warehouse_id, data_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
