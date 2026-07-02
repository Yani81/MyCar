-- Bucket за снимки на касови бележки.
-- Изпълни еднократно в Supabase Dashboard → SQL Editor.
-- Без bucket приложението работи както досега (снимките остават base64 в записа).

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

-- Качване само в собствената папка ({user_id}/...)
create policy "receipts insert own"
on storage.objects for insert to authenticated
with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

-- Публично четене (bucket-ът е public, но policy-то е нужно за API достъп)
create policy "receipts read"
on storage.objects for select to public
using (bucket_id = 'receipts');

-- Изтриване само на собствени файлове (при махане на снимка/запис от приложението)
create policy "receipts delete own"
on storage.objects for delete to authenticated
using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
