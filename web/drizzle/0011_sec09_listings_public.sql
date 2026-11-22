-- ============================================================
-- 0011_sec09_listings_public.sql — SEC-09: sembunyikan koordinat
-- persis penjual dari anon (audit RLS 2026-11-22, pola CVE-2025-48757).
--
-- Masalah: policy listings_select mengizinkan anon membaca SELURUH kolom
-- listing aktif, termasuk location_lat/location_lng persis + seller_id.
-- Aplikasi web sendiri sudah mem-masking (lib/marketplace.ts: toListing
-- full=false — tanpa koordinat/deskripsi/seller_id/kontak untuk anon),
-- tetapi siapa pun yang memegang anon key bisa melewati aplikasi dan
-- membaca tabel langsung lewat PostgREST (F12 -> query).
--
-- Perbaikan (Opsi 1 audit): view publik + cabut SELECT anon dari tabel.
-- Kolom view = PERSIS permukaan publik aplikasi (toListing full=false):
-- tanpa location_lat/lng, tanpa seller_id, tanpa description, tanpa kontak.
-- (SQL contoh di laporan audit menyertakan seller_id/description — sengaja
-- TIDAK diikutkan di sini agar view tidak melonggarkan masking aplikasi.)
-- UI publik TIDAK butuh koordinat dibulatkan: tidak ada pin peta publik —
-- hanya teks location_name; tautan Google Maps hanya tampil untuk
-- pemilik/pembeli terverifikasi/admin (data penuh server-side, tidak berubah).
--
-- Catatan keamanan view (Postgres):
-- - View dibuat dengan security_invoker = false (default): query ke view
--   jalan dengan hak pemilik view (postgres) sehingga tetap bisa dibaca
--   anon SETELAH SELECT pada tabel dicabut. Satu-satunya filter adalah
--   WHERE status='aktif' + daftar kolom tetap di bawah — JANGAN tambah
--   kolom sensitif ke view ini.
-- - RLS tetap aktif di tabel listings; grant SELECT untuk authenticated
--   TIDAK dicabut (pemilik/admin yang memakai Supabase client tetap bisa
--   membaca barisnya sendiri — policy yang membatasi; koordinat persis
--   untuk pemilik/pembeli terverifikasi/admin tetap lewat server-side
--   Drizzle, tidak berubah).
-- - Idempotent: CREATE OR REPLACE + REVOKE/GRANT aman diulang.
-- - Jalankan di Supabase SQL Editor (atau `npm run db:migrate`) SETELAH
--   0010. TIDAK menyentuh data; hanya definisi view + hak akses.
-- - Uji: web/tests/security-chain.pglite.mjs (offline) +
--   web/tests/rls-check.ts (live, butuh 2 akun uji).
-- ============================================================

-- 1. View publik: listing AKTIF, kolom publik saja.
create or replace view public.listings_public
  with (security_invoker = false) as
select
  id,
  title,
  price_cents,
  currency,
  location_name,
  category,
  status,
  views,
  saves_count,
  likes_count,
  created_at
from public.listings
where status = 'aktif';

-- 2. Cabut akses anon langsung ke tabel, beri ke view.
revoke select on public.listings from anon;
grant select on public.listings_public to anon;
grant select on public.listings_public to authenticated;

-- 3. Muat ulang cache skema PostgREST agar /rest/v1/listings_public
--    langsung muncul (no-op bila dijalankan di luar Supabase).
notify pgrst, 'reload schema';
