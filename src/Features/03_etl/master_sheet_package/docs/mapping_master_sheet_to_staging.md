# Mapping Master Sheet → Staging Table (stg_*)

Dokumen ini menjelaskan mapping antara **sheet** di `Master Sheet.xlsx`, **tabel staging** di TiDB,
dan **tabel inti** di schema operasional.

> Catatan:
> - Semua kolom utama di staging table menggunakan **nama persis** seperti header di Excel.
> - Tabel staging menambahkan kolom teknis: `id`, `etl_run_id`, `raw_row_json`, `created_at`.

---

## 1. Master_Warehouse → stg_master_warehouse → warehouse

**Header Excel:**

- `WarehouseID`
- `WarehouseName`
- `Address`
- `City`
- `Province`
- `Status`

**Tabel staging:** `stg_master_warehouse`

| Excel Column   | Kolom Staging | Tipe        | Wajib | Target Table | Kolom Target       | Catatan                                |
|----------------|---------------|------------|-------|--------------|--------------------|----------------------------------------|
| WarehouseID    | WarehouseID   | VARCHAR(64)| Ya    | warehouse    | code               | Kode unik gudang                       |
| WarehouseName  | WarehouseName | VARCHAR(255)| Ya   | warehouse    | name               | Nama gudang                            |
| Address        | Address       | VARCHAR(255)| Tidak| warehouse    | address            | Alamat                                 |
| City           | City          | VARCHAR(128)| Tidak| warehouse    | city               | Kota                                   |
| Province       | Province      | VARCHAR(128)| Tidak| warehouse    | province           | Provinsi                               |
| Status         | Status        | VARCHAR(32)| Ya    | warehouse    | is_active          | Di-normalisasi ke boolean (ACTIVE/INACTIVE)|

---

## 2. Master_Vendor → stg_master_vendor → vendor

**Header Excel:**

- `VendorID`
- `VendorName`
- `VendorType`
- `ContactName`
- `Phone`
- `Email`
- `Status`

**Tabel staging:** `stg_master_vendor`

| Excel Column | Kolom Staging | Tipe         | Wajib | Target Table | Kolom Target      | Catatan                              |
|-------------|---------------|-------------|-------|--------------|-------------------|--------------------------------------|
| VendorID    | VendorID      | VARCHAR(64) | Ya    | vendor       | code              | Kode unik vendor                     |
| VendorName  | VendorName    | VARCHAR(255)| Ya    | vendor       | name              | Nama vendor                          |
| VendorType  | VendorType    | VARCHAR(16) | Ya    | vendor       | vendor_type       | INT / EXT                            |
| ContactName | ContactName   | VARCHAR(255)| Tidak | vendor       | —                 | Disimpan di meta JSON bila perlu     |
| Phone       | Phone         | VARCHAR(64) | Tidak | vendor       | —                 | Disimpan di meta JSON bila perlu     |
| Email       | Email         | VARCHAR(255)| Tidak | vendor       | —                 | Disimpan di meta JSON bila perlu     |
| Status      | Status        | VARCHAR(32) | Ya    | vendor       | is_active         | Normalisasi ke boolean               |

---

## 3. Master_Vehicle → stg_master_vehicle → vehicle

**Header Excel:**

- `VehicleID`
- `VendorID`
- `ARMADA_CODE`
- `ARMADA_NAME`
- `PlateNo`
- `Capacity`
- `Notes`

**Tabel staging:** `stg_master_vehicle`

| Excel Column | Kolom Staging | Tipe         | Wajib | Target Table | Kolom Target      | Catatan                          |
|-------------|---------------|-------------|-------|--------------|-------------------|----------------------------------|
| VehicleID   | VehicleID     | VARCHAR(64) | Ya    | vehicle      | vehicle_code      | Kode internal armada            |
| VendorID    | VendorID      | VARCHAR(64) | Ya    | vehicle      | vendor_id         | Lookup ke vendor.code           |
| ARMADA_CODE | ARMADA_CODE   | VARCHAR(64) | Ya    | vehicle      | vehicle_code      | Bisa sama dengan VehicleID      |
| ARMADA_NAME | ARMADA_NAME   | VARCHAR(255)| Ya    | vehicle      | meta.name         | Disimpan di meta JSON           |
| PlateNo     | PlateNo       | VARCHAR(32) | Ya    | vehicle      | plate_number      | Nomor polisi                    |
| Capacity    | Capacity      | VARCHAR(32) | Tidak | vehicle      | meta.capacity     | Kapasitas sebagai string/angka  |
| Notes       | Notes         | TEXT        | Tidak | vehicle      | meta.notes        | Catatan tambahan                |

