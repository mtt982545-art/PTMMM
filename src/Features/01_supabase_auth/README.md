# 01_supabase_auth – Quick Start

Folder ini berisi semua skrip SQL dan dokumen terkait konfigurasi **Supabase** untuk:

- Autentikasi (Supabase Auth)
- Struktur organisasi & warehouse
- Policy Row Level Security (RLS)
- Mirror tabel *_kpi_daily untuk kebutuhan dashboard ringan

## 1. Langkah Eksekusi Singkat (3–5 langkah)

1. Login ke **Supabase Dashboard** dan pilih proyek yang sesuai.
2. Buka menu **SQL Editor**.
3. Jalankan skrip berikut secara berurutan (*sesuaikan nama file aktual*):
   - `01_supabase_auth/01_auth_and_org_schema.sql`
   - `01_supabase_auth/02_auth_policies_and_seed.sql`
   - `01_supabase_auth/10_supabase_kpi_daily_schema.sql`
   - `01_supabase_auth/11_supabase_kpi_daily_dummy_data.sql` (opsional untuk demo)
4. Verifikasi RLS dan role dengan mencoba login dan akses dashboard di aplikasi Next.js.
5. Simpan perubahan dan pastikan environment Supabase (URL & KEY) sudah di-set di `.env` backend.

## 2. Prasyarat & Dependensi

- Akun Supabase aktif (Project siap pakai).
- Hak akses Owner / Maintainer pada project Supabase.
- Browser modern untuk akses dashboard.
- Backend (Next.js) sudah terkonfigurasi untuk menggunakan Supabase URL & anon/service key.

## 3. Contoh Perintah Dasar

- Eksekusi SQL dari CLI (opsional):

```bash
# Contoh jika menggunakan psql ke Supabase (via connection string)
psql "$SUPABASE_DB_URL" -f 01_supabase_auth/01_auth_and_org_schema.sql
```

- Cek tabel auth dan org:

```sql
select * from auth.users limit 5;
select * from public.user_org_role limit 5;
```

## 4. Dokumentasi Lanjutan

- Lihat `../docs/db_schema_and_integration.md` untuk skema lengkap.
- Lihat `../docs/auth_workflow_and_export.md` untuk alur role-based access dan export laporan.
