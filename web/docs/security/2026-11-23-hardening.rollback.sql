-- Rollback (hanya bila ada fitur rusak). Mengembalikan keadaan sebelum 2026-11-23.
alter view public.listings_public set (security_invoker = false);
-- fungsi: kembalikan search_path default
alter function public.set_updated_at() reset search_path;
alter function public.listing_status_guard() reset search_path;
alter function public.message_sender_guard() reset search_path;
alter function public.listings_counters_guard() reset search_path;
alter function public.profiles_insert_role_guard() reset search_path;
alter function public.profiles_role_guard() reset search_path;
alter function public.profiles_sensitive_columns_guard() reset search_path;
alter function public.contributor_profile_guard() reset search_path;
alter function public.thread_listing_active_guard() reset search_path;
grant truncate, references, trigger, maintain on all tables in schema public to anon, authenticated;
alter default privileges for role postgres in schema public grant truncate, references, trigger, maintain on tables to anon, authenticated;
drop policy if exists "owner read own article-images" on storage.objects;
drop policy if exists "owner read own listing-photos" on storage.objects;
create policy "public read article-images" on storage.objects for select to anon, authenticated using (bucket_id = 'article-images');
create policy "public read listing-photos" on storage.objects for select to anon, authenticated using (bucket_id = 'listing-photos');
