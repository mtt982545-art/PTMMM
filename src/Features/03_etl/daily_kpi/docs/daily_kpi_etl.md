# Daily KPI ETL – PTMMM v0.3.0

Dokumen ini menjelaskan alur ETL harian untuk membentuk tabel KPI harian:
- `inventory_kpi_daily`
- `fleet_kpi_daily`

ETL ini mengambil data dari database operasional TiDB (orders, shipments, inventory_tx, scan_event),
kemudian menulis ringkasan harian yang dipakai oleh dashboard KPI dan laporan manajemen.

---

## 1. Sumber Data

### 1.1. Tabel Operasional Utama (TiDB)

- `orders` – informasi pesanan/customer order.
- `shipments` – informasi pengiriman, relasi ke `orders` dan `vehicle`.
- `inventory_tx` – mutasi stok per produk/warehouse.
- `scan_event` – event operasional (gate_in, load_start, load_finish, gate_out, pod, scan).

Semua tabel ini sudah didefinisikan di:
- `tidb/01_ptmmm_ops_schema.sql` (paket Supabase–TiDB integration utama).

### 1.2. Konteks Organisasi & Warehouse

- `org_id` dan `warehouse_id` diselaraskan dengan:
  - `public.organization` dan `public.warehouse` di Supabase.
  - Kolom `organization_id` / `warehouse_id` pada tabel operasional TiDB.

---

## 2. Tabel Target

### 2.1. inventory_kpi_daily

Ringkasan stok harian per kombinasi:
- `data_date`
- `org_id`
- `warehouse_id`
- `product_id`

Kolom utama:

- `opening_qty` – stok awal hari.
- `received_qty` – total barang masuk (inbound) hari itu.
- `shipped_qty` – total barang keluar (outbound) hari itu.
- `adjustment_qty` – penyesuaian (+/-) dari proses koreksi.
- `closing_qty` – stok akhir hari.
- `stockout_events` – jumlah kejadian stok 0 ketika ada permintaan.
- `avg_lead_time_days` – rata-rata lead time inbound.
- `inventory_turnover` – perputaran persediaan (outbound / rata-rata stok).

### 2.2. fleet_kpi_daily

Ringkasan performa armada per kombinasi:
- `data_date`
- `org_id`
- `warehouse_id`
- `vehicle_id`

Kolom utama:

- `is_external` – TRUE jika armada vendor eksternal.
- `vendor_id` – kode vendor (jika eksternal).
- `total_trips` – total trip/hari.
- `loaded_trips` – trip dengan muatan.
- `ontime_deliveries` / `late_deliveries`.
- `ontime_rate` – persentase ketepatan waktu.
- `avg_trip_distance_km` / `avg_trip_duration_hours`.
- `utilization_rate` – utilisasi armada (%) berdasarkan jam aktif vs jam tersedia.
- `total_distance_km` – jarak tempuh.
- `total_cost` dan `cost_per_km`.

Struktur tabel untuk TiDB dan Supabase tersedia di:
- `db/etl/tidb_kpi_daily_schema.sql`
- `db/etl/supabase_kpi_daily_schema.sql`

---

## 3. Logika ETL (Stored Procedure)

Stored procedure utama: **`sp_run_daily_kpi_etl`** (`db/etl/sp_run_daily_kpi_etl.sql`).

### 3.1. Parameter

- `p_data_date` (DATE) – tanggal data yang akan diproses.
  - Biasanya = `CURRENT_DATE - 1` (hari kemarin).

### 3.2. Langkah Utama

1. Menyiapkan `batch_id` unik untuk run ETL.
2. (Opsional) Menghapus data KPI existing untuk `data_date` yang sama (idempotent).
3. Menghitung agregat inventory per `org_id`, `warehouse_id`, `product_id`:
   - opening / closing quantity.
   - total inbound/outbound.
   - stockout dan lead time.
4. Menghitung agregat fleet per `org_id`, `warehouse_id`, `vehicle_id`:
   - trip count (planned, completed).
   - on-time vs late, jarak tempuh, durasi, cost.
5. Menulis hasil ke:
   - `inventory_kpi_daily`
   - `fleet_kpi_daily`
   dengan `etl_timestamp` dan `batch_id` yang sama.

---

## 4. Integrasi dengan Supabase Auth & Prisma TiDB

### 4.1. Supabase Auth

- User login melalui Supabase → menghasilkan JWT / session.
- Backend (Next.js + Prisma) membangun `UserContext`:
  - `orgId`
  - `warehouseIds[]`
  - `roles[]` dan `sectionsAllowed[]`

### 4.2. Prisma + TiDB

- Prisma terhubung ke TiDB (driver MySQL).
- Endpoint analytics / dashboard membaca data dari:
  - Tabel operasional (untuk detail)
  - Tabel KPI (`inventory_kpi_daily`, `fleet_kpi_daily`) untuk ringkasan.

Contoh query (pseudo TypeScript):

```ts
// Pseudo raw query via Prisma for daily KPI
const rows = await prisma.$queryRaw`
  SELECT data_date, warehouse_id, product_id,
         opening_qty, received_qty, shipped_qty, closing_qty,
         stockout_events, inventory_turnover
  FROM inventory_kpi_daily
  WHERE org_id = ${ctx.orgId}
    AND warehouse_id IN (${Prisma.join(ctx.warehouseIds)})
    AND data_date BETWEEN ${startDate} AND ${endDate}
`;
```

### 4.3. ETL Sheet (Google Sheets)

- Apps Script dapat membaca hasil KPI (via Supabase API / public endpoint) untuk feed ke laporan di Sheets.
- Alternatif: ETL terpisah yang push KPI Ke Supabase => diambil oleh dashboard / BI.

---

## 5. Jadwal & Monitoring

- Cron ETL: setiap hari 23:00 WIB.
- Log eksekusi:
  - Output script: `run_daily_kpi_etl.sh` diarahkan ke log file (mis. `/var/log/ptmmm_daily_kpi_etl.log`).
- Monitoring:
  - Cek jumlah baris yang masuk ke `*_kpi_daily`.
  - Bandingkan dengan volume transaksi operasional harian.

---

## 6. Data Dummy & Demo Dashboard

Untuk demo / testing:

1. Jalankan:
   - `db/etl/tidb_kpi_daily_dummy_data.sql` di TiDB.
   - `db/etl/supabase_kpi_daily_dummy_data.sql` di Supabase (opsional).
2. Dashboard dapat memakai data ini untuk:
   - Grafik inventory turnover per hari / warehouse.
   - Grafik utilisasi armada & on-time delivery.

---

## 7. Dependency & Requirement

- Database: TiDB (MySQL compatible) dan Supabase (Postgres).
- Aplikasi: Next.js + Prisma (untuk service/API).
- Auth: Supabase Auth (JWT / server session).
- Scheduler: Cron / job scheduler setara.

Detail panduan migrasi dan eksekusi ada di:
- `db/etl/README_migration_v0_3_0.md`
