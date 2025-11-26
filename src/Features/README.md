# PTMMM Full Integration v0.3.1

Paket ini berisi integrasi menyeluruh antara:

- **Supabase** → Autentikasi, multi-tenant org/warehouse, dan mirror KPI harian.
- **TiDB + Prisma** → Database operasional utama (orders, shipments, scan_event, dsb) dan tabel *_kpi_daily.
- **ETL (Google Sheets / Apps Script / Shell)** → Sinkronisasi data operasional ⇄ Sheets dan proses KPI harian.

Struktur utama:

- `01_supabase_auth/` → Skema & policy Supabase (auth, org, warehouse, KPI mirror).
- `02_tidb_prisma/` → Skema TiDB operasional + KPI + integrasi Prisma.
- `03_etl/` → Paket ETL (Sheets import, KPI harian, script shell & dokumentasi).
- `docs/` → Dokumen arsitektur, workflow auth, dan panduan migrasi.

## Diagram Alur Sistem (Ringkas)

```text
[User (Browser)]
      |
      v
[Supabase Auth]  -- session/JWT -->  [Next.js API Routes]
                                         |
                                         v
                          [Prisma Client -> TiDB (operasional)]
                                         |
                                         v
                   [Tabel *_kpi_daily (TiDB) + mirror di Supabase]
                                         ^
                                         |
                         [ETL Harian KPI (shell + SQL)]
                                         ^
                                         |
                 [Google Sheets / Apps Script: ETL Operasional]
```

- Semua endpoint API membaca **UserContext** dari Supabase (orgId, warehouseIds, role).
- Service layer (orders, shipments, analytics, export) hanya menerima `ctx` dan memfilter scope org/warehouse.
- ETL harian KPI mengisi tabel `*_kpi_daily` di TiDB lalu (opsional) dipush / dimirror ke Supabase untuk kebutuhan dashboard ringan.

## Kontak Teknis (Isi Sesuai Organisasi)

> **Catatan:** Isi placeholder berikut sesuai struktur organisasi Anda.

- PIC Aplikasi: _Nama PIC / Tim IT Internal_
- Email Support Teknis: _support@ptmmm.local_ (contoh, silakan sesuaikan)
- Kanal Komunikasi: _Slack/WhatsApp/Teams_ (opsional)

## Versi & Changelog Singkat

- **v0.3.1**
  - Pengelompokan ulang paket menjadi 3 domain: `01_supabase_auth/`, `02_tidb_prisma/`, `03_etl/`.
  - Penambahan skema KPI harian (`*_kpi_daily`) di TiDB & mirror Supabase.
  - Integrasi ETL harian KPI (SQL + shell) dan ETL Sheets operasional.
  - Penyelarasan UserContext (Supabase) dengan filter org/warehouse di Prisma/TiDB.

- **v0.3.0**
  - Dasar integrasi Supabase Auth dengan Next.js dan TiDB operasional.
  - Skema awal orders/shipments/scan_event dan ETL import dari Google Sheets.

Untuk detail lebih dalam, lihat:

- `docs/db_schema_and_integration.md`
- `docs/auth_workflow_and_export.md`
- `docs/etl/daily_kpi_etl.md`
- `docs/migration_checklist_v0_3_1.md`
