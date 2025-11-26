-- 01_ptmmm_ops_schema.sql (UPDATED WITH VENDOR/VEHICLE/DRIVER)
-- Core TiDB schema for PTMMM Ops
-- Termasuk: organization, warehouse, orders, shipments, scan_event, audit_log
-- + tambahan: public_request, route, route_stop, qr_ticket, shipment_item
-- + master baru: logistic_vendor, vehicle, driver_profile
-- + index optimasi

create database if not exists ptmmm_ops;
use ptmmm_ops;

-- --------------------------------------------------------------------
-- MASTER ORGANIZATION & WAREHOUSE
-- --------------------------------------------------------------------

create table if not exists organization (
  id           char(36) not null primary key,
  code         varchar(32) not null unique,
  name         varchar(255) not null,
  is_active    tinyint(1) not null default 1,
  created_at   datetime not null default current_timestamp
);

create table if not exists warehouse (
  id              char(36) not null primary key,
  organization_id char(36) not null,
  code            varchar(32) not null,
  name            varchar(255) not null,
  is_active       tinyint(1) not null default 1,
  created_at      datetime not null default current_timestamp,
  unique key uq_wh_org_code (organization_id, code),
  key idx_wh_org (organization_id)
);

-- --------------------------------------------------------------------
-- LOGISTIC VENDOR (opsional, untuk ekspedisi eksternal)
-- --------------------------------------------------------------------
create table if not exists logistic_vendor (
  id              char(36) not null primary key,
  organization_id char(36) not null,
  code            varchar(32) not null,
  name            varchar(255) not null,
  contact_name    varchar(255) null,
  contact_phone   varchar(50)  null,
  created_at      datetime     not null default current_timestamp,

  unique key uq_vendor_org_code (organization_id, code),
  key idx_vendor_org (organization_id)
);

-- --------------------------------------------------------------------
-- VEHICLE / ARMADA
-- --------------------------------------------------------------------
create table if not exists vehicle (
  id              char(36) not null primary key,
  organization_id char(36) not null,

  plate_number    varchar(32) not null,  -- L 1234 XX
  name            varchar(64)  null,     -- nama panggilan unit, optional
  type            varchar(64)  null,     -- pickup / engkel / tronton / dll

  capacity_kg     decimal(18,3) null,    -- kapasitas berat
  capacity_m3     decimal(18,3) null,    -- kapasitas volume
  is_internal     tinyint(1)    not null default 1,
  vendor_id       char(36)      null,    -- relasi ke logistic_vendor (kalau eksternal)

  created_at      datetime      not null default current_timestamp,
  updated_at      datetime      not null default current_timestamp
                                on update current_timestamp,

  unique key uq_vehicle_org_plate (organization_id, plate_number),
  key idx_vehicle_org (organization_id),
  key idx_vehicle_vendor (vendor_id)
);

-- --------------------------------------------------------------------
-- DRIVER PROFILE
-- --------------------------------------------------------------------
create table if not exists driver_profile (
  id                 char(36) not null primary key,
  organization_id    char(36) not null,

  -- kalau driver internal, bisa diisi id Supabase (string UUID)
  supabase_user_id   char(36)   null,

  name               varchar(255) not null,
  phone              varchar(50)  null,

  is_internal        tinyint(1)   not null default 1,
  vendor_id          char(36)     null,          -- kalau driver dari vendor
  default_vehicle_id char(36)     null,          -- referensi ke vehicle.id (opsional)

  created_at         datetime     not null default current_timestamp,
  updated_at         datetime     not null default current_timestamp
                                   on update current_timestamp,

  key idx_driver_org (organization_id),
  key idx_driver_user (supabase_user_id),
  key idx_driver_vendor (vendor_id)
);

-- --------------------------------------------------------------------
-- PUBLIC REQUEST (permintaan dari user publik via magic link)
-- --------------------------------------------------------------------

