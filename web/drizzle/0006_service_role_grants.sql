-- 0006_service_role_grants.sql — hak untuk service_role (kunci server).
-- Temuan uji nyata 2026-11-18: service_role kena 403 'permission denied'
-- saat membaca public.profiles lewat PostgREST — service_role memang
-- melewati RLS, tapi tetap butuh GRANT tabel seperti peran lain.
-- Tanpa ini, Edge Function (mis. delete-account) yang memakai service_role
-- gagal menghapus/membaca data. Kunci service_role TIDAK PERNAH dipakai
-- di frontend — hanya server/Edge Function.
-- Jalankan di Supabase SQL Editor (proyek BARU) SETELAH 0005.

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
