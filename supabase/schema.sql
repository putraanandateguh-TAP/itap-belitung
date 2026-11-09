-- iTAP Belitung: akun, jual beli, kabar, batas pemakaian asisten.
-- Jalankan sekali di SQL Editor Supabase. Anon key tetap tidak bisa melewati kebijakan ini.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  phone text not null default '' check (phone = '' or phone ~ '^[0-9]{10,15}$'),
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  price integer not null check (price >= 0 and price <= 1000000000),
  category text not null check (category in ('elektronik', 'kendaraan', 'rumah', 'jasa', 'lainnya')),
  description text not null check (char_length(description) between 10 and 2000),
  wa text not null check (wa ~ '^[0-9]{10,15}$'),
  hidden boolean not null default false,
  flagged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  path text not null check (path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,80}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 5 and 500),
  created_at timestamptz not null default now(),
  unique (listing_id, reporter_id)
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 8 and 120),
  body text not null check (char_length(body) between 40 and 8000),
  category text not null check (category in ('kabar', 'wisata', 'kuliner', 'budaya')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists listings_created_idx on public.listings (created_at desc);
create index if not exists stories_status_idx on public.stories (status, created_at desc);
create index if not exists ai_usage_user_idx on public.ai_usage (user_id, created_at desc);
create index if not exists ai_usage_ip_idx on public.ai_usage (ip_hash, created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), ''), 60)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.keep_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  new.role := old.role;
  new.id := old.id;
  return new;
end;
$$;

drop trigger if exists profiles_keep_role on public.profiles;
create trigger profiles_keep_role
  before update on public.profiles
  for each row execute function public.keep_profile_role();

create or replace function public.keep_listing_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and auth.role() <> 'service_role' and not public.is_admin() then
    new.flagged := old.flagged;
    new.owner_id := old.owner_id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists listings_guard on public.listings;
create trigger listings_guard
  before update on public.listings
  for each row execute function public.keep_listing_guard();

create or replace function public.keep_story_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and auth.role() <> 'service_role' then
    new.status := 'pending';
  end if;
  if tg_op = 'UPDATE' and auth.role() <> 'service_role' and not public.is_admin() then
    new.status := old.status;
    new.note := old.note;
    new.owner_id := old.owner_id;
  end if;
  return new;
end;
$$;

drop trigger if exists stories_keep_status on public.stories;
create trigger stories_keep_status
  before insert or update on public.stories
  for each row execute function public.keep_story_status();

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.listing_reports enable row level security;
alter table public.stories enable row level security;
alter table public.ai_usage enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.profiles to anon;
grant select on public.listings to anon, authenticated;
grant insert, update, delete on public.listings to authenticated;
grant select on public.listing_photos to anon, authenticated;
grant insert, delete on public.listing_photos to authenticated;
grant select, insert on public.listing_reports to authenticated;
grant select on public.stories to anon, authenticated;
grant insert, update on public.stories to authenticated;
revoke all on public.ai_usage from anon, authenticated;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to anon, authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists listings_select on public.listings;
create policy listings_select on public.listings
  for select to anon, authenticated
  using (
    (hidden = false and flagged = false)
    or owner_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists listings_insert on public.listings;
create policy listings_insert on public.listings
  for insert to authenticated
  with check (owner_id = auth.uid() and flagged = false);

drop policy if exists listings_update on public.listings;
create policy listings_update on public.listings
  for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists listings_delete on public.listings;
create policy listings_delete on public.listings
  for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

drop policy if exists photos_select on public.listing_photos;
create policy photos_select on public.listing_photos
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and ((l.hidden = false and l.flagged = false) or l.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists photos_insert on public.listing_photos;
create policy photos_insert on public.listing_photos
  for insert to authenticated
  with check (
    path like auth.uid()::text || '/%'
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

drop policy if exists photos_delete on public.listing_photos;
create policy photos_delete on public.listing_photos
  for delete to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and (l.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists reports_insert on public.listing_reports;
create policy reports_insert on public.listing_reports
  for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and not exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

drop policy if exists reports_select on public.listing_reports;
create policy reports_select on public.listing_reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists stories_select on public.stories;
create policy stories_select on public.stories
  for select to anon, authenticated
  using (status = 'approved' or owner_id = auth.uid() or public.is_admin());

drop policy if exists stories_insert on public.stories;
create policy stories_insert on public.stories
  for insert to authenticated
  with check (owner_id = auth.uid() and status = 'pending');

drop policy if exists stories_update on public.stories;
create policy stories_update on public.stories
  for update to authenticated
  using ((owner_id = auth.uid() and status = 'pending') or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

insert into storage.buckets (id, name, public)
values ('listings', 'listings', true)
on conflict (id) do update set public = true;

drop policy if exists listing_storage_read on storage.objects;
create policy listing_storage_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'listings');

drop policy if exists listing_storage_insert on storage.objects;
create policy listing_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists listing_storage_delete on storage.objects;
create policy listing_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
