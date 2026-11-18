-- 0005_grants.sql — hak dasar (GRANT) agar RLS bisa dievaluasi.
-- Tanpa GRANT ini, PostgREST mengembalikan 401 'permission denied' untuk anon
-- meski policy RLS sudah ada (ditemukan lewat uji nyata 2026-11-18).
-- RLS tetap menjadi pengaman sebenarnya: GRANT hanya membuka pintu,
-- policy yang menentukan baris mana yang boleh dibaca/ditulis.
-- Dibangkitkan dari policy 0001_init.sql (58 policy, 28 tabel).
-- Jalankan di Supabase SQL Editor (proyek BARU) SETELAH 0004.

grant usage on schema public to anon, authenticated;

grant SELECT on public.ai_conversations to authenticated;
grant INSERT on public.ai_conversations to authenticated;
grant UPDATE on public.ai_conversations to authenticated;
grant DELETE on public.ai_conversations to authenticated;

grant SELECT on public.ai_feedback to authenticated;
grant INSERT on public.ai_feedback to authenticated;
grant UPDATE on public.ai_feedback to authenticated;
grant DELETE on public.ai_feedback to authenticated;

grant SELECT on public.article_revisions to authenticated;
grant INSERT on public.article_revisions to authenticated;

grant SELECT on public.articles to anon;
grant SELECT on public.articles to authenticated;
grant INSERT on public.articles to authenticated;
grant UPDATE on public.articles to authenticated;

grant SELECT on public.blocks to authenticated;
grant INSERT on public.blocks to authenticated;
grant UPDATE on public.blocks to authenticated;
grant DELETE on public.blocks to authenticated;

grant SELECT on public.bookmarks to authenticated;
grant INSERT on public.bookmarks to authenticated;
grant UPDATE on public.bookmarks to authenticated;
grant DELETE on public.bookmarks to authenticated;

grant SELECT on public.categories to anon;
grant SELECT on public.categories to authenticated;
grant INSERT on public.categories to authenticated;
grant UPDATE on public.categories to authenticated;
grant DELETE on public.categories to authenticated;

grant SELECT on public.chat_threads to authenticated;
grant INSERT on public.chat_threads to authenticated;

grant SELECT on public.comments to anon;
grant SELECT on public.comments to authenticated;
grant INSERT on public.comments to authenticated;
grant UPDATE on public.comments to authenticated;

grant SELECT on public.contribution_points to authenticated;

grant SELECT on public.contributor_profiles to authenticated;
grant INSERT on public.contributor_profiles to authenticated;
grant UPDATE on public.contributor_profiles to authenticated;

grant SELECT on public.culture_stories to anon;
grant SELECT on public.culture_stories to authenticated;
grant INSERT on public.culture_stories to authenticated;
grant UPDATE on public.culture_stories to authenticated;
grant DELETE on public.culture_stories to authenticated;

grant SELECT on public.daily_info_snapshots to anon;
grant SELECT on public.daily_info_snapshots to authenticated;

grant SELECT on public.daily_prices to anon;
grant SELECT on public.daily_prices to authenticated;
grant INSERT on public.daily_prices to authenticated;
grant UPDATE on public.daily_prices to authenticated;
grant DELETE on public.daily_prices to authenticated;

grant SELECT on public.devices to authenticated;
grant INSERT on public.devices to authenticated;
grant UPDATE on public.devices to authenticated;
grant DELETE on public.devices to authenticated;

grant SELECT on public.digital_products to anon;
grant SELECT on public.digital_products to authenticated;
grant INSERT on public.digital_products to authenticated;
grant UPDATE on public.digital_products to authenticated;
grant DELETE on public.digital_products to authenticated;

grant SELECT on public.info_submissions to authenticated;
grant INSERT on public.info_submissions to authenticated;
grant UPDATE on public.info_submissions to authenticated;

grant SELECT on public.itineraries to authenticated;
grant INSERT on public.itineraries to authenticated;
grant UPDATE on public.itineraries to authenticated;
grant DELETE on public.itineraries to authenticated;

grant SELECT on public.job_listings to anon;
grant SELECT on public.job_listings to authenticated;
grant INSERT on public.job_listings to authenticated;
grant UPDATE on public.job_listings to authenticated;
grant DELETE on public.job_listings to authenticated;

grant SELECT on public.kedai_menu_items to anon;
grant SELECT on public.kedai_menu_items to authenticated;
grant INSERT on public.kedai_menu_items to authenticated;
grant UPDATE on public.kedai_menu_items to authenticated;
grant DELETE on public.kedai_menu_items to authenticated;

grant SELECT on public.listing_photos to anon;
grant SELECT on public.listing_photos to authenticated;
grant INSERT on public.listing_photos to authenticated;
grant UPDATE on public.listing_photos to authenticated;
grant DELETE on public.listing_photos to authenticated;

grant SELECT on public.listings to anon;
grant SELECT on public.listings to authenticated;
grant INSERT on public.listings to authenticated;
grant UPDATE on public.listings to authenticated;

grant SELECT on public.market_rates to anon;
grant SELECT on public.market_rates to authenticated;
grant INSERT on public.market_rates to authenticated;
grant UPDATE on public.market_rates to authenticated;
grant DELETE on public.market_rates to authenticated;

grant SELECT on public.messages to authenticated;
grant INSERT on public.messages to authenticated;

grant SELECT on public.moderation_words to authenticated;
grant INSERT on public.moderation_words to authenticated;
grant UPDATE on public.moderation_words to authenticated;
grant DELETE on public.moderation_words to authenticated;

grant SELECT on public.profiles to authenticated;
grant INSERT on public.profiles to authenticated;
grant UPDATE on public.profiles to authenticated;

grant SELECT on public.reports to authenticated;
grant INSERT on public.reports to authenticated;
grant UPDATE on public.reports to authenticated;

grant SELECT on public.services to anon;
grant SELECT on public.services to authenticated;
grant INSERT on public.services to authenticated;
grant UPDATE on public.services to authenticated;
grant DELETE on public.services to authenticated;

-- Sequence untuk insert (id identity/serial bila ada).
grant usage, select on all sequences in schema public to authenticated;

