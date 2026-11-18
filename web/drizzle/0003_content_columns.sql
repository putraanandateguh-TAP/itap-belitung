-- 0003_content_columns.sql — kolom yang dibutuhkan UI seed tapi belum ada
-- di schema.sql (ditemukan saat replica-backend memetakan seed -> DB):
--   articles.source_url + articles.external (artikel agregasi berita.json
--     punya tautan sumber asli; S05 menampilkan tombol "Baca di sumber asli")
--   daily_prices.unit (seed punya satuan, mis. "kg", "liter")
--   market_rates.details (rincian kurs BCA buy/sell erate/tt/bn + IHSG
--     change/percent — satu kolom `value` tidak cukup)
-- Jalankan SETELAH 0001_init.sql, di proyek Supabase baru (P1).
alter table public.articles add column if not exists source_url text;
alter table public.articles add column if not exists external boolean not null default false;
alter table public.daily_prices add column if not exists unit text;
alter table public.market_rates add column if not exists details jsonb;