create table if not exists public_request (
  id              char(36) not null primary key,
  organization_id char(36) not null,
  warehouse_id    char(36) null,

  public_email    varchar(255) not null,
  public_name     varchar(255) null,
  request_type    varchar(32)  not null, -- 'purchase' / 'offering' / dll

  status          varchar(32)  not null default 'submitted',
  -- 'submitted' | 'under_review' | 'approved' | 'rejected' | 'cancelled'

  payload         json         null,     -- detail barang / volume / catatan

  order_id        char(36)     null,     -- link ke orders.id jika sudah dibuat
  shipment_id     char(36)     null,     -- link ke shipments.id jika sudah dibuat

  created_at      datetime     not null default current_timestamp,
  updated_at      datetime     not null default current_timestamp
                               on update current_timestamp,

  key idx_pubreq_org_status (organization_id, status, created_at),
  key idx_pubreq_email (public_email),
  key idx_pubreq_order (order_id),
  key idx_pubreq_shipment (shipment_id)
);

-- --------------------------------------------------------------------
-- ORDERS & SHIPMENTS
-- --------------------------------------------------------------------

create table if not exists orders (
  id              char(36) not null primary key,
  organization_id char(36) not null,
  warehouse_id    char(36) not null,
  order_code      varchar(64) not null,
  customer        varchar(255) not null,
  origin          varchar(255) not null,
  destination     varchar(255) not null,
  status          varchar(32) not null default 'new',
  created_at      datetime not null default current_timestamp,
  updated_at      datetime not null default current_timestamp
                               on update current_timestamp,
  unique key uq_orders_org_code (organization_id, order_code),
  key idx_orders_org (organization_id),
  key idx_orders_wh (warehouse_id),
  key idx_orders_org_status_created (organization_id, status, created_at)
);

-- ROUTE = 1 perjalanan driver (bisa multi-stop/multi-gudang)
create table if not exists route (
  id              char(36) not null primary key,
  organization_id char(36) not null,
  code            varchar(64) not null,
  description     varchar(255) null,

  status          varchar(32) not null default 'planned',
  -- 'planned' | 'on_route' | 'finished' | 'cancelled'

  driver_name     varchar(255) null,
  vehicle_id      varchar(64)  null,
  is_external     tinyint(1)   not null default 0,
  vendor_name     varchar(255) null,

  created_at      datetime     not null default current_timestamp,
  updated_at      datetime     not null default current_timestamp
                               on update current_timestamp,

  unique key uq_route_org_code (organization_id, code),
  key idx_route_org_status (organization_id, status)
);

-- ROUTE_STOP = daftar gudang yang dikunjungi dalam 1 route
create table if not exists route_stop (
  id               char(36) not null primary key,
  route_id         char(36) not null,
  stop_seq         int      not null,          -- 1,2,3,...
  warehouse_id     char(36) not null,

  planned_arrival   datetime null,
  planned_departure datetime null,
  actual_arrival    datetime null,
  actual_departure  datetime null,

  created_at       datetime not null default current_timestamp,

  unique key uq_route_stop_seq (route_id, stop_seq),
  key idx_route_stop_route (route_id),
  key idx_route_stop_wh (warehouse_id)
);

create table if not exists shipments (
  id              char(36) not null primary key,
  organization_id char(36) not null,
  warehouse_id    char(36) not null,
  route_id        char(36) null,               -- optional: link ke route multi-stop
  shipment_id     varchar(64) not null,
  customer        varchar(255) not null,
  origin          varchar(255) not null,
  destination     varchar(255) not null,
  status          varchar(32) not null default 'in_transit',
  created_at      datetime not null default current_timestamp,
  updated_at      datetime not null default current_timestamp
                               on update current_timestamp,
  unique key uq_ship_org_id (organization_id, shipment_id),
  key idx_ship_org (organization_id),
  key idx_ship_wh (warehouse_id),
  key idx_ship_org_status_created (organization_id, status, created_at),
  key idx_ship_route (route_id)
);

