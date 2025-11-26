-- 01_staging_tables.sql
-- Tabel staging untuk Master Sheet PTMMM
-- Dialek: MySQL / TiDB

CREATE TABLE IF NOT EXISTS stg_master_warehouse (
  id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  etl_run_id    BIGINT       NULL,
  `WarehouseID` VARCHAR(64)  NOT NULL,
  `WarehouseName` VARCHAR(255) NOT NULL,
  `Address`     VARCHAR(255) NULL,
  `City`        VARCHAR(128) NULL,
  `Province`    VARCHAR(128) NULL,
  `Status`      VARCHAR(32)  NOT NULL,
  raw_row_json  JSON         NULL,
  created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_stg_wh_etl_run (etl_run_id),
  INDEX idx_stg_wh_code (`WarehouseID`)
);

CREATE TABLE IF NOT EXISTS stg_master_vendor (
  id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  etl_run_id    BIGINT       NULL,
  `VendorID`    VARCHAR(64)  NOT NULL,
  `VendorName`  VARCHAR(255) NOT NULL,
  `VendorType`  VARCHAR(16)  NOT NULL,
  `ContactName` VARCHAR(255) NULL,
  `Phone`       VARCHAR(64)  NULL,
  `Email`       VARCHAR(255) NULL,
  `Status`      VARCHAR(32)  NOT NULL,
  raw_row_json  JSON         NULL,
  created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_stg_vendor_etl_run (etl_run_id),
  INDEX idx_stg_vendor_code (`VendorID`)
);

CREATE TABLE IF NOT EXISTS stg_master_vehicle (
  id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  etl_run_id    BIGINT       NULL,
  `VehicleID`   VARCHAR(64)  NOT NULL,
  `VendorID`    VARCHAR(64)  NOT NULL,
  `ARMADA_CODE` VARCHAR(64)  NOT NULL,
  `ARMADA_NAME` VARCHAR(255) NOT NULL,
  `PlateNo`     VARCHAR(32)  NOT NULL,
  `Capacity`    VARCHAR(32)  NULL,
  `Notes`       TEXT         NULL,
  raw_row_json  JSON         NULL,
  created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_stg_vehicle_etl_run (etl_run_id),
  INDEX idx_stg_vehicle_code (`VehicleID`)
);

CREATE TABLE IF NOT EXISTS stg_master_driver (
  id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  etl_run_id    BIGINT       NULL,
  `DriverID`    VARCHAR(64)  NOT NULL,
  `VendorID`    VARCHAR(64)  NOT NULL,
  `DriverName`  VARCHAR(255) NOT NULL,
  `Phone`       VARCHAR(64)  NULL,
  `LicenseID`   VARCHAR(64)  NULL,
  `LicenseType` VARCHAR(16)  NULL,
  `Status`      VARCHAR(32)  NOT NULL,
  raw_row_json  JSON         NULL,
  created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_stg_driver_etl_run (etl_run_id),
  INDEX idx_stg_driver_code (`DriverID`)
);

CREATE TABLE IF NOT EXISTS stg_orders (
  id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  etl_run_id    BIGINT       NULL,
  `OrderID`     VARCHAR(64)  NOT NULL,
  `FormCode`    VARCHAR(64)  NULL,
  `WarehouseID` VARCHAR(64)  NOT NULL,
  `VendorID`    VARCHAR(64)  NULL,
  `VendorType`  VARCHAR(16)  NULL,
  `RequestedAt` VARCHAR(64)  NOT NULL,
  `ETA_Load`    VARCHAR(64)  NULL,
  `Notes`       TEXT         NULL,
  raw_row_json  JSON         NULL,
  created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_stg_orders_etl_run (etl_run_id),
  INDEX idx_stg_orders_code (`OrderID`)
);

CREATE TABLE IF NOT EXISTS stg_shipments (
  id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  etl_run_id    BIGINT       NULL,
  `ShipmentID`  VARCHAR(64)  NOT NULL,
  `OrderID`     VARCHAR(64)  NOT NULL,
  `WarehouseID` VARCHAR(64)  NOT NULL,
  `VehicleID`   VARCHAR(64)  NOT NULL,
  `DriverID`    VARCHAR(64)  NOT NULL,
  `Status`      VARCHAR(32)  NOT NULL,
  `PlannedAt`   VARCHAR(64)  NULL,
  `StartedAt`   VARCHAR(64)  NULL,
  `FinishedAt`  VARCHAR(64)  NULL,
  raw_row_json  JSON         NULL,
  created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_stg_shipments_etl_run (etl_run_id),
  INDEX idx_stg_shipments_code (`ShipmentID`)
);

CREATE TABLE IF NOT EXISTS stg_scan_events (
  id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  etl_run_id    BIGINT       NULL,
  `EventID`     VARCHAR(64)  NOT NULL,
  `Type(gate_in|load_start|load_finish|gate_out)` VARCHAR(64) NOT NULL,
  `FormCode`    VARCHAR(64)  NOT NULL,
  `ShipmentID`  VARCHAR(64)  NOT NULL,
  `WarehouseID` VARCHAR(64)  NOT NULL,
  `ActorRole`   VARCHAR(64)  NULL,
  `ActorName`   VARCHAR(255) NULL,
  `TS`          VARCHAR(64)  NOT NULL,
  `Shift`       VARCHAR(32)  NULL,
  `DockSlot`    VARCHAR(32)  NULL,
  `PhotoSealURL` VARCHAR(255) NULL,
  `Weight`      VARCHAR(64)  NULL,
  `PayloadJSON` JSON         NULL,
  raw_row_json  JSON         NULL,
  created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_stg_scan_etl_run (etl_run_id),
  INDEX idx_stg_scan_shipment (`ShipmentID`)
);

CREATE TABLE IF NOT EXISTS stg_tracking_ping (
  id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  etl_run_id    BIGINT       NULL,
  `PingID`      VARCHAR(64)  NOT NULL,
  `ShipmentID`  VARCHAR(64)  NOT NULL,
  `DriverID`    VARCHAR(64)  NULL,
  `Lat`         DOUBLE       NOT NULL,
  `Lng`         DOUBLE       NOT NULL,
  `Speed`       DOUBLE       NULL,
  `Heading`     DOUBLE       NULL,
  `TS`          VARCHAR(64)  NOT NULL,
  raw_row_json  JSON         NULL,
  created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_stg_ping_etl_run (etl_run_id),
  INDEX idx_stg_ping_shipment (`ShipmentID`)
);

CREATE TABLE IF NOT EXISTS stg_audit_log (
  id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  etl_run_id    BIGINT       NULL,
  `AuditID`     VARCHAR(64)  NOT NULL,
  `Actor`       VARCHAR(255) NOT NULL,
  `Role`        VARCHAR(64)  NULL,
  `Action`      VARCHAR(32)  NOT NULL,
  `Resource`    VARCHAR(32)  NOT NULL,
  `ResourceID`  VARCHAR(64)  NOT NULL,
  `IP`          VARCHAR(64)  NULL,
  `TS`          VARCHAR(64)  NOT NULL,
  `MetaJSON`    JSON         NULL,
  raw_row_json  JSON         NULL,
  created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_stg_audit_etl_run (etl_run_id),
  INDEX idx_stg_audit_resource (`Resource`, `ResourceID`)
);

CREATE TABLE IF NOT EXISTS stg_roles (
  id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  etl_run_id    BIGINT       NULL,
  `Role Gabungan` VARCHAR(64) NOT NULL,
  `Mencakup`    TEXT         NULL,
  raw_row_json  JSON         NULL,
  created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_stg_roles_etl_run (etl_run_id)
);
