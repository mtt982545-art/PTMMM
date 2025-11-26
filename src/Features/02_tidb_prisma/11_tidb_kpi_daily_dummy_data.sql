-- Dummy data for TiDB KPI daily tables
-- This data is intended for dashboard/demo only.

DELETE FROM inventory_kpi_daily;
DELETE FROM fleet_kpi_daily;

INSERT INTO inventory_kpi_daily (
    data_date, org_id, warehouse_id, product_id,
    opening_qty, received_qty, shipped_qty, adjustment_qty,
    closing_qty, stockout_events, avg_lead_time_days, inventory_turnover,
    etl_timestamp, batch_id
) VALUES
('2025-01-01', '00000000-0000-0000-0000-000000000001', 'WH-SBY', 'PROD-A',
 100, 50, 80, 0,
 70, 0, 3.5, 1.2,
 NOW(), 'BATCH-20250101'),
('2025-01-01', '00000000-0000-0000-0000-000000000001', 'WH-SBY', 'PROD-B',
 200, 0, 40, 0,
 160, 1, 5.0, 0.8,
 NOW(), 'BATCH-20250101'),
('2025-01-02', '00000000-0000-0000-0000-000000000001', 'WH-SDA', 'PROD-A',
 70, 30, 50, 0,
 50, 0, 3.5, 1.5,
 NOW(), 'BATCH-20250102');

INSERT INTO fleet_kpi_daily (
    data_date, org_id, warehouse_id, vehicle_id,
    is_external, vendor_id,
    total_trips, loaded_trips, ontime_deliveries, late_deliveries,
    ontime_rate, avg_trip_distance_km, avg_trip_duration_hours,
    utilization_rate, total_distance_km, total_cost, cost_per_km,
    etl_timestamp, batch_id
) VALUES
('2025-01-01', '00000000-0000-0000-0000-000000000001', 'WH-SBY', 'TRUCK-01',
 0, NULL,
 4, 4, 3, 1,
 75.0, 120.0, 6.0,
 80.0, 480.0, 480000.00, 1000.00,
 NOW(), 'BATCH-20250101'),
('2025-01-01', '00000000-0000-0000-0000-000000000001', 'WH-SBY', 'TRUCK-EXT-01',
 1, 'VENDOR-01',
 3, 2, 2, 1,
 66.7, 150.0, 7.5,
 70.0, 450.0, 500000.00, 1111.11,
 NOW(), 'BATCH-20250101'),
('2025-01-02', '00000000-0000-0000-0000-000000000001', 'WH-SDA', 'TRUCK-02',
 0, NULL,
 5, 5, 5, 0,
 100.0, 90.0, 5.0,
 85.0, 450.0, 400000.00, 888.89,
 NOW(), 'BATCH-20250102');
