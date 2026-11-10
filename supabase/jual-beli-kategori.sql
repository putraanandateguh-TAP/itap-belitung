-- Jual Beli iTAP: 11 kategori iklan (+ Lowongan sebagai tautan ke Loker, bukan kategori iklan).
-- Idempoten. Kategori lama ('elektronik','kendaraan','rumah','jasa','lainnya') tetap sah supaya iklan lama aman.
alter table public.listings drop constraint if exists listings_category_check;
alter table public.listings add constraint listings_category_check check (category in (
  'kuliner', 'hasil-laut', 'kerajinan', 'pertanian', 'properti', 'kendaraan', 'elektronik',
  'sewa', 'jasa', 'rumah-tangga', 'lainnya',
  'rumah' -- kategori lama
));