---

## 4. Master_Driver → stg_master_driver → driver

**Header Excel:**

- `DriverID`
- `VendorID`
- `DriverName`
- `Phone`
- `LicenseID`
- `LicenseType`
- `Status`

**Tabel staging:** `stg_master_driver`

| Excel Column | Kolom Staging | Tipe         | Wajib | Target Table | Kolom Target   | Catatan                             |
|-------------|---------------|-------------|-------|--------------|----------------|-------------------------------------|
| DriverID    | DriverID      | VARCHAR(64) | Ya    | driver       | driver_code    | Kode driver                         |
| VendorID    | VendorID      | VARCHAR(64) | Ya    | driver       | vendor_id      | Lookup ke vendor.code               |
| DriverName  | DriverName    | VARCHAR(255)| Ya    | driver       | name           | Nama driver                         |
| Phone       | Phone         | VARCHAR(64) | Tidak | driver       | phone          | Nomor telepon                       |
| LicenseID   | LicenseID     | VARCHAR(64) | Tidak | driver       | license_id     | Nomor SIM                           |
| LicenseType | LicenseType   | VARCHAR(16) | Tidak | driver       | license_type   | Jenis SIM                           |
| Status      | Status        | VARCHAR(32) | Ya    | driver       | status         | ACTIVE / INACTIVE                   |

---

## 5. Orders → stg_orders → orders

**Header Excel:**

- `OrderID`
- `FormCode`
- `WarehouseID`
- `VendorID`
- `VendorType`
- `RequestedAt`
- `ETA_Load`
- `Notes`

**Tabel staging:** `stg_orders`

| Excel Column | Kolom Staging | Tipe         | Wajib | Target Table | Kolom Target      | Catatan                                        |
|-------------|---------------|-------------|-------|--------------|-------------------|------------------------------------------------|
| OrderID     | OrderID       | VARCHAR(64) | Ya    | orders       | order_code        | Kode order                                     |
| FormCode    | FormCode      | VARCHAR(64) | Tidak | orders       | —                 | Disimpan di meta / audit bila perlu            |
| WarehouseID | WarehouseID   | VARCHAR(64) | Ya    | orders       | warehouse_id      | Lookup ke warehouse.code                       |
| VendorID    | VendorID      | VARCHAR(64) | Tidak | —            | —                 | Opsional – dipakai untuk analitik              |
| VendorType  | VendorType    | VARCHAR(16) | Tidak | —            | —                 | INT / EXT                                      |
| RequestedAt | RequestedAt   | VARCHAR(64) | Ya    | orders       | requested_at      | Wajib ISO datetime / nilai tanggal konsisten   |
| ETA_Load    | ETA_Load      | VARCHAR(64) | Tidak | shipments    | planned_departure_time | Digunakan saat generate shipment        |
| Notes       | Notes         | TEXT        | Tidak | orders       | notes             | Catatan tambahan                               |

---

## 6. Shipments → stg_shipments → shipments

**Header Excel:**

- `ShipmentID`
- `OrderID`
- `WarehouseID`
- `VehicleID`
- `DriverID`
- `Status`
- `PlannedAt`
- `StartedAt`
- `FinishedAt`

**Tabel staging:** `stg_shipments`

