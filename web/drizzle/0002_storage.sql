-- 0002_storage.sql — bucket Supabase Storage.
-- Jalankan di Supabase SQL Editor (proyek BARU, P1) SETELAH 0001_init.sql.
-- Catatan: storage.* hanya ada di Supabase, bukan di Postgres biasa / PGlite.
-- RLS storage: public read; upload hanya authenticated dan hanya ke folder
-- miliknya sendiri (<user_id>/...). Kompresi + buang EXIF di client (F05).
insert into storage.buckets (id, name, public)
values ('article-images', 'article-images', true),
       ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

-- Kebijakan storage (idempotent: hapus dulu bila sudah ada).
drop policy if exists "public read article-images" on storage.objects;
create policy "public read article-images" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'article-images');

drop policy if exists "author upload article-images" on storage.objects;
create policy "author upload article-images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'article-images'
    and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "author manage own article-images" on storage.objects;
create policy "author manage own article-images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'article-images'
    and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "public read listing-photos" on storage.objects;
create policy "public read listing-photos" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'listing-photos');

drop policy if exists "seller upload listing-photos" on storage.objects;
create policy "seller upload listing-photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "seller manage own listing-photos" on storage.objects;
create policy "seller manage own listing-photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text);
