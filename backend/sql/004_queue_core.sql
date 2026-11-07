-- 004: tokens and queue operations (all writes go through functions)

create table public.tokens (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  queue_date date not null default ((now() at time zone 'Asia/Kolkata')::date),
  token_number int not null,
  status text not null default 'waiting'
    check (status in ('waiting','called','serving','done','skipped','cancelled')),
  created_at timestamptz not null default now(),
  called_at timestamptz,
  completed_at timestamptz,
  unique (service_id, queue_date, token_number)
);

-- one active token per customer per service
create unique index one_active_token_per_customer
  on public.tokens (service_id, customer_id)
  where status in ('waiting','called','serving');

create index tokens_queue_idx
  on public.tokens (service_id, queue_date, status, token_number);

alter table public.tokens enable row level security;

create or replace function public.is_service_member(s uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from services sv
    join branches br on br.id = sv.branch_id
    where sv.id = s and public.is_business_member(br.business_id)
  );
$$;

-- read only; no insert/update policies on purpose
create policy "customer reads own tokens" on public.tokens
  for select to authenticated using (customer_id = auth.uid());
create policy "members read service tokens" on public.tokens
  for select to authenticated using (public.is_service_member(service_id));

-- customers only: staff/owners can't join their own business queue
create or replace function public.join_queue(p_service uuid)
returns public.tokens language plpgsql security definer set search_path = public as $$
declare
  t public.tokens;
  n int;
  today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from services where id = p_service and is_open) then
    raise exception 'service is closed or not found';
  end if;
  if public.is_service_member(p_service) then
    raise exception 'staff and owners cannot join their own business queue';
  end if;
  if exists (select 1 from tokens where service_id = p_service
             and customer_id = auth.uid()
             and status in ('waiting','called','serving')) then
    raise exception 'you are already in this queue';
  end if;
  -- advisory lock stops two people getting the same token number
  perform pg_advisory_xact_lock(hashtext(p_service::text));
  select coalesce(max(token_number), 0) + 1 into n
    from tokens where service_id = p_service and queue_date = today;
  insert into tokens (service_id, customer_id, queue_date, token_number)
    values (p_service, auth.uid(), today, n) returning * into t;
  return t;
end; $$;

create or replace function public.cancel_token(p_token uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update tokens set status = 'cancelled', completed_at = now()
    where id = p_token and customer_id = auth.uid() and status in ('waiting','called');
  if not found then raise exception 'token not found or cannot be cancelled'; end if;
end; $$;

create or replace function public.call_next(p_service uuid)
returns public.tokens language plpgsql security definer set search_path = public as $$
declare
  t public.tokens;
  today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if not public.is_service_member(p_service) then raise exception 'not allowed'; end if;
  perform pg_advisory_xact_lock(hashtext(p_service::text));
  select * into t from tokens
    where service_id = p_service and queue_date = today and status = 'waiting'
    order by token_number limit 1 for update;
  if not found then raise exception 'no one is waiting'; end if;
  update tokens set status = 'called', called_at = now() where id = t.id returning * into t;
  return t;
end; $$;

-- called -> serving/done/skipped, serving -> done
create or replace function public.set_token_status(p_token uuid, p_status text)
returns public.tokens language plpgsql security definer set search_path = public as $$
declare t public.tokens;
begin
  select * into t from tokens where id = p_token for update;
  if not found then raise exception 'token not found'; end if;
  if not public.is_service_member(t.service_id) then raise exception 'not allowed'; end if;
  if not ((t.status = 'called' and p_status in ('serving','done','skipped'))
       or (t.status = 'serving' and p_status = 'done')) then
    raise exception 'invalid transition % -> %', t.status, p_status;
  end if;
  update tokens set status = p_status,
    completed_at = case when p_status in ('done','skipped') then now() else completed_at end
    where id = p_token returning * into t;
  return t;
end; $$;

create or replace function public.token_info(p_token uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare t public.tokens; ahead int; mins int;
begin
  select * into t from tokens where id = p_token;
  if not found or not (t.customer_id = auth.uid() or public.is_service_member(t.service_id)) then
    raise exception 'token not found';
  end if;
  select avg_service_minutes into mins from services where id = t.service_id;
  select count(*) into ahead from tokens
    where service_id = t.service_id and queue_date = t.queue_date
      and status in ('waiting','called','serving') and token_number < t.token_number;
  return json_build_object(
    'id', t.id,
    'service_id', t.service_id,
    'token_number', t.token_number,
    'status', t.status,
    'people_ahead', case when t.status = 'waiting' then ahead else 0 end,
    'estimated_wait_minutes', case when t.status = 'waiting' then ahead * mins else 0 end
  );
end; $$;

create or replace function public.queue_summary(p_service uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'is_open', (select is_open from services where id = p_service),
    'waiting', (select count(*) from tokens
                where service_id = p_service
                  and queue_date = (now() at time zone 'Asia/Kolkata')::date
                  and status = 'waiting'),
    'now_serving', (select max(token_number) from tokens
                    where service_id = p_service
                      and queue_date = (now() at time zone 'Asia/Kolkata')::date
                      and status in ('called','serving'))
  );
$$;