-- 0004_listing_category.sql — M3: kolom kategori di listings.
-- Jalankan di Supabase SQL Editor (proyek BARU, P1) SETELAH 0003.
-- Catatan: replica/schema.sql SUDAH memuat kolom ini (disinkronkan
-- koordinator 2026-11-18); migrasi ini idempotent (if not exists) dan
-- tetap diperlukan untuk DB yang sudah menjalankan 0001–0003.
alter table public.listings
  add column if not exists category text not null default 'lainnya';

create index if not exists listings_category_created
  on public.listings (category, created_at desc);
