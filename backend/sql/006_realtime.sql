-- 006: public queue_state table kept in sync by a trigger, streamed via Realtime
-- (customers can't read other people's tokens, so they watch this instead)

create table public.queue_state (
  service_id uuid primary key references public.services(id) on delete cascade,
  waiting int not null default 0,
  now_serving int,
  updated_at timestamptz not null default now()
);

alter table public.queue_state enable row level security;
create policy "read queue state" on public.queue_state
  for select to authenticated using (true);

create or replace function public.sync_queue_state()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  sid uuid := coalesce(new.service_id, old.service_id);
  today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  -- skip when the whole service is being cascade-deleted
  if not exists (select 1 from services where id = sid) then return null; end if;
  insert into queue_state (service_id, waiting, now_serving, updated_at)
  values (
    sid,
    (select count(*) from tokens where service_id = sid and queue_date = today and status = 'waiting'),
    (select max(token_number) from tokens where service_id = sid and queue_date = today and status in ('called','serving')),
    now()
  )
  on conflict (service_id) do update
    set waiting = excluded.waiting,
        now_serving = excluded.now_serving,
        updated_at = now();
  return null;
end; $$;

create trigger tokens_sync_queue_state
  after insert or update or delete on public.tokens
  for each row execute function public.sync_queue_state();

insert into public.queue_state (service_id)
select id from public.services on conflict do nothing;

alter publication supabase_realtime add table public.tokens, public.queue_state;