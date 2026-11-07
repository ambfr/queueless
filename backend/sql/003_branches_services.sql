-- 003: branches and services

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  address text,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  avg_service_minutes int not null default 5 check (avg_service_minutes between 1 and 240),
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.branches enable row level security;
alter table public.services enable row level security;

create or replace function public.is_business_owner(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from businesses where id = b and owner_id = auth.uid());
$$;

create or replace function public.owns_branch(br uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from branches b join businesses bu on bu.id = b.business_id
    where b.id = br and bu.owner_id = auth.uid()
  );
$$;

-- everyone logged in can browse; only the owner can change
create policy "read branches" on public.branches
  for select to authenticated using (true);
create policy "owner inserts branches" on public.branches
  for insert to authenticated with check (public.is_business_owner(business_id));
create policy "owner updates branches" on public.branches
  for update to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));
create policy "owner deletes branches" on public.branches
  for delete to authenticated using (public.is_business_owner(business_id));

create policy "read services" on public.services
  for select to authenticated using (true);
create policy "owner inserts services" on public.services
  for insert to authenticated with check (public.owns_branch(branch_id));
create policy "owner updates services" on public.services
  for update to authenticated
  using (public.owns_branch(branch_id))
  with check (public.owns_branch(branch_id));
create policy "owner deletes services" on public.services
  for delete to authenticated using (public.owns_branch(branch_id));