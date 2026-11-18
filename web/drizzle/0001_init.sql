-- ============================================================
-- iTAP Belitung — schema.sql (migrasi pertama)
-- Next.js + Expo + Supabase Postgres
-- Sumber: replica/recon.md + replica/architecture.md
-- Cara pakai: jalankan di Supabase SQL Editor (proyek BARU — lihat
-- architecture.md §0 prasyarat P1) atau sebagai migrasi Drizzle.
-- Semua waktu timestamptz UTC; tampilkan WIB (Asia/Jakarta) di client.
-- Uang: integer sen + currency (IDR).
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------- enums ----------
create type user_role as enum ('reader', 'contributor', 'admin_portal', 'superadmin');
create type article_channel as enum ('berita', 'kuliner', 'wisata', 'sejarah', 'budaya', 'legenda');
create type article_status as enum ('draft', 'review', 'published', 'unpublished', 'returned');
create type comment_status as enum ('pending', 'approved', 'rejected');
create type listing_status as enum ('aktif', 'terjual', 'dinonaktifkan', 'dihapus');
create type bookmark_type as enum ('save', 'like');
create type report_target as enum ('listing', 'account', 'comment');
create type report_status as enum ('open', 'reviewed', 'hidden', 'dismissed');
create type moderation_action as enum ('sensor', 'hold');
create type verification_status as enum ('unverified', 'pending', 'verified');
create type contribution_source as enum ('article', 'info');
create type info_status as enum ('pending', 'approved', 'rejected');
create type culture_category as enum ('upacara', 'tari_musik', 'lagu', 'kuliner_tradisi', 'cerita_rakyat', 'bahasa', 'sejarah_timah');
create type job_status as enum ('open', 'closed');
create type market_kind as enum ('kurs', 'ihsg', 'emas');

-- ---------- helpers ----------
-- NOTE: current_user_role() didefinisikan SETELAH tabel profiles (di bawah),
-- karena badan fungsi SQL divalidasi saat CREATE FUNCTION — bila didefinisikan
-- sebelum tabelnya ada, migrasi gagal ("relation public.profiles does not
-- exist"). Ditemukan saat validasi lokal 2026-11-18 (replica/backend.md).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- 1. profiles ----------
-- Satu baris per akun; id = auth.users.id. Kredensial (password/hash)
-- dimiliki Supabase Auth, TIDAK disimpan di sini.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role user_role not null default 'reader',
  whatsapp_number text,
  whatsapp_verified_at timestamptz,
  language_pref text not null default 'id' check (language_pref in ('id', 'en')),
  location_name text,
  location_lat double precision,
  location_lng double precision,
  institution text,
  address text,
  marketplace_rules_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- SECURITY DEFINER agar policy RLS bisa membaca role tanpa rekursi.
-- Didefinisikan di sini (setelah tabel profiles) — lihat catatan di § helpers.
create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid();
$$;

-- ---------- 2. categories ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  channel article_channel not null,
  name_id text not null,
  name_en text,
  slug text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_per_channel unique (channel, slug)
);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create index on public.categories (channel, sort_order);

-- ---------- 3. articles ----------
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  channel article_channel not null,
  slug text not null,
  title_id text not null,
  title_en text,
  body_id text not null,
  body_en text,
  gallery jsonb not null default '[]',
  location_name text,
  location_lat double precision,
  location_lng double precision,
  source text,
  status article_status not null default 'draft',
  published_at timestamptz,
  views integer not null default 0 check (views >= 0),
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(title_id, '') || ' ' || coalesce(title_en, '') || ' ' || coalesce(body_id, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_slug_per_channel unique (channel, slug)
);
create trigger articles_updated_at before update on public.articles
  for each row execute function public.set_updated_at();
create index on public.articles (channel, status, published_at desc);
create index on public.articles (author_id, status);
create index on public.articles using gin (search_vector);
create index on public.articles using gin (title_id gin_trgm_ops);

-- ---------- 4. article_revisions ----------
create table public.article_revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  editor_id uuid references public.profiles (id) on delete set null,
  changes jsonb not null default '{}',
  note text,
  created_at timestamptz not null default now()
);
create index on public.article_revisions (article_id, created_at desc);

