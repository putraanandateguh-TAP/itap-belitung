-- Security hardening 2026-11-23 (audit CVE-2025-48757 / RLS). Tidak menghapus data/tabel.
-- 1) View listings_public: jalankan dengan hak pemanggil (patuh RLS), bukan hak pembuat.
alter view public.listings_public set (security_invoker = true);

-- 2) Kunci search_path fungsi trigger (cegah pembajakan search_path).
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.listing_status_guard() set search_path = public, pg_temp;
alter function public.message_sender_guard() set search_path = public, pg_temp;
alter function public.listings_counters_guard() set search_path = public, pg_temp;
alter function public.profiles_insert_role_guard() set search_path = public, pg_temp;
alter function public.profiles_role_guard() set search_path = public, pg_temp;
alter function public.profiles_sensitive_columns_guard() set search_path = public, pg_temp;
alter function public.contributor_profile_guard() set search_path = public, pg_temp;
alter function public.thread_listing_active_guard() set search_path = public, pg_temp;

-- 3) Cabut hak berlebih anon/authenticated yang tidak dibatasi RLS (TRUNCATE dll).
revoke truncate, references, trigger, maintain on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger, maintain on tables from anon, authenticated;

-- 4) Storage: bucket publik tetap bisa dibuka lewat URL publik, tapi isi bucket
--    tidak bisa lagi di-list oleh siapa pun. Pemilik folder tetap bisa lihat/kelola filenya.
drop policy if exists "public read article-images" on storage.objects;
drop policy if exists "public read listing-photos" on storage.objects;
create policy "owner read own article-images" on storage.objects for select to authenticated
  using (bucket_id = 'article-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "owner read own listing-photos" on storage.objects for select to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
