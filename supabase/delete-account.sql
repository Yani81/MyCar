-- Изтриване на собствения акаунт от приложението (бутон „Изтрий акаунта").
-- Изпълни еднократно в Supabase Dashboard → SQL Editor.
-- Клиентът няма право да трие auth.users директно, затова функцията е security definer
-- и работи само за извикващия я потребител (auth.uid()).

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.user_data where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;
