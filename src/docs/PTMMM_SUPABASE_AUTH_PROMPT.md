# PTMMM – Prompt Lengkap Penyesuaian Auth Supabase & Arsitektur Web

File ini berisi **prompt siap pakai** yang bisa kamu paste ke ChatGPT 5 / AI lain
untuk menyesuaikan kode Next.js + Supabase + TiDB/Prisma dengan:

- Skema Auth & RBAC di `AUTH_SUPABASE_PTMMM.md`
- Hasil audit arsitektur di `docs/audit/ptmmm-web-audit.md` dan `architecture.mmd`
- Mekanisme `guardApiRoute`, `getServerUserContext`, `ensureSectionAccess`, rate limit,
  token ETL/Scan, dan layanan service-layer yang sudah ada.

---

## Prompt Lengkap (silakan copy-paste apa adanya)

```text
Konteks proyek (penting, jangan dihapus):

- Monorepo/web: `src/web` untuk sistem **PT Mitramulia Makmur – Digital Tracking & WMS**.
- Stack utama:
  - Next.js 14 (App Router)
  - Supabase Auth (Postgres) untuk login & session
  - TiDB + Prisma untuk data operasional (orders, shipments, routes, scan_event, KPI)
  - Vitest untuk test (unit + service + API + auth)
- Dokumentasi yang menjadi sumber kebenaran:
  - `docs/AUTH_SUPABASE_PTMMM.md` → skema Supabase Auth & RBAC (app_role, organization, warehouse, user_org_role, warehouse_member, mapping role→section).
  - `docs/audit/ptmmm-web-audit.md` + `docs/audit/architecture.mmd` → audit arsitektur: alur App Router, API Routes, services, rate limit, token ETL/Scan, logging, dsb.

Ringkasan Auth & RBAC (ikut dokumen di atas):

- Role enum: `app_role = ('admin','ops','marketing','warehouse','security','driver')`
- Tabel utama:
  - `organization` (id, code, name, is_active)
  - `warehouse` (id, org_id → organization.id, code, name)
  - `user_org_role` (user_id → auth.users.id, org_id, role, unique (user_id, org_id, role))
  - `warehouse_member` (user_id → auth.users.id, warehouse_id, unique (user_id, warehouse_id))
- `getServerUserContext()` mengembalikan object kira-kira seperti:
  - `{ id, email, orgId, roles: AppRole[], primaryRole, warehouseIds: string[], sectionsAllowed: ('kpi'|'events'|'orders'|'shipments'|'reports')[] }`
- Mapping role → section (kurang lebih):
  - admin: kpi, events, orders, shipments, reports
  - ops: kpi, events, shipments
  - marketing: kpi, orders
  - warehouse: shipments (+ events jika di gudang sendiri)
  - security: events
  - driver: shipments

Arsitektur & modul utama (ikut audit):

- App Router (`app/*`):
  - Pages: `dashboard/page.tsx`, `login/page.tsx`, `tracking/[token]/page.tsx`, dll.
  - API Routes utama:
    - `app/api/analytics/overview/route.ts`
    - `app/api/etl/spreadsheet/route.ts`
    - `app/api/route/[code]/route.ts`
    - `app/api/scan/route.ts`
    - `app/api/tracking/[token]/route.ts`
    - `app/api/login/route.ts`
    - `app/api/health/route.ts`
- Auth & guard:
  - `lib/auth/server-auth.ts`
  - `lib/auth/route-guard.ts` (mis. `guardApiRoute`, `ensureSectionAccess`)
  - `lib/auth/client-auth.ts` (login client)
  - `lib/auth/getUserRole.ts`
- Services (Prisma → TiDB):
  - `lib/services/analytics-service.ts`
  - `lib/services/scan-service.ts`
  - `lib/services/tracking-service.ts`
  - `lib/services/route-service.ts`
  - `lib/services/etl-service.ts`
  - (plus orders-service, shipments-service, dsb. jika ada)
- Util pendukung:
  - `lib/errors.ts`, `lib/rate-limit.ts`, `lib/logging.ts`, `lib/types.ts`
  - `lib/prisma.ts`, `lib/supabase/server.ts`, `lib/supabase/client.ts`
- Middleware & public pages:
  - `middleware.ts` (CSP untuk tracking, dll)
  - `app/tracking/[token]/page.tsx` (halaman public tracking, tapi API-nya tetap protected)

TUGAS UNTUKMU (AI):

Tolong lakukan **penyesuaian & perbaikan menyeluruh** dengan fokus pada AUTH, RBAC, dan integrasi arsitektur, tanpa merusak flow yang sudah LOLA (login → guard → service → Prisma → TiDB) dan tanpa memecahkan test yang sudah ada.

Langkah-langkah:

1. **Audit ulang integrasi Auth & RBAC di kode**  
   - Baca:
     - `lib/auth/server-auth.ts`
     - `lib/auth/route-guard.ts`
     - `lib/auth/client-auth.ts`
     - `lib/auth/getUserRole.ts`
     - `app/api/login/route.ts`
     - `middleware.ts`
   - Cocokkan implementasi dengan skema & alur di `AUTH_SUPABASE_PTMMM.md` dan `ptmmm-web-audit.md`:
     - Pastikan `getServerUserContext()` benar-benar menggunakan Supabase session (`supabaseServerClient`) dan membaca role + warehouse dari tabel RBAC (user_org_role, warehouse_member).
     - Pastikan `guardApiRoute()` menjalankan urutan: rate limit → validasi token khusus (ETL/Scan kalau ada) → `getServerUserContext()` → `ensureSectionAccess()`/`requireRole()` → handler → `toHttpResponse()`.
     - Pastikan `canViewSection()` mengikuti mapping role→section seperti di dokumentasi (admin/ops/marketing/warehouse/security/driver).

2. **Rapikan & kuatkan HALAMAN LOGIN + API LOGIN**  
   - Tinjau:
     - `app/(public)/login/page.tsx` (atau lokasi login page yang sebenarnya)
     - `lib/auth/client-auth.ts` (fungsi `loginWithPassword` dan sejenisnya)
     - `app/api/login/route.ts`
   - Sesuaikan supaya:
     - Login **hanya** lewat Supabase Auth (`supabase.auth.signInWithPassword` dan opsional magic link/OAuth).  
       Tidak ada cek password manual ke TiDB/Prisma.
     - API `/api/login` (jika dipakai) menggunakan `getServerUserContext()` setelah sign-in untuk mendapatkan role, orgId, warehouseIds, sectionsAllowed, lalu mengembalikan payload login yang jelas ke client (role & redirect).
     - Login page:
       - Validasi email/password dengan zod.
       - Panggil `loginWithPassword` yang di dalamnya memakai Supabase.
       - Menentukan redirect berdasarkan `primaryRole` + query `redirect` (kalau ada), dengan mapping:
         - admin → `/admin` (atau `/dashboard` jika itu home admin)
         - ops → `/ops/dashboard`
         - marketing → `/marketing/dashboard`
         - security → `/security/gate`
         - driver → `/driver/home`
         - warehouse → `/warehouse/dashboard`
         - fallback (tanpa role) → `/dashboard` + pesan warning.
       - Menangani error Supabase dengan pesan yang tepat untuk user (invalid credentials, user not found, network error, dsb).
       - Menampilkan loading state (tombol “Memproses…” saat submit).
     - Bila ada magic link/OAuth:
       - Gunakan route callback (mis. `/auth/callback`) yang memakai helper `exchangeCodeForSession` lalu redirect ke `next` atau ke halaman sesuai role.

3. **Pastikan SEMUA API ROUTE utama pakai pola guard yang konsisten**  
   - Tinjau dan sesuaikan bila perlu:
     - `app/api/analytics/overview/route.ts`
     - `app/api/etl/spreadsheet/route.ts`
     - `app/api/route/[code]/route.ts`
     - `app/api/scan/route.ts`
     - `app/api/tracking/[token]/route.ts`
   - Terapkan pola:
     - Ambil handler utama sebagai fungsi murni yang menerima `{ ctx, body/query, prisma }` atau sejenis (service-first).
     - Bungkus handler dengan `guardApiRoute` / pattern serupa:
       - rate limit (untuk route sensitif seperti scan)
       - validasi token khusus (ETL/Scan via `x-etl-token` / `x-scan-token` + env)
       - `getServerUserContext()` → 401 jika null
       - `requireRole(ctx, allowedRoles)` → 403 kalau tidak cocok
       - `ensureSectionAccess(ctx, section)` / `canViewSection` → 403 kalau section tidak diizinkan
     - Di dalam handler:
       - Query ke Prisma/TiDB **wajib** difilter dengan `ctx.orgId` dan, bila relevan, `ctx.warehouseIds` (in).  
         Hindari query yang lepas dari tenant (multi-tenant safety).
   - Khusus:
     - `/api/analytics/overview` → hanya role dengan akses `kpi` (admin, ops, marketing); filter data per orgId (& warehouse jika relevan).
     - `/api/etl/spreadsheet` → cek token ETL (`x-etl-token` == `ETL_WRITE_TOKEN`) + role (admin/ops); validasi payload; insert ke staging/operational tables via `etl-service`.
     - `/api/scan` → cek token Scan (`x-scan-token` == `SCAN_WRITE_TOKEN`) + role (ops/security/warehouse); panggil `scan-service`.
     - `/api/route/[code]` + `/api/tracking/[token]` → role yang punya akses `shipments` (admin, ops, driver, warehouse).

4. **Selaraskan layanan service-layer dengan konteks org & gudang**  
   - Audit:
     - `analytics-service.ts`
     - `scan-service.ts`
     - `route-service.ts`
     - `tracking-service.ts`
     - `etl-service.ts`
   - Pastikan setiap fungsi service menerima `ctx` (atau `orgId` + `warehouseIds`) sehingga query Prisma selalu terikat tenant yang benar.
   - Bila saat ini hardcode org/warehouse, refactor supaya memakai nilai dari `ctx`.
   - Tetap pertahankan API publik fungsi (signature) sejauh mungkin supaya test lama tidak rusak, atau jika harus berubah, sesuaikan testnya.

5. **Refine Rate Limit & Token Handling** (minimal di level kode, walaupun storage masih in-memory)
   - `lib/rate-limit.ts`:
     - Pastikan interface jelas dan mudah diganti ke Redis/Upstash (misalnya key, windowMs, limit).
     - Pastikan semua route sensitif (scan, mungkin tracking) memakai rate limit ini via guard.
   - Token ETL/Scan:
     - Pastikan route ETL/Scan *selalu* mengecek header token sebelum memproses body.
     - Berikan error 401 (tanpa token) / 403 (token mismatch) secara konsisten, menggunakan `AppError` + `toHttpResponse`.

6. **Testing**  
   - Jangan hapus test yang sudah ada.  
   - Sesuaikan / tambahkan test bila perlu untuk mencakup:
     - Login flow (sukses per role, error Supabase, loading state).
     - API auth & authorization:
       - 401 jika tidak login,
       - 403 jika role/section tidak diizinkan,
       - 200 jika user punya access yang benar.
     - Token ETL & Scan:
       - Tanpa token → 401,
       - Token salah → 403,
       - Token benar + role benar → 200 dan service terpanggil.
   - Pastikan setelah semua perubahan, `npm test` tetap hijau.

OUTPUT YANG SAYA HARAPKAN:

1. Kode final lengkap atau patch jelas untuk file-file yang diubah, terutama:
   - `lib/auth/server-auth.ts`
   - `lib/auth/route-guard.ts`
   - `lib/auth/client-auth.ts`
   - `lib/auth/getUserRole.ts`
   - `app/(public)/login/page.tsx`
   - `app/api/login/route.ts`
   - `app/api/analytics/overview/route.ts`
   - `app/api/etl/spreadsheet/route.ts`
   - `app/api/route/[code]/route.ts`
   - `app/api/scan/route.ts`
   - `app/api/tracking/[token]/route.ts`
   - service-layer terkait bila perlu (analytics/scan/route/tracking/etl)
2. Penjelasan singkat per bagian:
   - Bagaimana Auth & RBAC sekarang terhubung dari Supabase → getServerUserContext → guardApiRoute → service → Prisma/TiDB.
   - Bagaimana kamu memastikan filter orgId & warehouseIds konsisten di semua layer.
   - Cara saya menjalankan verifikasi (perintah `npm test`, cara mencoba login/route di browser atau via HTTP client).

Tolong prioritaskan **konsistensi dengan dokumentasi AUTH_SUPABASE_PTMMM.md dan audit arsitektur** sekaligus menjaga test existing tetap lulus.
```

