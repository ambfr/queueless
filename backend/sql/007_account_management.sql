-- 007: delete business / delete account (with role cleanup)

create or replace function public.delete_business(p_business uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from businesses where id = p_business and owner_id = auth.uid()) then
    raise exception 'not the owner';
  end if;
  delete from businesses where id = p_business;

  perform set_config('app.allow_role_change', 'on', true);
  update profiles set role = 'customer'
    where role = 'staff'
      and not exists (select 1 from business_staff s where s.user_id = profiles.id);
  update profiles set role = 'customer'
    where id = auth.uid() and role = 'business_owner'
      and not exists (select 1 from businesses where owner_id = auth.uid());
end; $$;

create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from businesses where owner_id = auth.uid()) then
    raise exception 'Delete your businesses first, then you can delete your account.';
  end if;
  delete from auth.users where id = auth.uid();
end; $$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;