-- ---------- 5. comments ----------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  text text not null,
  status comment_status not null default 'pending',
  sentiment_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger comments_updated_at before update on public.comments
  for each row execute function public.set_updated_at();
create index on public.comments (article_id, status, created_at desc);

-- ---------- 6. culture_stories ----------
create table public.culture_stories (
  id uuid primary key default gen_random_uuid(),
  category culture_category not null,
  title text not null,
  body text not null,
  lyrics text,
  sources jsonb not null default '[]',
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger culture_stories_updated_at before update on public.culture_stories
  for each row execute function public.set_updated_at();
create index on public.culture_stories (category, created_at desc);

-- ---------- 7. listings (marketplace) ----------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'IDR',
  location_name text,
  location_lat double precision,
  location_lng double precision,
  status listing_status not null default 'aktif',
  last_confirmed_at timestamptz,
  sold_at timestamptz,
  deleted_at timestamptz,
  views integer not null default 0 check (views >= 0),
  saves_count integer not null default 0 check (saves_count >= 0),
  likes_count integer not null default 0 check (likes_count >= 0),
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger listings_updated_at before update on public.listings
  for each row execute function public.set_updated_at();
create index on public.listings (status, created_at desc);
create index on public.listings (seller_id, status);
create index on public.listings using gin (search_vector);

-- ---------- 8. listing_photos ----------
create table public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index on public.listing_photos (listing_id, sort_order);

-- ---------- 9. chat_threads ----------
create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_threads_buyer_ne_seller check (buyer_id <> seller_id),
  constraint chat_threads_one_per_buyer unique (listing_id, buyer_id)
);
create trigger chat_threads_updated_at before update on public.chat_threads
  for each row execute function public.set_updated_at();
create index on public.chat_threads (buyer_id, last_message_at desc);
create index on public.chat_threads (seller_id, last_message_at desc);

-- ---------- 10. messages ----------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  text text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger messages_updated_at before update on public.messages
  for each row execute function public.set_updated_at();
create index on public.messages (thread_id, created_at);

-- ---------- 11. bookmarks ----------
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  type bookmark_type not null,
  created_at timestamptz not null default now(),
  constraint bookmarks_one_per_type unique (user_id, listing_id, type)
);
create index on public.bookmarks (user_id, type, created_at desc);

-- ---------- 12. reports ----------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type report_target not null,
  target_id uuid not null,
  reason text not null,
  status report_status not null default 'open',
  moderator_id uuid references public.profiles (id) on delete set null,
  moderator_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();
create index on public.reports (status, created_at desc);
create index on public.reports (target_type, target_id);

-- ---------- 13. blocks ----------
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blocks_no_self check (blocker_id <> blocked_id),
  constraint blocks_one_pair unique (blocker_id, blocked_id)
);

-- ---------- 14. moderation_words ----------
create table public.moderation_words (
  id uuid primary key default gen_random_uuid(),
  word text not null unique,
  action moderation_action not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- 15. contributor_profiles ----------
create table public.contributor_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  institution text,
  address text,
  verification_status verification_status not null default 'unverified',
  auto_approve boolean not null default false,
  points_total integer not null default 0 check (points_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger contributor_profiles_updated_at before update on public.contributor_profiles
  for each row execute function public.set_updated_at();

-- ---------- 16. contribution_points ----------
-- 1 poin per karya yang disetujui; unik per (source_type, source_id).
create table public.contribution_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_type contribution_source not null,
  source_id uuid not null,
  points integer not null default 1 check (points > 0),
  awarded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint contribution_points_one_per_source unique (source_type, source_id)
);
create index on public.contribution_points (user_id, awarded_at desc);

-- ---------- 17. info_submissions ----------
create table public.info_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  text text not null,
  status info_status not null default 'pending',
  curated_for_ai boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger info_submissions_updated_at before update on public.info_submissions
  for each row execute function public.set_updated_at();
create index on public.info_submissions (status, created_at desc);

-- ---------- 18. devices (token FCM) ----------
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  fcm_token text not null,
  platform text not null check (platform in ('android', 'ios', 'web')),
  language text not null default 'id',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint devices_one_token_per_user unique (user_id, fcm_token)
);
create trigger devices_updated_at before update on public.devices
  for each row execute function public.set_updated_at();

