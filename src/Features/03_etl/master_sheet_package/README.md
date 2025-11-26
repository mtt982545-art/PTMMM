# PTMMM ETL Integration Package (Sheets → TiDB → Supabase)

Paket ini berisi contoh lengkap integrasi:

- Google Sheets (Master Sheet.xlsx)
- Layanan ETL (`/api/etl/spreadsheet`)
- TiDB (schema staging + core)
- Supabase (dashboard & auth)

## Struktur Folder

- `sql/01_staging_tables.sql` – definisi tabel staging (stg_*) yang mengikuti header di Master Sheet.
- `apps_script/etl_master_sheet_demo.gs` – contoh Apps Script untuk kirim payload ke endpoint ETL.
- `docs/mapping_master_sheet_to_staging.md` – dokumentasi mapping kolom.
- `docs/workflow_end_to_end.md` – alur integrasi end-to-end.
- `docs/testing.md` – panduan testing.
- `src/etl/masterSheetSchemas.ts` – definisi schema Zod per sheet.
- `src/etl/masterSheetMapping.ts` – fungsi mapping row Master Sheet → DTO internal.
- `src/etl/etlWorkflowExample.ts` – contoh implementasi workflow ETL dengan Prisma.
- `src/tests/*.test.ts` – test menggunakan Vitest.
- `package.json` & `tsconfig.json` – konfigurasi Node/TypeScript.

## Prasyarat

- Node.js 18+
- NPM / PNPM / Yarn
- Layanan API `/api/etl/spreadsheet` sudah tersedia di aplikasi Next.js Anda.
- TiDB sudah terkoneksi via Prisma (lihat `DATABASE_URL` di environment aplikasi utama).

## Instalasi

```bash
npm install
# atau
pnpm install
```

## Menjalankan Test

```bash
npm test
```

## Cara Pakai Singkat

1. Deploy `sql/01_staging_tables.sql` ke database TiDB Anda.
2. Salin isi `apps_script/etl_master_sheet_demo.gs` ke Apps Script pada Google Sheet Master.
3. Sesuaikan:
   - `BASE_URL` di Apps Script dengan domain API Anda.
   - `ORG_CODE`, `WAREHOUSE_ID` di fungsi demo bila perlu.
4. Integrasikan fungsi di `src/etl/masterSheetMapping.ts` dan `src/etl/etlWorkflowExample.ts`
   ke dalam route handler ETL (`/api/etl/spreadsheet`) di Next.js.
5. Jalankan sekali Apps Script untuk mengirim batch data demo.
6. Buka dashboard Supabase / aplikasi internal dan verifikasi:
   - Data staging terisi
   - ETL ke tabel inti berjalan
   - KPI & laporan dapat dihasilkan.

Detail mapping dan alur kerja dijelaskan di folder `docs/`.
