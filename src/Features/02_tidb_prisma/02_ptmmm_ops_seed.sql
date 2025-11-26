-- 02_ptmmm_ops_seed.sql (UPDATED)
use ptmmm_ops;

-- ORGANIZATION
insert into organization (id, code, name)
values ('11111111-1111-1111-1111-111111111111', 'PTMMM', 'PT Mitramulia Makmur')
on duplicate key update name = values(name);

-- WAREHOUSES (multi-gudang)
insert into warehouse (id, organization_id, code, name)
values
(
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'WH-SBY',
  'Gudang Surabaya'
),
(
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'WH-SDA',
  'Gudang Sidoarjo'
),
(
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  'WH-NGJ',
  'Gudang Nganjuk'
),
(
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  'WH-SGS',
  'Gudang Singosari'
),
(
  '66666666-6666-6666-6666-666666666666',
  '11111111-1111-1111-1111-111111111111',
  'WH-SRG',
  'Gudang Serang'
)
on duplicate key update name = values(name);

-- ORDER & SHIPMENT DEMO LAMA (tetap)
insert into orders (
  id, organization_id, warehouse_id,
  order_code, customer, origin, destination, status
) values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'ORD-001',
  'PT Demo',
  'Surabaya',
  'Jakarta',
  'new'
)
on duplicate key update status = values(status);

insert into shipments (
  id, organization_id, warehouse_id,
  shipment_id, customer, origin, destination, status
) values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'SHP-001',
  'PT Demo',
  'Surabaya',
  'Jakarta',
  'in_transit'
)
on duplicate key update status = values(status);

-- SCAN EVENT DEMO LAMA (tanpa route/QR)
insert into scan_event (
  id, organization_id, warehouse_id, shipment_id,
  form_code, event_type, ref_type, payload, user_email, ts
) values
(
  'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'FORM-OPS-001',
  'gate_in',
  'Gate',
  json_object('location','Surabaya','description','Kendaraan masuk gerbang','orgId','11111111-1111-1111-1111-111111111111'),
  'security@ptmmm.co.id',
  now() - interval 3 day
),
(
  'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'FORM-OPS-001',
  'load_start',
  'Ops',
  json_object('location','Gudang SBY','description','Mulai muat','orgId','11111111-1111-1111-1111-111111111111'),
  'ops@ptmmm.co.id',
  now() - interval 2 day
),
(
  'e3e3e3e3-e3e3-e3e3-e3e3-e3e3e3e3e3e3',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'FORM-OPS-001',
  'gate_out',
  'Gate',
  json_object('location','Surabaya','description','Kendaraan keluar','orgId','11111111-1111-1111-1111-111111111111'),
  'security@ptmmm.co.id',
  now() - interval 1 day
),
(
  'e4e4e4e4-e4e4-e4e4-e4e4-e4e4e4e4e4e4',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'FORM-OPS-001',
  'pod',
  'POD',
  json_object(
    'location','Jakarta',
    'description','Proof of Delivery diterima',
    'customer','PT Demo',
    'origin','Surabaya',
    'destination','Jakarta',
    'orgId','11111111-1111-1111-1111-111111111111'
  ),
  'driver@ptmmm.co.id',
  now()
);

-- -------------------------------------------------------------------
-- DEMO BARU: ROUTE MULTI-GUDANG + ROUTE_STOP + QR + SCAN EVENT
-- Rute: WH-SDA -> WH-NGJ -> WH-SGS -> WH-SRG
-- -------------------------------------------------------------------

-- 1) ROUTE
insert into route (
  id, organization_id, code, description,
  status, driver_name, vehicle_id, is_external, vendor_name
) values (
  'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr',
  '11111111-1111-1111-1111-111111111111',
  'RT-SDA-NGJ-SGS-SRG-001',
  'Demo rute multi-gudang: Sidoarjo -> Nganjuk -> Singosari -> Serang',
  'on_route',
  'Driver Demo',
  'TRUCK-01',
  0,
  null
)
on duplicate key update status = values(status);

-- 2) SHIPMENT yang pakai route ini
insert into shipments (
  id, organization_id, warehouse_id, route_id,
  shipment_id, customer, origin, destination, status
) values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333', -- WH-SDA (start)
  'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr',
  'SHP-ROUTE-001',
  'PT Multi Stop',
  'Sidoarjo',
  'Serang',
  'in_transit'
)
on duplicate key update status = values(status), route_id = values(route_id);

-- 3) ROUTE STOP (SDA -> NGJ -> SGS -> SRG)
insert into route_stop (
  id, route_id, stop_seq, warehouse_id,
  planned_arrival, planned_departure
) values
(
  's1s1s1s1-s1s1-s1s1-s1s1-s1s1s1s1s1s1',
  'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr',
  1,
  '33333333-3333-3333-3333-333333333333', -- WH-SDA
  now() - interval 3 hour,
  now() - interval 2 hour
),
(
  's2s2s2s2-s2s2-s2s2-s2s2-s2s2s2s2s2s2',
  'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr',
  2,
  '44444444-4444-4444-4444-444444444444', -- WH-NGJ
  now() - interval 2 hour,
  now() - interval 90 minute
),
(
  's3s3s3s3-s3s3-s3s3-s3s3-s3s3s3s3s3s3',
  'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr',
  3,
  '55555555-5555-5555-5555-555555555555', -- WH-SGS
  now() - interval 90 minute,
  now() - interval 60 minute
),
(
  's4s4s4s4-s4s4-s4s4-s4s4-s4s4s4s4s4s4',
  'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr',
  4,
  '66666666-6666-6666-6666-666666666666', -- WH-SRG
  now() - interval 30 minute,
  now()
)
on duplicate key update planned_arrival = values(planned_arrival);