| Excel Column | Kolom Staging | Tipe         | Wajib | Target Table | Kolom Target           | Catatan                                           |
|-------------|---------------|-------------|-------|--------------|------------------------|---------------------------------------------------|
| ShipmentID  | ShipmentID    | VARCHAR(64) | Ya    | shipments    | shipmentCode           | Kode shipment                                     |
| OrderID     | OrderID       | VARCHAR(64) | Ya    | shipments    | order_id               | Lookup ke orders.order_code                       |
| WarehouseID | WarehouseID   | VARCHAR(64) | Ya    | shipments    | warehouse_id           | Lookup ke warehouse.code                          |
| VehicleID   | VehicleID     | VARCHAR(64) | Ya    | shipment_assignment | vehicle_id       | Lookup ke vehicle.vehicle_code                    |
| DriverID    | DriverID      | VARCHAR(64) | Ya    | shipment_assignment | driver_id        | Lookup ke driver.driver_code                      |
| Status      | Status        | VARCHAR(32) | Ya    | shipments    | status                 | planned/in_transit/delivered/cancelled            |
| PlannedAt   | PlannedAt     | VARCHAR(64) | Tidak | shipments    | planned_departure_time | ISO datetime                                      |
| StartedAt   | StartedAt     | VARCHAR(64) | Tidak | shipments    | actual_departure_time  | ISO datetime                                      |
| FinishedAt  | FinishedAt    | VARCHAR(64) | Tidak | shipments    | actual_arrival_time    | ISO datetime                                      |

---

## 7. ScanEvents → stg_scan_events → scan_event

**Header Excel:**

- `EventID`
- `Type(gate_in|load_start|load_finish|gate_out)`
- `FormCode`
- `ShipmentID`
- `WarehouseID`
- `ActorRole`
- `ActorName`
- `TS`
- `Shift`
- `DockSlot`
- `PhotoSealURL`
- `Weight`
- `PayloadJSON`

**Tabel staging:** `stg_scan_events`

| Excel Column                                       | Kolom Staging                                       | Tipe         | Wajib | Target Table | Kolom Target   | Catatan                                      |
|----------------------------------------------------|-----------------------------------------------------|-------------|-------|--------------|----------------|----------------------------------------------|
| EventID                                            | EventID                                            | VARCHAR(64) | Ya    | scan_event   | id / ref       | ID referensi (boleh diganti ID internal)     |
| Type(gate_in\|load_start\|load_finish\|gate_out)| Type(gate_in\|load_start\|load_finish\|gate_out) | VARCHAR(64) | Ya    | scan_event   | eventType      | Nilai dibatasi ke gate_in/load_start/...     |
| FormCode                                           | FormCode                                           | VARCHAR(64) | Ya    | scan_event   | formCode       | Kode form                                    |
| ShipmentID                                         | ShipmentID                                         | VARCHAR(64) | Ya    | scan_event   | shipmentId     | Lookup ke shipments.shipmentCode             |
| WarehouseID                                        | WarehouseID                                        | VARCHAR(64) | Ya    | scan_event   | warehouseId    | Lookup ke warehouse.code                     |
| ActorRole                                          | ActorRole                                          | VARCHAR(64) | Tidak | scan_event   | refType/payload.actorRole | Disimpan di payload JSON         |
| ActorName                                          | ActorName                                          | VARCHAR(255)| Tidak | scan_event   | payload.actorName |                                          |
| TS                                                 | TS                                                 | VARCHAR(64) | Ya    | scan_event   | ts             | ISO datetime                                 |
| Shift                                              | Shift                                              | VARCHAR(32) | Tidak | scan_event   | payload.shift  | Disimpan di payload JSON                     |
| DockSlot                                           | DockSlot                                           | VARCHAR(32) | Tidak | scan_event   | payload.dockSlot |                                         |
| PhotoSealURL                                       | PhotoSealURL                                       | VARCHAR(255)| Tidak | scan_event   | payload.photoSealUrl |                                     |
| Weight                                             | Weight                                             | VARCHAR(64) | Tidak | scan_event   | payload.weight | Di-parse ke numerik bila memungkinkan        |
| PayloadJSON                                        | PayloadJSON                                        | JSON        | Tidak | scan_event   | payload        | Payload tambahan dari form                   |

---

## 8. TrackingPing → stg_tracking_ping → tracking_ping

**Header Excel:**

- `PingID`
- `ShipmentID`
- `DriverID`
- `Lat`
- `Lng`
- `Speed`
- `Heading`
- `TS`

**Tabel staging:** `stg_tracking_ping`