-- ---------- 19. itineraries (rencana perjalanan AI, tersimpan) ----------
create table public.itineraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  days jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger itineraries_updated_at before update on public.itineraries
  for each row execute function public.set_updated_at();
create index on public.itineraries (user_id, created_at desc);

-- ---------- 20. ai_conversations ----------
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  messages jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger ai_conversations_updated_at before update on public.ai_conversations
  for each row execute function public.set_updated_at();
create index on public.ai_conversations (user_id, updated_at desc);

-- ---------- 21. ai_feedback ----------
create table public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid references public.ai_conversations (id) on delete set null,
  vote integer not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  constraint ai_feedback_one_per_conversation unique (user_id, conversation_id)
);

-- ---------- 22. daily_info_snapshots (cache data publik) ----------
create table public.daily_info_snapshots (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('weather', 'prayer', 'fuel', 'transport', 'earthquake', 'air')),
  scope_key text not null default 'belitung',
  as_of_date date not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint daily_info_one_per_day unique (source, scope_key, as_of_date)
);
create index on public.daily_info_snapshots (source, scope_key, as_of_date desc);

-- ---------- 23. daily_prices (harga pangan harian iTAP) ----------
create table public.daily_prices (
  id uuid primary key default gen_random_uuid(),
  commodity text not null,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'IDR',
  market text,
  price_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_prices_one_per_day unique (commodity, market, price_date)
);
create trigger daily_prices_updated_at before update on public.daily_prices
  for each row execute function public.set_updated_at();
create index on public.daily_prices (price_date desc, commodity);

-- ---------- 24. market_rates (kurs / IHSG / emas) ----------
create table public.market_rates (
  id uuid primary key default gen_random_uuid(),
  kind market_kind not null,
  symbol text not null,
  value numeric not null,
  currency text not null default 'IDR',
  as_of timestamptz not null,
  created_at timestamptz not null default now()
);
create index on public.market_rates (kind, as_of desc);

-- ---------- 25. job_listings (lowongan kerja iTAP) ----------
create table public.job_listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  location text,
  salary_min_cents integer check (salary_min_cents >= 0),
  salary_max_cents integer check (salary_max_cents >= 0),
  currency text not null default 'IDR',
  deadline date,
  source_url text,
  status job_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger job_listings_updated_at before update on public.job_listings
  for each row execute function public.set_updated_at();
create index on public.job_listings (status, created_at desc);

-- ---------- 26. digital_products (katalog saja — tanpa logika lisensi) ----------
create table public.digital_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'IDR',
  file_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger digital_products_updated_at before update on public.digital_products
  for each row execute function public.set_updated_at();

-- ---------- 27. services (jasa iTAP) ----------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  price_from_cents integer check (price_from_cents >= 0),
  currency text not null default 'IDR',
  cta_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();
create index on public.services (active, sort_order);

-- ---------- 28. kedai_menu_items ----------
create table public.kedai_menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'IDR',
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger kedai_menu_items_updated_at before update on public.kedai_menu_items
  for each row execute function public.set_updated_at();
create index on public.kedai_menu_items (available, category);

-- ============================================================
-- HARD CONSTRAINTS (aturan database, bukan UI)
-- ============================================================

-- 1. Listing terjual tidak bisa kembali aktif. Dihapus bisa dipulihkan
--    hanya dalam 14 hari (dipakai API restore).
create or replace function public.listing_status_guard()
returns trigger language plpgsql as $$
begin
  if old.status = 'terjual' and new.status = 'aktif' then
    raise exception 'listing terjual tidak bisa kembali aktif';
  end if;
  if old.status = 'dihapus' and new.status = 'aktif'
     and (old.deleted_at is null or old.deleted_at < now() - interval '14 days') then
    raise exception 'listing terhapus hanya bisa dipulihkan dalam 14 hari';
  end if;
  if new.status = 'terjual' then
    new.sold_at = coalesce(new.sold_at, now());
  end if;
  if new.status = 'dihapus' then
    new.deleted_at = coalesce(new.deleted_at, now());
  end if;
  return new;
end;
$$;
create trigger listings_status_guard before update of status on public.listings
  for each row execute function public.listing_status_guard();

