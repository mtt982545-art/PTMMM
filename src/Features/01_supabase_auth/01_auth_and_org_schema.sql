-- 01_auth_and_org_schema.sql
-- Skema inti Supabase untuk roles, organisasi, dan warehouse
-- Jalankan di Supabase SQL Editor (Postgres)

-- 1. Enum untuk roles aplikasi
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum (
      'admin',
      'ops',
      'marketing',
      'warehouse',
      'security',
      'driver'
    );
  end if;
end$$;

-- 2. Tabel organisasi
create table if not exists public.organization (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. Tabel warehouse (gudang)
create table if not exists public.warehouse (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organization(id) on delete cascade,
  code          text not null,
  name          text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (org_id, code)
);

-- 4. Profil user (opsional, melengkapi auth.users)
create table if not exists public.user_profile (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  phone      text,
  created_at timestamptz not null default now()
);

-- 5. Mapping user → organization → role
create table if not exists public.user_org_role (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  user_email  text not null,
  org_id      uuid not null references public.organization(id) on delete cascade,
  role        app_role not null,
  created_at  timestamptz not null default now(),
  unique (user_id, org_id, role)
);

-- 6. Keanggotaan user di warehouse
create table if not exists public.warehouse_member (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  user_email   text not null,
  warehouse_id uuid not null references public.warehouse(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (user_id, warehouse_id)
);
