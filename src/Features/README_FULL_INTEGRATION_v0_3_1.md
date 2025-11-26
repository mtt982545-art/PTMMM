# PTMMM Full Integration v0.3.1 (Grouped Layout)

Dibuat otomatis pada 2025-11-20 23:55:15.

Struktur paket ini mengelompokkan artefak utama menjadi tiga grup besar:

1. **01_supabase_auth/**
   - Skema dan seed untuk Supabase (auth, organisasi, role, dan KPI harian di Supabase).
   - File utama:
     - `01_auth_and_org_schema.sql`
     - `02_auth_policies_and_seed.sql`
     - `10_supabase_kpi_daily_schema.sql`
     - `11_supabase_kpi_daily_dummy_data.sql`

2. **02_tidb_prisma/**
   - Skema operasional dan KPI harian untuk TiDB yang diakses via Prisma.
   - File utama:
     - `01_ptmmm_ops_schema.sql`
     - `02_ptmmm_ops_seed.sql`
     - `10_tidb_kpi_daily_schema.sql`
     - `11_tidb_kpi_daily_dummy_data.sql`

3. **03_etl/**
   - Integrasi ETL:
     - **master_sheet_package/**: integrasi Google Sheets / Apps Script untuk staging operasional.
     - **daily_kpi/**: ETL harian KPI (stored procedure + migrasi + script shell).
       - `sp_run_daily_kpi_etl.sql`
       - `README_migration_v0_3_0.md`
       - `docs/daily_kpi_etl.md`
       - `scripts/run_daily_kpi_etl.sh`

4. **docs/**
   - Dokumentasi integrasi Supabase ↔ TiDB ↔ ETL (schema, mapping master sheet, workflow, dll).
   - Termasuk `README_FINAL_MERGED.md` dari paket sebelumnya.

5. **misc_original/**
   - File lain yang tidak dapat diklasifikasikan otomatis; tetap disertakan agar tidak ada artefak yang hilang.

## Urutan implementasi yang disarankan (ringkas)

1. Jalankan skema Supabase di `01_supabase_auth/*.sql` melalui Supabase SQL Editor.
2. Jalankan skema TiDB di `02_tidb_prisma/*.sql` untuk database operasional + KPI.
3. Deploy integrasi ETL:
   - `03_etl/master_sheet_package/` untuk pipeline Google Sheets → staging.
   - `03_etl/daily_kpi/` untuk ETL harian KPI (ikuti `README_migration_v0_3_0.md` dan `docs/daily_kpi_etl.md`).
4. Sinkronkan dan verifikasi lewat Next.js + Supabase Auth + Prisma/TiDB:
   - Supabase sebagai auth dan registry role/org/warehouse.
   - Prisma/TiDB sebagai sumber data operasional dan KPI.
   - ETL memastikan ringkasan harian terkonsolidasi di *_kpi_daily.

Untuk detail lebih lengkap, baca:
- `docs/README_FINAL_MERGED.md`
- `docs/db_schema_and_integration.md`
- `03_etl/daily_kpi/README_migration_v0_3_0.md`
- `03_etl/daily_kpi/docs/daily_kpi_etl.md`