-- 2. Tidak ada thread baru untuk listing yang tidak aktif.
create or replace function public.thread_listing_active_guard()
returns trigger language plpgsql as $$
declare
  st listing_status;
begin
  select status into st from public.listings where id = new.listing_id;
  if st is distinct from 'aktif' then
    raise exception 'thread hanya bisa dibuat untuk listing aktif';
  end if;
  return new;
end;
$$;
create trigger chat_threads_listing_active before insert on public.chat_threads
  for each row execute function public.thread_listing_active_guard();

-- 3. Pengirim pesan harus peserta thread (buyer atau seller).
create or replace function public.message_sender_guard()
returns trigger language plpgsql as $$
declare
  ok boolean;
begin
  select exists (
    select 1 from public.chat_threads t
    where t.id = new.thread_id
      and (t.buyer_id = new.sender_id or t.seller_id = new.sender_id)
  ) into ok;
  if not ok then
    raise exception 'pengirim bukan peserta thread';
  end if;
  return new;
end;
$$;
create trigger messages_sender_guard before insert on public.messages
  for each row execute function public.message_sender_guard();

-- 4. Role profil hanya bisa diubah admin (cegah eskalasi mandiri).
create or replace function public.profiles_role_guard()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role
     and coalesce(public.current_user_role(), 'reader') not in ('admin_portal', 'superadmin') then
    raise exception 'role hanya bisa diubah admin';
  end if;
  return new;
end;
$$;
create trigger profiles_role_guard before update of role on public.profiles
  for each row execute function public.profiles_role_guard();