-- --------------------------------------------------------------------
-- SHIPMENT ITEM (detail muatan per barang / per kol)
-- --------------------------------------------------------------------

create table if not exists shipment_item (
  id              char(36) not null primary key,

  -- relasi ke shipment & route
  shipment_id     char(36) not null,
  route_stop_id   char(36) null,          -- opsional: barang ini diambil di stop mana
  organization_id char(36) not null,
  warehouse_id    char(36) not null,      -- gudang asal muatan ini

  -- informasi barang
  product_code    varchar(64)  not null,  -- kode / SKU barang
  product_name    varchar(255) null,      -- snapshot nama barang
  uom             varchar(32)  null,      -- satuan (COLLY / KARTON / KG / dll)

  colly_count     int           not null default 0,     -- jumlah colly
  qty_unit        decimal(18,3) null,                   -- jumlah unit di semua colly (opsional)
  weight_kg       decimal(18,3) null,                   -- total berat muatan ini
  volume_m3       decimal(18,3) null,                   -- total volume (kalau mau pakai kubik)
  notes           varchar(255) null,                    -- catatan khusus

  created_at      datetime      not null default current_timestamp,
  updated_at      datetime      not null default current_timestamp
                                on update current_timestamp,

  key idx_shipitem_shipment (shipment_id),
  key idx_shipitem_org_wh (organization_id, warehouse_id)
);

-- --------------------------------------------------------------------
-- QR TICKET (1 tiket QR per shipment / route)
-- --------------------------------------------------------------------

create table if not exists qr_ticket (
  id              char(36) not null primary key,
  organization_id char(36) not null,
  warehouse_id    char(36) null,
  shipment_id     char(36) not null,

  token           varchar(128) not null unique, -- yang di-encode ke QR
  status          varchar(32)  not null default 'active',
  -- 'active' | 'used' | 'cancelled' | 'expired'

  created_by      varchar(255) null, -- email internal (ops/marketing)
  created_at      datetime     not null default current_timestamp,
  updated_at      datetime     not null default current_timestamp
                               on update current_timestamp,

  key idx_qr_org_shipment (organization_id, shipment_id),
  key idx_qr_token (token)
);

-- --------------------------------------------------------------------
-- SCAN EVENT (gate_in, load_start, load_finish, gate_out, pod, dll)
-- --------------------------------------------------------------------

create table if not exists scan_event (
  id              char(36) not null primary key,
  organization_id char(36) null,
  warehouse_id    char(36) null,
  shipment_id     char(36) null,

  qr_ticket_id    char(36) null,  -- link ke qr_ticket jika event dari QR
  route_stop_id   char(36) null,  -- stop ke berapa di route (multi-gudang)

  form_code       varchar(64) null,
  event_type      varchar(32) not null,
  ref_type        varchar(64) null,
  payload         json null,
  user_email      varchar(255) null,
  ts              datetime null,
  created_at      datetime not null default current_timestamp,

  key idx_scan_org (organization_id),
  key idx_scan_wh (warehouse_id),
  key idx_scan_ship (shipment_id),
  key idx_scan_created (created_at),
  key idx_scan_qr (qr_ticket_id),
  key idx_scan_route_stop (route_stop_id),
  key idx_scan_ship_event_ts (shipment_id, event_type, ts)
);

-- --------------------------------------------------------------------
-- AUDIT LOG
-- --------------------------------------------------------------------

create table if not exists audit_log (
  id          bigint unsigned not null auto_increment primary key,
  action      varchar(32) not null,
  entity      varchar(32) not null,
  entity_id   varchar(64) not null,
  user_id     char(36) null,
  org_id      char(36) null,
  ts          datetime not null default current_timestamp,
  details     json null,
  key idx_audit_org (org_id),
  key idx_audit_entity (entity, entity_id)
);
