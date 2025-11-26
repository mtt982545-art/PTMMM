# 03_etl – Quick Start

Folder ini berisi seluruh komponen **ETL** untuk proyek PTMMM, meliputi:

- Paket ETL Google Sheets untuk data operasional (import/export).
- ETL harian KPI (SQL + shell script).
- Dokumen alur dan dependensi.

## 1. Langkah Eksekusi Singkat

1. Baca dulu `docs/etl/daily_kpi_etl.md` di dalam folder ini untuk memahami alur ETL.
2. Untuk ETL KPI harian:
   - Pastikan skema `*_kpi_daily` di TiDB & Supabase sudah terbuat.
   - Sesuaikan connection string di `scripts/etl/run_daily_kpi_etl.sh` (DEV/STG/PRD).
   - Daftarkan cron job harian (mis. `23:00 WIB`) yang memanggil skrip tersebut.
3. Untuk ETL Sheets operasional:
   - Deploy Apps Script yang disertakan (jika ada file `.gs`/`README` terkait).
   - Konfigurasi URL endpoint API (scan, etl spreadsheet) dan token keamanan.
4. Pantau tabel `etl_logs` dan log aplikasi untuk memastikan proses berjalan normal.

## 2. Prasyarat & Dependensi

- Akses ke database TiDB & Supabase.
- Akses ke server/VM/runner yang akan mengeksekusi cron job.
- Bash / Shell environment (Linux/macOS atau WSL di Windows).
- (Opsional) Akun Google & akses ke Google Sheets/Apps Script.

## 3. Contoh Perintah Dasar

- Menjalankan ETL KPI harian secara manual (dev):

```bash
cd 03_etl
bash scripts/etl/run_daily_kpi_etl.sh dev 2025-01-01
```

- Mengecek log ETL di DB:

```sql
select * from etl_logs order by started_at desc limit 20;
```

## 4. Dokumentasi Lanjutan

- Lihat `docs/etl/daily_kpi_etl.md` untuk detail rumus KPI dan data flow.
- Lihat juga `../docs/auth_workflow_and_export.md` untuk kaitan ETL dengan dashboard/export.
