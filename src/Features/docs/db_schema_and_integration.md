# Integrasi Skema Supabase & TiDB untuk PTMMM Digital Tracking

Lihat file SQL di folder `supabase/` dan `tidb/` untuk skema lengkap,
RLS policies, dan data dummy. Jalankan berurutan:

1. Supabase: 01_auth_and_org_schema.sql → 02_auth_policies_and_seed.sql
2. TiDB: 01_ptmmm_ops_schema.sql → 02_ptmmm_ops_seed.sql

Semua id organisasi/warehouse disamakan agar mudah dihubungkan via UserContext
(`orgId` dan `warehouseIds`) di layer aplikasi.
