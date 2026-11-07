-- 001: profiles, signup trigger, role protection, API grants

-- New projects don't auto-grant table access to the API roles, so do it by default.
grant usage on schema public to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
alter default privileges in schema public
  grant execute on functions to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'customer'
    check (role in ('customer','business_owner','staff','admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- auto-create a profile on signup (role is always 'customer')
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- users can never change their own role; trusted functions flip app.allow_role_change
create or replace function public.prevent_role_change()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and coalesce(current_setting('app.allow_role_change', true), '') <> 'on' then
    raise exception 'role cannot be changed';
  end if;
  return new;
end; $$;

create trigger protect_role
  before update on public.profiles
  for each row execute function public.prevent_role_change();