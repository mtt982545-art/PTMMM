# PTMMM Daily KPI ETL – Migration Guide v0.3.0

Dokumen ini menjelaskan langkah migrasi untuk mengaktifkan skema dan ETL harian KPI
yang terintegrasi dengan TiDB (operasional), Supabase (auth + mirror KPI), dan
ETL Sheet (Google Sheets / Apps Script).

> **Scope v0.3.0**
> - Menambah tabel `inventory_kpi_daily` dan `fleet_kpi_daily` di TiDB dan Supabase.
> - Menambah stored procedure `sp_run_daily_kpi_etl`.
> - Menambah script shell `run_daily_kpi_etl.sh` untuk eksekusi terjadwal.
> - Menyediakan data dummy untuk kebutuhan demo dashboard.

---

## 1. Prasyarat

1. **Database Operasional TiDB** sudah terpasang:
   - Skema PTMMM utama (`orders`, `shipments`, `inventory_tx`, `scan_event`, dll)
     dari `tidb/01_ptmmm_ops_schema.sql`.
2. **Supabase Project** sudah aktif:
   - Skema auth & organisasi (`auth.users`, `public.organization`, `public.warehouse`,
     `public.user_org_role`, dll) dari `supabase/01_auth_and_org_schema.sql`.
   - Kebijakan RLS dasar dari `supabase/02_auth_policies_and_seed.sql`.
3. **Environment**:
   - Akses CLI / SQL ke TiDB (tidb-server / MySQL client).
   - Akses Supabase SQL Editor atau `supabase cli`.
   - Server / VM / cron host untuk menjalankan script shell.

---

## 2. Urutan Eksekusi

### 2.1. Migrasi TiDB

1. **Tambah tabel KPI harian di TiDB**  
   Jalankan:

   ```sql
   SOURCE db/etl/tidb_kpi_daily_schema.sql;
   ```

2. **Pasang stored procedure ETL harian**  
   Jalankan:

   ```sql
   SOURCE db/etl/sp_run_daily_kpi_etl.sql;
   ```

3. (Opsional) **Isi data dummy KPI** untuk kebutuhan demo:

   ```sql
   SOURCE db/etl/tidb_kpi_daily_dummy_data.sql;
   ```

> **Catatan**: Pastikan user DB yang dipakai punya hak `CREATE ROUTINE` dan `INSERT/UPDATE`
> pada tabel `inventory_kpi_daily` dan `fleet_kpi_daily`.

---

### 2.2. Migrasi Supabase

1. **Tambah tabel mirror KPI harian** di Supabase (Postgres):

   - Buka **Supabase SQL Editor** dan jalankan:

     ```sql
     -- Sesuaikan path jika memakai supabase cli / file terpisah
     -- Di paket ini: db/etl/supabase_kpi_daily_schema.sql
     ```

     Salin isi file `db/etl/supabase_kpi_daily_schema.sql` dan eksekusi.

2. (Opsional) **Isi data dummy** untuk testing dashboard:

   - Eksekusi isi file `db/etl/supabase_kpi_daily_dummy_data.sql` di Supabase SQL Editor.

3. (Opsional) **Tambahkan RLS policy** untuk `inventory_kpi_daily` dan `fleet_kpi_daily`
   sesuai model `org_id` / `warehouse_id` yang sudah ada pada proyek Anda.

---

### 2.3. Setup ETL Harian (Cron)

1. Salin file `scripts/etl/run_daily_kpi_etl.sh` ke server ETL / cron host.
2. Ubah permission:

   ```bash
   chmod +x scripts/etl/run_daily_kpi_etl.sh
   ```

3. Sesuaikan **ENV** di server (misal via `/etc/environment` atau file `.env`):

   - `TIDB_HOST`, `TIDB_PORT`, `TIDB_USER`, `TIDB_PASSWORD`, `TIDB_DATABASE`
   - (Opsional) endpoint internal untuk sync ke Supabase / Apps Script.

