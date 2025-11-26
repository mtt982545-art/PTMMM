# 02_tidb_prisma – Quick Start

Folder ini berisi skema **TiDB** dan integrasi **Prisma** untuk:

- Tabel operasional utama (orders, shipments, scan_event, dsb).
- Tabel KPI harian (`inventory_kpi_daily`, `fleet_kpi_daily`, dan keluarga `*_kpi_daily` lain).
- View dan helper untuk analitik.

## 1. Langkah Eksekusi Singkat

1. Pastikan instance **TiDB** sudah berjalan dan dapat diakses dari lingkungan backend.
2. Jalankan skrip skema inti (*sesuaikan nama file aktual*):
   - `02_tidb_prisma/01_ptmmm_ops_schema.sql`
   - `02_tidb_prisma/02_ptmmm_ops_seed.sql`
   - `02_tidb_prisma/10_tidb_kpi_daily_schema.sql`
   - `02_tidb_prisma/11_tidb_kpi_daily_dummy_data.sql` (opsional untuk demo).
3. Konfigurasi koneksi di `.env` backend (mis. `DATABASE_URL` untuk Prisma).
4. Regenerasi Prisma Client:

```bash
cd src/web
npx prisma generate
```

5. Jalankan test dan/atau `npm run dev` untuk memastikan aplikasi dapat membaca/menulis ke TiDB.

## 2. Prasyarat & Dependensi

- TiDB Server / TiDB Cloud dengan kredensial akses yang valid.
- Prisma CLI (`npx prisma`) ter-install (otomatis via `npm install` project).
- Network access antara aplikasi dan TiDB (firewall, security group, dll).

## 3. Contoh Perintah Dasar

- Eksekusi SQL schema dari CLI TiDB:

```bash
mysql -h <tidb-host> -P <tidb-port> -u <user> -p < db_name   < 02_tidb_prisma/01_ptmmm_ops_schema.sql
```

- Cek data KPI harian:

```sql
select * from inventory_kpi_daily order by kpi_date desc limit 10;
select * from fleet_kpi_daily order by kpi_date desc limit 10;
```

## 4. Dokumentasi Lanjutan

- Lihat `../docs/db_schema_and_integration.md` untuk relasi Supabase ↔ TiDB.
- Lihat `../docs/etl/daily_kpi_etl.md` untuk integrasi ETL harian KPI.
