-- Langganan Web Push (peringatan cuaca & gempa). Tidak ada kebijakan SELECT: hanya service_role (fungsi push-alert) yang membaca.
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  endpoint text not null unique check (endpoint ~ '^https://'),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists push_insert on public.push_subscriptions;
create policy push_insert on public.push_subscriptions for insert to anon, authenticated
  with check (length(endpoint) < 600 and length(p256dh) < 200 and length(auth) < 100);
create table if not exists public.push_state (key text primary key, value text not null, updated_at timestamptz not null default now());
alter table public.push_state enable row level security;
-- Izin eksplisit (seperti schema.sql): browser hanya boleh menambah langganan, tidak boleh membaca/ubah/hapus.
grant usage on schema public to anon, authenticated;
revoke all on public.push_subscriptions from anon, authenticated;
grant insert on public.push_subscriptions to anon, authenticated;
-- ON CONFLICT (endpoint) di push.js butuh izin SELECT pada kolom endpoint. Tanpa kebijakan SELECT, RLS tetap membuat GET kosong.
grant select (endpoint) on public.push_subscriptions to anon, authenticated;
revoke all on public.push_state from anon, authenticated;