-- ---------- fungsi atomic (anti-race) ----------
create or replace function public.increment_article_views(p_article_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.articles set views = views + 1 where id = p_article_id;
$$;

create or replace function public.increment_listing_views(p_listing_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.listings set views = views + 1 where id = p_listing_id;
$$;

-- 5. Poin kontribusi: idempotent, 1 poin per karya yang disetujui.
create or replace function public.award_contribution_point(
  p_user_id uuid, p_source_type contribution_source, p_source_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.contribution_points (user_id, source_type, source_id, points)
  values (p_user_id, p_source_type, p_source_id, 1)
  on conflict (source_type, source_id) do nothing;
  if found then
    insert into public.contributor_profiles (user_id, points_total)
    values (p_user_id, 1)
    on conflict (user_id) do update
      set points_total = public.contributor_profiles.points_total + 1,
          updated_at = now();
  end if;
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- Service role (Edge Function / cron) bypass RLS by default dan
-- dipakai untuk job + penghapusan akun (F16).
-- ============================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.articles enable row level security;
alter table public.article_revisions enable row level security;
alter table public.comments enable row level security;
alter table public.culture_stories enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.chat_threads enable row level security;
alter table public.messages enable row level security;
alter table public.bookmarks enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.moderation_words enable row level security;
alter table public.contributor_profiles enable row level security;
alter table public.contribution_points enable row level security;
alter table public.info_submissions enable row level security;
alter table public.devices enable row level security;
alter table public.itineraries enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_feedback enable row level security;
alter table public.daily_info_snapshots enable row level security;
alter table public.daily_prices enable row level security;
alter table public.market_rates enable row level security;
alter table public.job_listings enable row level security;
alter table public.digital_products enable row level security;
alter table public.services enable row level security;
alter table public.kedai_menu_items enable row level security;

-- profiles: baca diri sendiri atau admin; tulis diri sendiri.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.current_user_role() in ('admin_portal', 'superadmin'));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.current_user_role() in ('admin_portal', 'superadmin'));

-- categories: publik baca; tulis admin.
create policy categories_select on public.categories for select to anon, authenticated using (true);
create policy categories_write on public.categories for all to authenticated
  using (public.current_user_role() in ('admin_portal', 'superadmin'));

-- articles: publik baca yang published; penulis baca/tulis draft sendiri
-- (tidak bisa self-publish — WITH CHECK membatasi status baru ke draft/review);
-- admin penuh.
create policy articles_select on public.articles for select to anon, authenticated
  using (status = 'published'
         or author_id = auth.uid()
         or public.current_user_role() in ('admin_portal', 'superadmin'));
create policy articles_insert_author on public.articles for insert to authenticated
  with check (author_id = auth.uid() and status = 'draft');
create policy articles_insert_admin on public.articles for insert to authenticated
  with check (public.current_user_role() in ('admin_portal', 'superadmin'));
create policy articles_update_author on public.articles for update to authenticated
  using (author_id = auth.uid() and status in ('draft', 'returned'))
  with check (author_id = auth.uid() and status in ('draft', 'review'));
create policy articles_update_admin on public.articles for update to authenticated
  using (public.current_user_role() in ('admin_portal', 'superadmin'));

-- article_revisions: pemilik artikel + redaksi.
create policy article_revisions_select on public.article_revisions for select to authenticated
  using (exists (select 1 from public.articles a
                 where a.id = article_revisions.article_id
                   and (a.author_id = auth.uid()
                        or public.current_user_role() in ('admin_portal', 'superadmin')))
         or editor_id = auth.uid());
create policy article_revisions_insert on public.article_revisions for insert to authenticated
  with check (editor_id = auth.uid()
              or public.current_user_role() in ('admin_portal', 'superadmin'));

-- comments: publik baca yang approved; tulis login (masuk pending); admin kelola.
create policy comments_select on public.comments for select to anon, authenticated
  using (status = 'approved'
         or user_id = auth.uid()
         or public.current_user_role() in ('admin_portal', 'superadmin'));
create policy comments_insert on public.comments for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create policy comments_update_admin on public.comments for update to authenticated
  using (public.current_user_role() in ('admin_portal', 'superadmin'));

-- culture_stories: publik baca; tulis admin.
create policy culture_select on public.culture_stories for select to anon, authenticated using (true);
create policy culture_write on public.culture_stories for all to authenticated
  using (public.current_user_role() in ('admin_portal', 'superadmin'));

-- listings: publik baca yang aktif; penjual baca/tulis miliknya; admin penuh.
-- Detail privat (kontak, koordinat) diatur API, bukan RLS kolom.
create policy listings_select on public.listings for select to anon, authenticated
  using (status = 'aktif'
         or seller_id = auth.uid()
         or public.current_user_role() in ('admin_portal', 'superadmin'));
create policy listings_insert on public.listings for insert to authenticated
  with check (seller_id = auth.uid());
create policy listings_update_seller on public.listings for update to authenticated
  using (seller_id = auth.uid());
create policy listings_update_admin on public.listings for update to authenticated
  using (public.current_user_role() in ('admin_portal', 'superadmin'));

-- listing_photos: ikut visibilitas listing-nya.
create policy listing_photos_select on public.listing_photos for select to anon, authenticated
  using (exists (select 1 from public.listings l
                 where l.id = listing_photos.listing_id
                   and (l.status = 'aktif' or l.seller_id = auth.uid())));
create policy listing_photos_write on public.listing_photos for all to authenticated
  using (exists (select 1 from public.listings l
                 where l.id = listing_photos.listing_id
                   and (l.seller_id = auth.uid()
                        or public.current_user_role() in ('admin_portal', 'superadmin'))));

-- chat_threads: hanya peserta + admin.
create policy threads_select on public.chat_threads for select to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid()
         or public.current_user_role() in ('admin_portal', 'superadmin'));
create policy threads_insert on public.chat_threads for insert to authenticated
  with check (buyer_id = auth.uid() and seller_id <> auth.uid());

-- messages: hanya peserta thread (baca + kirim).
create policy messages_select on public.messages for select to authenticated
  using (exists (select 1 from public.chat_threads t
                 where t.id = messages.thread_id
                   and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid()
              and exists (select 1 from public.chat_threads t
                          where t.id = messages.thread_id
                            and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())));

-- bookmarks / blocks / devices: milik sendiri saja.
create policy bookmarks_all on public.bookmarks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy blocks_all on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy devices_all on public.devices for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reports: buat login; baca milik sendiri atau admin; aksi admin.
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = auth.uid()
         or public.current_user_role() in ('admin_portal', 'superadmin'));
create policy reports_update_admin on public.reports for update to authenticated
  using (public.current_user_role() in ('admin_portal', 'superadmin'));

