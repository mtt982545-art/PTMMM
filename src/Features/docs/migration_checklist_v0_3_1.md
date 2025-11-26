# Checklist Migrasi v0.3.1 – PTMMM Full Integration

Checklist ini membantu tim operasional melakukan migrasi ke paket integrasi **v0.3.1**
(Supabase Auth, TiDB + Prisma, dan ETL KPI harian) secara terkontrol.

## 1. [ ] Persiapan

- [ ] Backup **database TiDB** (schema + data) sebelum migrasi.
- [ ] Backup **database Supabase** (gunakan fitur backup bawaan atau export schema/data).
- [ ] Verifikasi versi saat ini (catat versi paket sebelumnya, mis. v0.3.0).
- [ ] Review changelog v0.3.1 dan daftar file SQL/skrip yang akan dijalankan.
- [ ] Alokasikan maintenance window yang disepakati dengan stakeholder (mis. 30–60 menit).
- [ ] Pastikan semua job ETL terjadwal (cron/Apps Script) dipause sementara jika berpotensi konflik.

## 2. [ ] Eksekusi

### 2.1 Supabase

- [ ] Login ke Supabase project yang dituju.
- [ ] Buka **SQL Editor** dan jalankan skrip berikut secara berurutan:

  1. [ ] `01_supabase_auth/01_auth_and_org_schema.sql`
  2. [ ] `01_supabase_auth/02_auth_policies_and_seed.sql`
  3. [ ] `01_supabase_auth/10_supabase_kpi_daily_schema.sql`
  4. [ ] `01_supabase_auth/11_supabase_kpi_daily_dummy_data.sql` (opsional untuk demo)

- [ ] Verifikasi tidak ada error pada eksekusi query.
- [ ] Cek sekilas isi tabel baru / kolom tambahan (mis. `inventory_kpi_daily_mirror`, dst jika ada).

### 2.2 TiDB

- [ ] Pastikan koneksi ke TiDB telah diuji (CLI / GUI).
- [ ] Jalankan skrip skema TI DB terkait v0.3.1, misalnya:

  1. [ ] `02_tidb_prisma/01_ptmmm_ops_schema.sql` (jika ada perubahan)
  2. [ ] `02_tidb_prisma/10_tidb_kpi_daily_schema.sql`
  3. [ ] `02_tidb_prisma/11_tidb_kpi_daily_dummy_data.sql` (opsional, untuk demo)

- [ ] Jalankan **Prisma migration/generate** di project backend:

```bash
cd src/web
npx prisma generate
# (opsional) npx prisma migrate deploy
```

- [ ] Validasi bahwa tabel `*_kpi_daily` sudah ada dan dapat diakses dari Prisma.

### 2.3 ETL Harian KPI

- [ ] Tinjau `03_etl/db/etl/sp_run_daily_kpi_etl.sql` dan sesuaikan nama DB/owner bila perlu.
- [ ] Terapkan stored procedure dan objek terkait ke TiDB:

```bash
mysql -h <tidb-host> -P <tidb-port> -u <user> -p < db_name   < 03_etl/db/etl/sp_run_daily_kpi_etl.sql
```

- [ ] Sesuaikan konfigurasi `scripts/etl/run_daily_kpi_etl.sh` (ENV dev/stg/prod, DSN DB, dsb).
- [ ] Daftarkan / update cron job harian, misalnya:

```bash
0 23 * * * /path/to/project/03_etl/scripts/etl/run_daily_kpi_etl.sh prod >> /var/log/ptmmm_kpi_etl.log 2>&1
```

- [ ] Jika ada ETL Sheets, pastikan URL endpoint dan token sudah sesuai prod (scan & etl spreadsheet).

## 3. [ ] Post-migrasi

- [ ] Jalankan **testing regresi** pada fitur utama:
  - [ ] Login & role-based menu (Supabase Auth).
  - [ ] CRUD orders/shipments, scan, tracking.
  - [ ] Dashboard analytics + export laporan.
  - [ ] ETL harian (uji sekali dengan tanggal uji).

- [ ] Validasi hasil KPI harian:
  - [ ] Cek tabel `inventory_kpi_daily` dan `fleet_kpi_daily` (sampel beberapa hari).
  - [ ] Pastikan nilai KPI masuk akal dan konsisten dengan data operasional.

- [ ] Performa & kesehatan sistem:
  - [ ] Pantau query berat di TiDB (jika ada monitoring/tooling).
  - [ ] Pantau waktu eksekusi ETL harian dan ukuran tabel `_kpi_daily`.

- [ ] Dokumentasi:
  - [ ] Update dokumentasi internal jika ada perubahan prosedur operasional.
  - [ ] Referensi ke paket v0.3.1 dan file README baru di repo.

- [ ] Komunikasi:
  - [ ] Informasikan ke stakeholder bahwa migrasi v0.3.1 telah selesai.
  - [ ] Sertakan ringkasan perubahan utama dan dampak ke user (jika ada).

---

> **Tips:** Simpan checklist ini sebagai bagian dari _Runbook Operasional_ dan centang item satu per satu
> setiap kali melakukan migrasi, baik di lingkungan dev/stg maupun prod.
