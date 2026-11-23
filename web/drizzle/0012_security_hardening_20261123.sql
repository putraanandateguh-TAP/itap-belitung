-- 0012_security_hardening_20261123.sql — audit RLS 23 Nov 2026 (pola CVE-2025-48757).
-- Sudah diterapkan ke produksi lewat Supabase MCP (migrasi security_hardening_20261123).
-- Idempoten: aman dijalankan ulang oleh scripts/migrate.ts.
-- Catatan: view listings_public SENGAJA tetap security_invoker=false (desain SEC-09, lihat 0011).

-- 1) Kunci search_path fungsi trigger.
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.listing_status_guard() set search_path = public, pg_temp;
alter function public.message_sender_guard() set search_path = public, pg_temp;
alter function public.listings_counters_guard() set search_path = public, pg_temp;
alter function public.profiles_insert_role_guard() set search_path = public, pg_temp;
alter function public.profiles_role_guard() set search_path = public, pg_temp;
alter function public.profiles_sensitive_columns_guard() set search_path = public, pg_temp;
alter function public.contributor_profile_guard() set search_path = public, pg_temp;
alter function public.thread_listing_active_guard() set search_path = public, pg_temp;

-- 2) Cabut TRUNCATE/REFERENCES/TRIGGER/MAINTAIN dari anon & authenticated (tidak dibatasi RLS),
--    termasuk untuk tabel baru yang dibuat role postgres.
revoke truncate, references, trigger, maintain on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger, maintain on tables from anon, authenticated;

-- 3) Storage: bucket publik tetap dibuka lewat URL publik, tapi isinya tidak bisa di-list.
drop policy if exists "public read article-images" on storage.objects;
drop policy if exists "public read listing-photos" on storage.objects;
drop policy if exists "owner read own article-images" on storage.objects;
drop policy if exists "owner read own listing-photos" on storage.objects;
create policy "owner read own article-images" on storage.objects for select to authenticated
  using (bucket_id = 'article-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "owner read own listing-photos" on storage.objects for select to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