-- moderation_words: baca admin; tulis superadmin.
create policy moderation_words_select on public.moderation_words for select to authenticated
  using (public.current_user_role() in ('admin_portal', 'superadmin'));
create policy moderation_words_write on public.moderation_words for all to authenticated
  using (public.current_user_role() = 'superadmin');

-- contributor_profiles: milik sendiri atau admin.
create policy contributor_select on public.contributor_profiles for select to authenticated
  using (user_id = auth.uid()
         or public.current_user_role() in ('admin_portal', 'superadmin'));
create policy contributor_insert on public.contributor_profiles for insert to authenticated
  with check (user_id = auth.uid());
create policy contributor_update on public.contributor_profiles for update to authenticated
  using (user_id = auth.uid()
         or public.current_user_role() in ('admin_portal', 'superadmin'));

-- contribution_points: baca milik sendiri atau admin; tulis HANYA lewat
-- fungsi award_contribution_point (SECURITY DEFINER) — tanpa policy insert.
create policy points_select on public.contribution_points for select to authenticated
  using (user_id = auth.uid()
         or public.current_user_role() in ('admin_portal', 'superadmin'));

-- info_submissions: kirim login; baca milik sendiri atau admin; kurasi admin.
create policy info_insert on public.info_submissions for insert to authenticated
  with check (user_id = auth.uid());
create policy info_select on public.info_submissions for select to authenticated
  using (user_id = auth.uid()
         or public.current_user_role() in ('admin_portal', 'superadmin'));
create policy info_update_admin on public.info_submissions for update to authenticated
  using (public.current_user_role() in ('admin_portal', 'superadmin'));

-- itineraries / ai_conversations / ai_feedback: milik sendiri saja.
create policy itineraries_all on public.itineraries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ai_conv_all on public.ai_conversations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ai_feedback_all on public.ai_feedback for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- daily_info_snapshots: publik baca; tulis hanya service role (cron).
create policy daily_info_select on public.daily_info_snapshots for select to anon, authenticated using (true);

-- konten iTAP (baca publik; tulis admin).
create policy daily_prices_select on public.daily_prices for select to anon, authenticated using (true);
create policy daily_prices_write on public.daily_prices for all to authenticated
  using (public.current_user_role() in ('admin_portal', 'superadmin'));
create policy market_rates_select on public.market_rates for select to anon, authenticated using (true);
create policy market_rates_write on public.market_rates for all to authenticated
  using (public.current_user_role() in ('admin_portal', 'superadmin'));
create policy jobs_select on public.job_listings for select to anon, authenticated
  using (status = 'open' or public.current_user_role() in ('admin_portal', 'superadmin'));
create policy jobs_write on public.job_listings for all to authenticated
  using (public.current_user_role() in ('admin_portal', 'superadmin'));
create policy products_select on public.digital_products for select to anon, authenticated
  using (active or public.current_user_role() in ('admin_portal', 'superadmin'));
create policy products_write on public.digital_products for all to authenticated
  using (public.current_user_role() in ('admin_portal', 'superadmin'));
create policy services_select on public.services for select to anon, authenticated
  using (active or public.current_user_role() in ('admin_portal', 'superadmin'));
create policy services_write on public.services for all to authenticated
  using (public.current_user_role() in ('admin_portal', 'superadmin'));
create policy kedai_select on public.kedai_menu_items for select to anon, authenticated
  using (available or public.current_user_role() in ('admin_portal', 'superadmin'));
create policy kedai_write on public.kedai_menu_items for all to authenticated
  using (public.current_user_role() in ('admin_portal', 'superadmin'));

-- ============================================================
-- STORAGE (bukan SQL — buat via Dashboard Supabase / storage API)
-- Bucket article-images: public read; upload authenticated, path
--   <author_id>/<file>. Bucket listing-photos: public read; upload
--   authenticated, path <seller_id>/<file>.
-- Kompresi + buang metadata EXIF dilakukan di client SEBELUM upload (F05).
-- ============================================================

-- Catatan aturan 24 jam (F07): daftar publik hanya menampilkan listing
-- status='aktif', jadi listing terjual langsung hilang dari daftar publik.
-- Job sold-listing-cleanup memakai sold_at untuk pengarsipan setelah 24 jam.