-- 4) QR TICKET untuk shipment route ini
insert into qr_ticket (
  id, organization_id, warehouse_id, shipment_id,
  token, status, created_by
) values (
  'qqqqqqqq-qqqq-qqqq-qqqq-qqqqqqqqqqqq',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333', -- gudang start
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'QR-SHP-ROUTE-001-DEMO',
  'active',
  'ops@ptmmm.co.id'
)
on duplicate key update status = values(status);

-- 5) SCAN EVENT berbasis route_stop + qr_ticket
insert into scan_event (
  id, organization_id, warehouse_id, shipment_id,
  qr_ticket_id, route_stop_id,
  form_code, event_type, ref_type, payload, user_email, ts
) values
-- Gate in di WH-SDA
(
  'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'qqqqqqqq-qqqq-qqqq-qqqq-qqqqqqqqqqqq',
  's1s1s1s1-s1s1-s1s1-s1s1-s1s1s1s1s1s1',
  'FORM-GATE',
  'gate_in',
  'Gate',
  json_object('location','WH-SDA','description','Gate in Sidoarjo'),
  'security-sda@ptmmm.co.id',
  now() - interval 3 hour
),
-- Load finish di WH-SDA
(
  'f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'qqqqqqqq-qqqq-qqqq-qqqq-qqqqqqqqqqqq',
  's1s1s1s1-s1s1-s1s1-s1s1-s1s1s1s1s1s1',
  'FORM-WH',
  'load_finish',
  'Warehouse',
  json_object('location','WH-SDA','description','Selesai muat di Sidoarjo'),
  'warehouse-sda@ptmmm.co.id',
  now() - interval 2 hour
),
-- Gate in di WH-NGJ
(
  'f3f3f3f3-f3f3-f3f3-f3f3-f3f3f3f3f3f3',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'qqqqqqqq-qqqq-qqqq-qqqq-qqqqqqqqqqqq',
  's2s2s2s2-s2s2-s2s2-s2s2-s2s2s2s2s2s2',
  'FORM-GATE',
  'gate_in',
  'Gate',
  json_object('location','WH-NGJ','description','Gate in Nganjuk'),
  'security-ngj@ptmmm.co.id',
  now() - interval 90 minute
),
-- Gate out terakhir di WH-SRG
(
  'f4f4f4f4-f4f4-f4f4-f4f4-f4f4f4f4f4f4',
  '11111111-1111-1111-1111-111111111111',
  '66666666-6666-6666-6666-666666666666',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'qqqqqqqq-qqqq-qqqq-qqqq-qqqqqqqqqqqq',
  's4s4s4s4-s4s4-s4s4-s4s4-s4s4s4s4s4s4',
  'FORM-GATE',
  'gate_out',
  'Gate',
  json_object('location','WH-SRG','description','Gate out Serang (finish route)'),
  'security-srg@ptmmm.co.id',
  now()
);


-- -------------------------------------------------------------------
-- DEMO: DETAIL MUATAN PER KOL UNTUK SHP-001 dan SHP-ROUTE-001
-- -------------------------------------------------------------------

-- Muatan untuk shipment demo lama SHP-001 (Surabaya -> Jakarta)
insert into shipment_item (
  id, shipment_id, route_stop_id, organization_id, warehouse_id,
  product_code, product_name, uom,
  colly_count, qty_unit, weight_kg, volume_m3, notes
) values
(
  'mi11mi11-mi11-mi11-mi11-mi11mi11mi11',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',    -- SHP-001
  null,                                      -- tidak pakai route_stop
  '11111111-1111-1111-1111-111111111111',   -- PTMMM
  '22222222-2222-2222-2222-222222222222',   -- WH-SBY
  'PROD-A',
  'Produk A (contoh karton)',
  'COLLY',
  10,
  100.0,
  150.0,
  1.20,
  'Contoh muatan utama'
),
(
  'mi22mi22-mi22-mi22-mi22-mi22mi22mi22',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',    -- SHP-001
  null,
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'PROD-B',
  'Produk B (contoh dus kecil)',
  'COLLY',
  5,
  50.0,
  80.0,
  0.60,
  'Barang pelengkap'
);

-- Muatan untuk shipment multi-stop SHP-ROUTE-001 (SDA -> NGJ -> SGS -> SRG)
insert into shipment_item (
  id, shipment_id, route_stop_id, organization_id, warehouse_id,
  product_code, product_name, uom,
  colly_count, qty_unit, weight_kg, volume_m3, notes
) values
(
  'mi33mi33-mi33-mi33-mi33-mi33mi33mi33',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',    -- SHP-ROUTE-001
  's1s1s1s1-s1s1-s1s1-s1s1-s1s1s1s1s1s1',    -- stop 1: WH-SDA
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',    -- WH-SDA
  'PROD-C',
  'Produk C (diambil di SDA)',
  'COLLY',
  8,
  80.0,
  120.0,
  0.90,
  'Muatan dari Sidoarjo'
),
(
  'mi44mi44-mi44-mi44-mi44-mi44mi44mi44',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',    -- SHP-ROUTE-001
  's2s2s2s2-s2s2-s2s2-s2s2-s2s2s2s2s2s2',    -- stop 2: WH-NGJ
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',    -- WH-NGJ
  'PROD-D',
  'Produk D (diambil di Nganjuk)',
  'COLLY',
  6,
  60.0,
  90.0,
  0.70,
  'Muatan tambahan dari Nganjuk'
);
