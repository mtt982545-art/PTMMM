# Workflow End-to-End: Sheets → ETL → TiDB → Supabase Dashboard

Dokumen ini menjelaskan alur kerja integrasi untuk data logistik PTMMM.

## 1. Input Data di Google Sheets

User operasional mengisi / mengimpor data ke `Master Sheet.xlsx` dengan sheet:

- `Master_Warehouse`, `Master_Vendor`, `Master_Vehicle`, `Master_Driver`
- `Orders`, `Shipments`, `ScanEvents`, `TrackingPing`, `Audit_Log`
- `Roles` (kamus role gabungan)

Header setiap sheet sudah distandarkan dan dipakai apa adanya di tabel staging.

## 2. Apps Script → Endpoint ETL

File `apps_script/etl_master_sheet_demo.gs` berisi fungsi:

- `buildRowsFromSheet(sheetName)` – membaca baris dari sheet dan mengubahnya jadi array objek `{ header: value }`.
- `postToEtl(source, sheetName, rows, meta)` – mengirim payload ke endpoint `/api/etl/spreadsheet` via `UrlFetchApp.fetch`.
- Fungsi-fungsi helper `sendDemoOrders()`, `sendDemoShipments()`, dll. sebagai contoh payload yang identik dengan data demo/seed.

Setiap kali Apps Script dijalankan, ia akan:

1. Membaca data dari sheet yang ditentukan.
2. Menyusun payload JSON seperti:

   ```jsonc
   {
     "source": "master_sheet_ptmmm",
     "sheetName": "Orders",
     "rows": [
       { "OrderID": "ORD-2025-0001", "FormCode": "FORM-ORD-2025-0001", ... }
     ],
     "meta": {
       "orgCode": "PTMMM"
     }
   }
   ```

3. Mengirim payload ke `/api/etl/spreadsheet`.
4. Mencatat log response dan error (jika ada).

## 3. Endpoint `/api/etl/spreadsheet` (Next.js / Node)

Handler API (tidak disertakan penuh di paket ini, tapi didukung oleh file TypeScript):

1. Menerima request JSON.
2. Berdasarkan `sheetName`, memilih **schema Zod** yang tepat dari `src/etl/masterSheetSchemas.ts`.
3. Melakukan:
   - Validasi semua baris (`rows`) sesuai schema.
   - Pencatatan error per baris (jika diperlukan).
4. Menulis data ke tabel staging yang sesuai (`stg_*`) melalui Prisma atau query raw.
5. Mencatat 1 baris di `etl_run` + `etl_row_error` (jika baris tertentu gagal).

## 4. ETL dari Staging → Tabel Inti TiDB

File `src/etl/masterSheetMapping.ts` dan `src/etl/etlWorkflowExample.ts`:

- Menyediakan fungsi mapping dari **row staging** menjadi struktur yang siap di-insert ke tabel inti:
  - `toWarehouseCore`, `toVendorCore`, `toDriverCore`, `toVehicleCore`
  - `toOrderCore`, `toShipmentCore`, `toScanEventCore`, `toTrackingPingCore`, `toAuditLogCore`
- Contoh workflow di `etlWorkflowExample.ts` menunjukkan pola:

  1. Ambil batch data dari tabel staging.
  2. Validasi ulang (optional) dan mapping ke DTO internal.
  3. `upsert` / `insert` ke tabel inti (`warehouse`, `vendor`, `driver`, `vehicle`, `orders`, `shipments`, dll.) menggunakan Prisma.
  4. Tandai baris staging sebagai `processed` atau hapus jika tidak diperlukan lagi.

Proses ini dapat dijadwalkan (cron job) tiap beberapa menit untuk data operasional.

## 5. Konsolidasi & KPI di TiDB

Setelah data masuk ke tabel inti:

- Event scanning (`scan_event`) & posisi (`tracking_ping`) diinsert secara real-time.
- Data orders/shipments digunakan untuk menghitung KPI:
  - lead time,
  - on-time delivery,
  - waktu muat & turnaround,
  - kepatuhan scanning (scan compliance).

Tabel materialized atau summary seperti `mv_kpi_daily`, `daily_reports`, `weekly_aggregates`, `monthly_summaries`
di-refresh secara berkala (mis. setiap malam) dengan stored procedure (contoh: `sp_refresh_mv_kpi_daily`).

## 6. Supabase Dashboard / Aplikasi Frontend

Supabase digunakan untuk:

- Autentikasi & otorisasi (Auth + RLS).
- Menyajikan dashboard dan UI operasional (Next.js + Supabase client).

Aplikasi frontend hanya membaca data dari:

- Tabel inti di TiDB (melalui Prisma, API internal, atau sink ke Postgres jika diperlukan).
- Tabel summary / MV untuk KPI.

Peran utama Supabase di sini:

- **Gateway auth** ke API ETL dan dashboard.
- **Sumber metadata role** dan hak akses (dipetakan ke `SupabaseUserShadow` di TiDB untuk analitik).

## 7. Dependensi Antar Komponen

- **Google Sheets** bergantung pada:
  - Apps Script dan konfigurasi endpoint API.
- **Endpoint `/api/etl/spreadsheet`** bergantung pada:
  - Schema Zod di `src/etl/masterSheetSchemas.ts`,
  - Fungsi mapping di `src/etl/masterSheetMapping.ts`,
  - Koneksi Prisma ke TiDB.
- **Stored procedure & summary tables** bergantung pada:
  - Tabel inti (`orders`, `shipments`, `scan_event`, `tracking_ping`, dll.).
- **Dashboard Supabase / Next.js** bergantung pada:
  - Tabel inti & summary,
  - Supabase Auth untuk context user & org.

Dengan paket ini, Anda mendapatkan blueprint lengkap untuk menghubungkan Master Sheet → staging → TiDB → dashboard secara konsisten.
