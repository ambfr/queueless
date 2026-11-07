-- 002: businesses, staff, membership helpers, create/add/remove functions

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  description text,
  created_at timestamptz not null default now()
);

create table public.business_staff (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

alter table public.businesses enable row level security;
alter table public.business_staff enable row level security;

create or replace function public.is_business_member(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from businesses where id = b and owner_id = auth.uid())
      or exists (select 1 from business_staff where business_id = b and user_id = auth.uid());
$$;

-- anyone logged in can browse businesses (customers need this to join queues)
create policy "read businesses" on public.businesses
  for select to authenticated using (true);
create policy "owner updates business" on public.businesses
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner deletes business" on public.businesses
  for delete using (owner_id = auth.uid());

create policy "members read staff" on public.business_staff
  for select using (public.is_business_member(business_id));

create policy "owner reads staff profiles" on public.profiles
  for select using (exists (
    select 1 from business_staff s join businesses b on b.id = s.business_id
    where s.user_id = profiles.id and b.owner_id = auth.uid()
  ));

-- inserts only happen through these functions
create or replace function public.create_business(p_name text, p_description text default null)
returns public.businesses language plpgsql security definer set search_path = public as $$
declare b public.businesses;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into businesses (owner_id, name, description)
    values (auth.uid(), p_name, p_description) returning * into b;
  perform set_config('app.allow_role_change', 'on', true);
  update profiles set role = 'business_owner' where id = auth.uid() and role = 'customer';
  return b;
end; $$;

create or replace function public.add_staff(p_business uuid, p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not exists (select 1 from businesses where id = p_business and owner_id = auth.uid()) then
    raise exception 'not the owner';
  end if;
  select id into uid from auth.users where lower(email) = lower(p_email);
  if uid is null then raise exception 'user not found'; end if;
  if uid = auth.uid() then raise exception 'owner is already a member'; end if;
  insert into business_staff (business_id, user_id) values (p_business, uid)
    on conflict do nothing;
  perform set_config('app.allow_role_change', 'on', true);
  update profiles set role = 'staff' where id = uid and role = 'customer';
end; $$;

create or replace function public.remove_staff(p_business uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from businesses where id = p_business and owner_id = auth.uid()) then
    raise exception 'not the owner';
  end if;
  delete from business_staff where business_id = p_business and user_id = p_user;
  if not exists (select 1 from business_staff where user_id = p_user) then
    perform set_config('app.allow_role_change', 'on', true);
    update profiles set role = 'customer' where id = p_user and role = 'staff';
  end if;
end; $$;