4. Buat entri cron (contoh, setiap hari 23:00 WIB ≈ 16:00 UTC):

   ```bash
   # Edit dengan: crontab -e
   0 16 * * * /path/to/project/scripts/etl/run_daily_kpi_etl.sh >> /var/log/ptmmm_daily_kpi_etl.log 2>&1
   ```

---

## 3. Proses ETL Harian (Ringkas)

1. Cron memanggil `run_daily_kpi_etl.sh` dengan parameter `DATA_DATE` (default: kemarin).
2. Script shell memanggil stored procedure:

   ```sql
   CALL sp_run_daily_kpi_etl('<DATA_DATE>');
   ```

3. Stored procedure:
   - Menghapus (soft) / menyiapkan data harian yang sudah ada untuk `data_date` tsb.
   - Mengambil agregat dari tabel operasional (inventory_tx, shipments, scan_event).
   - Menulis ringkasan harian ke `inventory_kpi_daily` dan `fleet_kpi_daily`.
4. (Opsional) Langkah tambahan:
   - Push ringkasan ke Supabase / Google Sheet (via job terpisah atau Apps Script).
   - Update materialized view / cache untuk keperluan dashboard.

---

## 4. Mekanisme Rollback

Jika terjadi masalah kritis setelah migrasi:

1. **Rollback hanya data KPI** (aman untuk operasional):

   ```sql
   DELETE FROM inventory_kpi_daily WHERE data_date = '<TANGGAL_BERMASALAH>';
   DELETE FROM fleet_kpi_daily WHERE data_date = '<TANGGAL_BERMASALAH>';
   ```

2. **Rollback objek skema** (tabel & prosedur) – gunakan hati‑hati:

   ```sql
   DROP PROCEDURE IF EXISTS sp_run_daily_kpi_etl;
   DROP TABLE IF EXISTS inventory_kpi_daily;
   DROP TABLE IF EXISTS fleet_kpi_daily;
   ```

3. Di Supabase, Anda bisa menghapus tabel mirror:

   ```sql
   DROP TABLE IF EXISTS public.inventory_kpi_daily;
   DROP TABLE IF EXISTS public.fleet_kpi_daily;
   ```

> **Saran**: Lakukan backup sebelum menghapus tabel pada environment produksi.

---

## 5. Daftar Perubahan (Changelog v0.3.0)

- **Baru**: `inventory_kpi_daily` (TiDB & Supabase).
- **Baru**: `fleet_kpi_daily` (TiDB & Supabase).
- **Baru**: Stored procedure `sp_run_daily_kpi_etl`.
- **Baru**: Script shell `run_daily_kpi_etl.sh`.
- **Baru**: SQL dummy data untuk KPI harian.
- **Dokumen**:
  - `docs/etl/daily_kpi_etl.md` – deskripsi alur ETL dan rumus KPI.
  - `db/etl/README_migration_v0_3_0.md` – panduan migrasi ini.

---

## 6. Troubleshooting Singkat

- **Masalah**: Prosedur gagal karena tabel tidak ditemukan  
  → Pastikan `tidb_kpi_daily_schema.sql` sudah dijalankan di database yang benar.

- **Masalah**: Nilai KPI kosong / nol  
  → Cek apakah data operasional untuk `data_date` yang dimaksud sudah masuk ke
    tabel `inventory_tx`, `shipments`, dan `scan_event`.

- **Masalah**: Cron tidak jalan  
  → Periksa:
    - `crontab -l`
    - Log di `/var/log/ptmmm_daily_kpi_etl.log`
    - Hak akses file `run_daily_kpi_etl.sh`.

- **Masalah**: Dashboard tidak menampilkan data Supabase  
  → Pastikan:
    - Tabel mirror (`inventory_kpi_daily`, `fleet_kpi_daily`) terisi.
    - RLS policy pada Supabase mengizinkan role/warehouse yang melihat data.
