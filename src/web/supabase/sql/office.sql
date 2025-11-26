-- Create office table
create table if not exists public.office (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  code text not null unique,
  name text not null,
  type text not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now()
);

-- Create office_member table
create table if not exists public.office_member (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  office_id uuid not null,
  role_in_office text,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_office_member_user on public.office_member (user_id);
create index if not exists idx_office_member_office on public.office_member (office_id);

-- Optional mapping table: office -> warehouse
create table if not exists public.office_warehouse_map (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null,
  warehouse_id text not null
);

create index if not exists idx_office_wh_office on public.office_warehouse_map (office_id);
create index if not exists idx_office_wh_warehouse on public.office_warehouse_map (warehouse_id);

-- RLS policies (example, adjust as needed)
alter table public.office enable row level security;
alter table public.office_member enable row level security;
alter table public.office_warehouse_map enable row level security;

create policy "office readable" on public.office for select using (true);
create policy "office_member by user" on public.office_member for select using (auth.uid() = user_id);
create policy "office_wh readable" on public.office_warehouse_map for select using (true);