| Excel Column | Kolom Staging | Tipe         | Wajib | Target Table  | Kolom Target | Catatan                           |
|-------------|---------------|-------------|-------|---------------|--------------|-----------------------------------|
| PingID      | PingID        | VARCHAR(64) | Ya    | tracking_ping | —            | ID referensi (tidak wajib ke DB)  |
| ShipmentID  | ShipmentID    | VARCHAR(64) | Ya    | tracking_ping | shipmentId   | Lookup ke shipments.shipmentCode  |
| DriverID    | DriverID      | VARCHAR(64) | Tidak | tracking_ping | driverId     | Lookup ke driver.driverCode       |
| Lat         | Lat           | DOUBLE      | Ya    | tracking_ping | lat          | Latitude                          |
| Lng         | Lng           | DOUBLE      | Ya    | tracking_ping | lng          | Longitude                         |
| Speed       | Speed         | DOUBLE      | Tidak | tracking_ping | speedKph     | Kecepatan                         |
| Heading     | Heading       | DOUBLE      | Tidak | tracking_ping | headingDeg   | Arah                               |
| TS          | TS            | VARCHAR(64) | Ya    | tracking_ping | ts           | ISO datetime                      |

---

## 9. Audit_Log → stg_audit_log → audit_log

**Header Excel:**

- `AuditID`
- `Actor`
- `Role`
- `Action`
- `Resource`
- `ResourceID`
- `IP`
- `TS`
- `MetaJSON`

**Tabel staging:** `stg_audit_log`

| Excel Column | Kolom Staging | Tipe         | Wajib | Target Table | Kolom Target | Catatan                                |
|-------------|---------------|-------------|-------|--------------|--------------|----------------------------------------|
| AuditID     | AuditID       | VARCHAR(64) | Ya    | audit_log    | —            | ID referensi                           |
| Actor       | Actor         | VARCHAR(255)| Ya    | audit_log    | userEmail    | Email / identifier user                |
| Role        | Role          | VARCHAR(64) | Tidak | audit_log    | details.role | Disimpan di JSON                       |
| Action      | Action        | VARCHAR(32) | Ya    | audit_log    | action       | Jenis aksi                             |
| Resource    | Resource      | VARCHAR(32) | Ya    | audit_log    | entity       | Entitas (orders/shipments/dll)        |
| ResourceID  | ResourceID    | VARCHAR(64) | Ya    | audit_log    | entityId     | ID entitas                             |
| IP          | IP            | VARCHAR(64) | Tidak | audit_log    | details.ip   | Disimpan di JSON                       |
| TS          | TS            | VARCHAR(64) | Ya    | audit_log    | ts           | ISO datetime                           |
| MetaJSON    | MetaJSON      | JSON        | Tidak | audit_log    | details      | Payload tambahan                       |

---

## 10. Roles → stg_roles → (mapping ke Supabase roles / app_role)

**Header Excel:**

- `Role Gabungan`
- `Mencakup`

**Tabel staging:** `stg_roles`

| Excel Column | Kolom Staging  | Tipe         | Wajib | Target Table          | Kolom Target    | Catatan                                                    |
|-------------|----------------|-------------|-------|-----------------------|-----------------|------------------------------------------------------------|
| Role Gabungan | Role Gabungan| VARCHAR(64) | Ya    | supabase_user_shadow  | appRole         | Nama role gabungan (admin/ops/warehouse/driver/dll)       |
| Mencakup    | Mencakup       | TEXT        | Tidak | —                     | —               | Deskripsi cakupan role (digunakan untuk dokumentasi saja) |

---

## Validasi Data (Umum)

- Semua kolom ID (`*ID`) divalidasi sebagai **non-empty string**.
- Kolom tanggal/waktu (`RequestedAt`, `ETA_Load`, `TS`, dll.) harus berformat **ISO datetime** (`YYYY-MM-DDTHH:mm:ssZ`), atau minimal konsisten (`yyyy-mm-dd hh:mm:ss`).
- Kolom numerik (`Lat`, `Lng`, `Speed`, `Heading`, `Weight`) akan di-parse menjadi angka; nilai non-numerik akan dianggap error pada tingkat ETL.
- Nilai enum:
  - `VendorType` ∈ { `INT`, `EXT` }
  - `Type(gate_in|load_start|load_finish|gate_out)` ∈ { `gate_in`, `load_start`, `load_finish`, `gate_out` }
  - `Status` di Master & Shipments akan dinormalisasi ke set `ACTIVE/INACTIVE`, `planned/in_transit/delivered/cancelled`.

Implementasi validasi teknis dilakukan di `src/etl/masterSheetSchemas.ts` menggunakan **Zod**.
