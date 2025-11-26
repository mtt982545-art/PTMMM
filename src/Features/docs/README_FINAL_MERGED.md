# PTMMM – Full Integration Package v0.3.0

Paket ini menggabungkan beberapa komponen yang sebelumnya terpisah:

1. **supabase_tidb_integration/**
   - Skema database operasional TiDB (`tidb/*.sql`)
   - Skema & policy Supabase (`supabase/*.sql`)
   - Dokumentasi integrasi dasar Supabase ⇄ TiDB

2. **etl_integration_package/**
   - Kode integrasi ETL (TypeScript) ke Google Sheets / Apps Script
   - Contoh mapping master data & pipeline import/export

3. **daily_kpi_etl_v0_3_0/**
   - Stored procedure `sp_run_daily_kpi_etl` untuk membentuk KPI harian
   - Definisi tabel KPI harian:
     - `inventory_kpi_daily`
     - `fleet_kpi_daily`
   - SQL dummy data untuk demo dashboard
   - Script shell `run_daily_kpi_etl.sh` untuk cron harian
   - Dokumentasi ETL & panduan migrasi (`docs/etl` dan `db/etl/README_migration_v0_3_0.md`)

---

## Gambaran Integrasi

- **Auth & Role** dikelola oleh **Supabase**  
  → user login → `UserContext` (orgId, warehouseIds, roles) di backend (Next.js + Prisma).

- **Operasional Inti** berada di **TiDB**  
  → tabel `orders`, `shipments`, `inventory_tx`, `scan_event`, dll
  → skema didefinisikan di `supabase_tidb_integration/tidb/01_ptmmm_ops_schema.sql`.

- **ETL Master Sheet**  
  → skrip di `etl_integration_package` mengatur sinkronisasi Google Sheets / Apps Script
  → bisa digunakan untuk import data operasional dan/atau laporan.

- **KPI Harian**  
  → `daily_kpi_etl_v0_3_0` menyediakan:
    - tabel & ETL KPI harian di TiDB
    - opsi mirror KPI di Supabase
    - dokumentasi detail arsitektur ETL.

---

## Urutan Implementasi Singkat

1. **Pasang skema dasar**:
   - Jalankan SQL di `supabase_tidb_integration/tidb` pada TiDB.
   - Jalankan SQL di `supabase_tidb_integration/supabase` pada Supabase.

2. **Aktifkan ETL dan KPI Harian**:
   - Ikuti `daily_kpi_etl_v0_3_0/db/etl/README_migration_v0_3_0.md`.

3. **Integrasikan dengan Aplikasi & Dashboard**:
   - Backend (Next.js + Prisma) membaca KPI dari `*_kpi_daily`.
   - Dashboard / BI / Sheets mengonsumsi data KPI dari TiDB atau mirror Supabase.

Lihat masing-masing README / dokumen di subfolder untuk detail teknis yang lebih lengkap.
