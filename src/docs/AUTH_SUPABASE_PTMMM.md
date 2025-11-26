# PTMMM – Supabase Auth & RBAC Guide

Dokumen ini menjelaskan cara kerja autentikasi & otorisasi berbasis Supabase
untuk proyek PT Mitramulia Makmur (PTMMM), dan bagaimana relasinya dengan
organisasi, gudang, dan layanan backend (Next.js + TiDB/Prisma).

---

## 1. Gambaran Umum

- **Supabase Auth (`auth.users`)**  
  Menyimpan akun login (email, password, OAuth, magic link).  
  Kita **tidak mengubah struktur** tabel ini.

- **Postgres (schema `public`)**  
  Menyimpan:
  - daftar organisasi dan gudang,
  - mapping user → organisasi → role,
  - mapping user → gudang.

- **Next.js (app router)**  
  Menggunakan helper server-side:
  - `getServerUserContext()` → baca session Supabase, query tabel RBAC, lalu
    mengembalikan objek konteks user.
  - `requireRole(user, allowedRoles)` → memastikan role user diizinkan.
  - `canViewSection(user, section)` → memastikan user boleh akses section/menu
    tertentu (`kpi`, `events`, `orders`, `shipments`, `reports`).

---

## 2. Skema Supabase Auth (Postgres)

> Nama kolom / tabel sesuaikan dengan SQL yang sudah kamu pakai (01_auth_and_org_schema.sql).  
> Di sini kita rangkum struktur dan relasinya saja.

### 2.1 Enum `app_role`

Digunakan untuk mendefinisikan role aplikasi:

```sql
create type app_role as enum (
  'admin',
  'ops',
  'marketing',
  'warehouse',
  'security',
  'driver'
);
```

### 2.2 Tabel `organization`

- `id` (uuid, PK)
- `code` (text, unik) – contoh: `PTMMM`
- `name` (text)
- `is_active` (bool)

### 2.3 Tabel `warehouse`

- `id` (uuid, PK)
- `org_id` → `organization.id`
- `code` (unik per org) – contoh: `WH-SDA`, `WH-NGJ`, `WH-SGS`, `WH-SRG`
- `name`
- `is_active` (bool)

### 2.4 Tabel `user_profile` (opsional)

- `user_id` → `auth.users.id` (1–1)
- `full_name`
- `phone`

Dipakai untuk info tambahan user (nama lengkap, no HP, dsb).

### 2.5 Tabel `user_org_role`

Mapping user → organisasi → role:

- `id` (uuid, PK)
- `user_id` → `auth.users.id`
- `user_email`
- `org_id` → `organization.id`
- `role` → `app_role`
- `unique (user_id, org_id, role)`

Ini adalah **sumber utama role** aplikasi (admin, ops, marketing, warehouse,
security, driver) per organisasi.

### 2.6 Tabel `warehouse_member`

Keanggotaan user di gudang:

- `id` (uuid, PK)
- `user_id` → `auth.users.id`
- `user_email`
- `warehouse_id` → `warehouse.id`
- `unique (user_id, warehouse_id)`

Digunakan untuk menentukan gudang mana saja yang boleh diakses user
(`warehouseIds`).

---

## 3. Relasi Utama

Secara logika:

- `auth.users` 1 — 1 `user_profile`
- `auth.users` 1 — * `user_org_role` * — 1 `organization`
- `organization` 1 — * `warehouse`
- `auth.users` 1 — * `warehouse_member` * — 1 `warehouse`

Diagram sederhana:

```text
auth.users (id)
   ├─1:1─ user_profile (user_id)
   ├─1:*─ user_org_role (user_id) ──*:1── organization (id)
   └─1:*─ warehouse_member (user_id) ──*:1── warehouse (id)
                                      └─1:1── organization (org_id)
```

RLS (Row Level Security) prinsip umum:

- `user_org_role` & `warehouse_member`:
  - hanya `service_role` yang boleh INSERT/UPDATE/DELETE,
  - user biasa hanya boleh `SELECT` baris yang `user_id = auth.uid()`.

---

## 4. Konteks User di Next.js

`getServerUserContext()` bertugas:

1. Baca session Supabase dari request (JWT Supabase).
2. Ambil `auth.users.id` dan `email` dari session.
3. Query:
   - `user_org_role` untuk dapatkan daftar `(org_id, role)`,
   - `warehouse_member` untuk dapatkan daftar `warehouse_id` yang boleh diakses.
4. Bentuk objek konteks, misalnya:

```ts
type AppRole =
  | 'admin'
  | 'ops'
  | 'marketing'
  | 'warehouse'
  | 'security'
  | 'driver'

type Section = 'kpi' | 'events' | 'orders' | 'shipments' | 'reports'

interface UserContext {
  id: string          // auth.users.id
  email: string
  orgId: string       // organisasi aktif (bisa diambil dari user_org_role pertama / pilihan user)
  roles: AppRole[]    // semua role user di org tersebut
  primaryRole: AppRole | null
  warehouseIds: string[]
  sectionsAllowed: Section[]
}
```

### 4.1 Mapping Role → Section

Contoh mapping (sesuai test `can-view-section` di project):

- `admin`  
  → `kpi`, `events`, `orders`, `shipments`, `reports`
- `ops`  
  → `kpi`, `events`, `shipments`
