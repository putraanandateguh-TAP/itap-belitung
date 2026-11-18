-- 0009_whatsapp_otps.sql — tabel OTP WhatsApp (SEC-06, audit 2026-11-18).
-- Dibuat SEBELUM env P2 (akun Meta WhatsApp Business + template OTP) diisi,
-- sesuai urutan aman SEC-06: skema + pengamanan dulu, aktivasi belakangan.
-- Selama P2 belum ada, Edge Function whatsapp-otp tetap 503 (fail-closed);
-- tabel ini hanya dipakai setelah env Meta diisi + fungsi di-deploy.
--
-- Desain keamanan:
-- - Hanya HASH OTP (SHA-256) yang disimpan — kode asli tidak pernah
--   tersimpan di database. Hash dibuat server-side di Edge Function.
-- - RLS AKTIF dan TIDAK ADA policy untuk anon/authenticated (deny-by-default):
--   hanya service_role yang boleh baca/tulis (Edge Function + route verify
--   server-side). GRANT ALL eksplisit ke service_role; REVOKE dari yang lain.
-- - expires_at 5 menit; attempts dihitung route verify (maks 5 salah lalu
--   baris dihanguskan/dihapus); verified_at menandai kode sudah dipakai
--   (single-use — lookup verify hanya memakai verified_at IS NULL).
-- Jalankan di Supabase SQL Editor (proyek BARU) SETELAH 0008.
-- Penomoran terkoordinasi dengan 0007 (lisensi server-side) dan 0008
-- (security fixes) di worktree yang sama.

create table if not exists public.whatsapp_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  phone_e164 text not null, -- format E.164, mis. +6285141121283
  code_hash text not null, -- SHA-256 hex dari kode 6 digit (bukan kodenya)
  expires_at timestamptz not null,
  attempts int not null default 0,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.whatsapp_otps enable row level security;

-- Deny-by-default: tidak ada policy untuk anon/authenticated sama sekali.
-- Hanya service_role (bypass RLS) yang menyentuh tabel ini.
revoke all on public.whatsapp_otps from public, anon, authenticated;
grant all on public.whatsapp_otps to service_role;

create index if not exists whatsapp_otps_user_created_idx
  on public.whatsapp_otps (user_id, created_at);
create index if not exists whatsapp_otps_phone_created_idx
  on public.whatsapp_otps (phone_e164, created_at);
