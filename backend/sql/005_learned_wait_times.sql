-- 005: learned wait times (median of last 20 visits, blended with owner's estimate)

alter table public.tokens add column if not exists started_at timestamptz;

alter table public.services
  add column if not exists learned_minutes numeric(6,2),
  add column if not exists sample_count int not null default 0;

-- shrinkage: trust real data more as samples grow (full weight at 10+ visits)
create or replace function public.effective_minutes(base int, learned numeric, n int)
returns numeric language sql immutable as $$
  select case
    when coalesce(n, 0) = 0 or learned is null then base::numeric
    else least(n / 10.0, 1) * learned + (1 - least(n / 10.0, 1)) * base
  end;
$$;

-- ignores <9 sec accidental clicks and >4h outliers
create or replace function public.recompute_service_stats(p_service uuid)
returns void language plpgsql security definer set search_path = public as $$
declare med numeric; n int;
begin
  with recent as (
    select extract(epoch from (completed_at - coalesce(started_at, called_at))) / 60.0 as mins
    from tokens
    where service_id = p_service
      and status = 'done'
      and completed_at is not null
      and coalesce(started_at, called_at) is not null
      and completed_at > now() - interval '30 days'
    order by completed_at desc
    limit 20
  ), valid as (
    select mins from recent where mins >= 0.15 and mins <= 240
  )
  select percentile_cont(0.5) within group (order by mins), count(*)
    into med, n from valid;

  update services
    set learned_minutes = round(med, 2), sample_count = coalesce(n, 0)
    where id = p_service;
end; $$;

revoke execute on function public.recompute_service_stats(uuid) from public, anon, authenticated;

-- now records when service starts and relearns when a visit finishes
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
    started_at = case when p_status = 'serving' then now() else started_at end,
    completed_at = case when p_status in ('done','skipped') then now() else completed_at end
    where id = p_token returning * into t;
  if p_status = 'done' then perform public.recompute_service_stats(t.service_id); end if;
  return t;
end; $$;

create or replace function public.token_info(p_token uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  t public.tokens; ahead int;
  base int; learned numeric; n int; eff numeric;
begin
  select * into t from tokens where id = p_token;
  if not found or not (t.customer_id = auth.uid() or public.is_service_member(t.service_id)) then
    raise exception 'token not found';
  end if;
  select avg_service_minutes, learned_minutes, sample_count into base, learned, n
    from services where id = t.service_id;
  eff := public.effective_minutes(base, learned, n);
  select count(*) into ahead from tokens
    where service_id = t.service_id and queue_date = t.queue_date
      and status in ('waiting','called','serving') and token_number < t.token_number;
  return json_build_object(
    'id', t.id,
    'service_id', t.service_id,
    'token_number', t.token_number,
    'status', t.status,
    'people_ahead', case when t.status = 'waiting' then ahead else 0 end,
    'estimated_wait_minutes', case when t.status = 'waiting' then ceil(ahead * eff) else 0 end,
    'minutes_per_person', round(eff, 1),
    'samples', coalesce(n, 0),
    'confidence', case when coalesce(n, 0) = 0 then 'owner' when n < 10 then 'learning' else 'learned' end
  );
end; $$;