- `marketing`  
  → `kpi`, `orders`
- `warehouse` (opsional, tergantung desain)  
  → biasanya `shipments` + `events` di gudangnya sendiri
- `security`  
  → `events`
- `driver`  
  → `shipments`

Fungsi `canViewSection(user, section)` menggunakan kombinasi role di atas untuk
mengisi `sectionsAllowed` dan memutuskan apakah user boleh akses section tertentu.

---

## 5. Pola Otentikasi

### 5.1 Login Internal

- Seluruh proses login **wajib lewat Supabase Auth**:
  - Email/password → `supabase.auth.signInWithPassword({ email, password })`
  - Magic link → `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: <callback URL> } })`
  - OAuth (Google, GitHub, dll) → `supabase.auth.signInWithOAuth(...)`

- **Jangan** cek password langsung ke TiDB/Prisma.

- Setelah login sukses:
  - Supabase menyimpan session (access token + refresh token) di cookie.
  - Server (Next.js) membaca session ini untuk `getServerUserContext()`.

### 5.2 Halaman Login

Halaman login (misal `app/(public)/login/page.tsx`) idealnya:

1. Menggunakan `react-hook-form` + `zod` untuk validasi `email` dan `password`.
2. Memanggil helper `loginWithPassword` (client) yang di dalamnya memanggil
   Supabase Auth, lalu mengembalikan hasil dengan bentuk:
   ```ts
   type LoginResult =
     | { ok: true; user: { id: string; email: string; role: AppRole | null } }
     | { ok: false; code: string; message: string }
   ```
3. Menentukan redirect setelah login berdasarkan:
   - `primaryRole` (role utama user), dan
   - parameter query `redirect` jika ada.

Contoh mapping redirect:

- `admin` → `/admin`
- `ops` → `/ops/dashboard`
- `marketing` → `/marketing/dashboard`
- `security` → `/security/gate`
- `driver` → `/driver/home`
- tidak ada role → `/dashboard` + warning "role belum ditetapkan"

---

## 6. Pola Otorisasi di API Route / Server Component

### 6.1 Langkah Umum

Setiap route API yang butuh auth sebaiknya:

1. Ambil konteks user:

```ts
const ctx = await getServerUserContext()
if (!ctx) {
  // 401 Unauthorized
}
```

2. Batasi role:

```ts
if (!requireRole(ctx, ['admin', 'ops'])) {
  // 403 Forbidden
}
```

3. Batasi section (menu/fitur):

```ts
if (!canViewSection(ctx, 'kpi')) {
  // 403 Forbidden
}
```

4. Filter query TiDB/Prisma dengan `ctx.orgId` dan `ctx.warehouseIds`:

```ts
await prisma.shipment.findMany({
  where: {
    organizationId: ctx.orgId,
    warehouseId: { in: ctx.warehouseIds },
  },
})
```

### 6.2 Contoh Penggunaan

- `/api/analytics/overview`  
  - Hanya role dengan akses `kpi` (admin, ops, marketing).  
  - Query KPI harus difilter `orgId = ctx.orgId`.

- `/api/scan`  
  - Hanya role dengan akses `events` (ops, security, mungkin warehouse).  
  - Event `scan_event` wajib tersimpan dengan `organization_id` dan `warehouse_id`
    yang sesuai dengan `ctx.orgId` & `ctx.warehouseIds`.

- `/api/route/[code]` & `/api/tracking/[token]`  
  - Role yang boleh lihat `shipments` (admin, ops, driver, warehouse).  
  - Data route & tracking difilter per organisasi.

---

## 7. Checklist Integrasi

Saat mengembangkan atau mengaudit kode, gunakan checklist ini:

1. **Login Page**
   - ✅ Hanya menggunakan Supabase Auth untuk sign-in.
   - ✅ Menangani error Supabase dengan pesan yang jelas.
   - ✅ Menentukan redirect berdasarkan role + query `redirect`.
   - ✅ Menampilkan loading state saat proses login.

2. **Helper Auth (Server)**
   - ✅ `getServerUserContext()` membaca session Supabase dengan benar.
   - ✅ Mengisi `orgId`, `roles`, `primaryRole`, `warehouseIds`, `sectionsAllowed`
     berdasarkan tabel `user_org_role` dan `warehouse_member`.
   - ✅ `requireRole` dan `canViewSection` dipakai konsisten di semua route.

3. **API Route / Server Component**
   - ✅ Selalu memanggil `getServerUserContext()` di awal (kecuali route publik).
   - ✅ Menolak akses 401 jika user tidak login.
   - ✅ Menolak akses 403 jika role/section tidak diizinkan.
   - ✅ Semua query ke TiDB/Prisma difilter dengan `orgId` dan jika relevan `warehouseIds`.

4. **Testing**
   - ✅ Ada test 401/403/200 untuk tiap route protected.
   - ✅ Ada test login (validasi form, success redirect, error Supabase, loading).

---

## 8. Cara Menggunakan Dokumen Ini

Saat kamu meminta bantuan AI (misalnya ChatGPT) untuk:

- refactor halaman login,
- menambah route API baru,
- menghubungkan Supabase Auth dengan Prisma/TiDB,
- atau memperbaiki test auth/authorization,

sertakan ringkasan dari dokumen ini atau lampirkan file ini supaya
AI selalu mengikuti skema dan pola autentikasi yang sama.
