-- 02_auth_policies_and_seed.sql
-- RLS policies dan data dummy untuk testing
-- Jalankan SETELAH 01_auth_and_org_schema.sql

-- ======================
-- Enable Row Level Security
-- ======================
alter table public.user_org_role enable row level security;
alter table public.warehouse_member enable row level security;
alter table public.organization enable row level security;
alter table public.warehouse enable row level security;

-- ===================================================================
-- POLICIES user_org_role
-- ===================================================================

-- Hapus dulu kalau sudah ada (supaya bisa rerun script dengan aman)
drop policy if exists "user_org_role_service_write" on public.user_org_role;
drop policy if exists "user_org_role_read_own" on public.user_org_role;

-- Hanya service_role (backend / service key) yang boleh tulis apa pun
create policy "user_org_role_service_write"
on public.user_org_role
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- User biasa hanya boleh membaca role miliknya sendiri
create policy "user_org_role_read_own"
on public.user_org_role
for select
using (
  auth.uid() = user_id
  or auth.jwt() ->> 'email' = user_email
);

-- ===================================================================
-- POLICIES warehouse_member
-- ===================================================================

drop policy if exists "warehouse_member_service_write" on public.warehouse_member;
drop policy if exists "warehouse_member_read_own" on public.warehouse_member;

create policy "warehouse_member_service_write"
on public.warehouse_member
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "warehouse_member_read_own"
on public.warehouse_member
for select
using (
  auth.uid() = user_id
  or auth.jwt() ->> 'email' = user_email
);

-- ===================================================================
-- POLICIES organization (read only untuk member)
-- ===================================================================

drop policy if exists "organization_service_write" on public.organization;
drop policy if exists "organization_member_read" on public.organization;

create policy "organization_service_write"
on public.organization
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "organization_member_read"
on public.organization
for select
using (
  exists (
    select 1
    from public.user_org_role uor
    where uor.org_id = organization.id
      and (
        uor.user_id = auth.uid()
        or uor.user_email = auth.jwt() ->> 'email'
      )
  )
);

-- ===================================================================
-- POLICIES warehouse (read only untuk member)
-- ===================================================================

drop policy if exists "warehouse_service_write" on public.warehouse;
drop policy if exists "warehouse_member_read" on public.warehouse;

create policy "warehouse_service_write"
on public.warehouse
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "warehouse_member_read"
on public.warehouse
for select
using (
  exists (
    select 1
    from public.warehouse_member wm
    where wm.warehouse_id = warehouse.id
      and (
        wm.user_id = auth.uid()
        or wm.user_email = auth.jwt() ->> 'email'
      )
  )
);

-- ===================================================================
-- DATA DUMMY (ORG & WAREHOUSE)
-- ===================================================================

insert into public.organization (id, code, name)
values ('11111111-1111-1111-1111-111111111111', 'PTMMM', 'PT Mitramulia Makmur')
on conflict (id) do nothing;

insert into public.warehouse (id, org_id, code, name)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'WH-SBY',
  'Gudang Surabaya'
)
on conflict (id) do nothing;

-- ===================================================================
-- DATA DUMMY USER ADMIN (DINAMIS BERDASARKAN auth.users)
-- ===================================================================
-- Cara kerja:
-- 1) Pastikan sudah membuat user di Supabase Auth:
--    email: admin@ptmmm.co.id   (atau ubah di variabel v_admin_email)
-- 2) Block DO ini akan mencari id user tersebut di auth.users
-- 3) Jika ketemu, akan isi user_org_role + warehouse_member
-- 4) Jika tidak ketemu, hanya RAISE NOTICE dan tidak error

do $$
declare
  v_admin_email   text := 'admin@ptmmm.co.id';  -- UBAH di sini kalau mau email lain
  v_admin_user_id uuid;
  v_org_id        uuid := '11111111-1111-1111-1111-111111111111';
  v_wh_id         uuid := '22222222-2222-2222-2222-222222222222';
begin
  -- Cari id user di auth.users
  select u.id
  into v_admin_user_id
  from auth.users u
  where u.email = v_admin_email
  limit 1;

  if v_admin_user_id is null then
    -- Kalau user belum ada, jangan error, hanya kasih notice
    raise notice 'User dengan email % belum ditemukan di auth.users. 
                  Buat dulu user di Authentication → Users, lalu rerun block ini.',
                 v_admin_email;
  else
    -- Seed role organisasi
    insert into public.user_org_role (user_id, user_email, org_id, role)
    values (
      v_admin_user_id,
      v_admin_email,
      v_org_id,
      'admin'::public.app_role  -- cast ke enum app_role
    )
    on conflict (user_id, org_id) do nothing;

    -- Seed membership warehouse
    insert into public.warehouse_member (user_id, user_email, warehouse_id)
    values (
      v_admin_user_id,
      v_admin_email,
      v_wh_id
    )
    on conflict (user_id, warehouse_id) do nothing;

    raise notice 'Seed role & warehouse_member untuk % selesai. user_id=%',
                 v_admin_email, v_admin_user_id;
  end if;
end
$$;
