-- Undangan Digital iTAP. Jalankan setelah supabase/schema.sql (butuh public.is_admin()).
-- Publik membaca undangan yang sudah aktif, dan boleh mengisi RSVP serta ucapan.
-- Hanya admin (profiles.role = admin) yang boleh mengaktifkan, menautkan email pembeli,
-- dan mencabut tautan sunting. Pembeli hanya melihat baris yang owner_id atau owner_email-nya cocok.
-- Tautan sunting memakai token acak 256-bit yang disimpan sebagai hash SHA-256. Token mentah tidak pernah disimpan.

do $$ begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_admin'
  ) then
    raise exception 'Fungsi public.is_admin belum ada. Jalankan supabase/schema.sql dulu.';
  end if;
end $$;

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,48}$'),
  theme text not null check (theme in ('melayu', 'emas', 'pantai', 'islami')),
  package text not null default 'lengkap',
  data jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'active')),
  owner_id uuid references auth.users (id) on delete set null,
  owner_email text,
  edit_token_hash text,
  created_at timestamptz not null default now(),
  constraint invitations_owner_email_chk check (owner_email is null or owner_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint invitations_token_hash_chk check (edit_token_hash is null or edit_token_hash ~ '^[a-f0-9]{64}$')
);

create table if not exists public.invitation_rsvps (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations (id) on delete cascade,
  guest_name text not null check (char_length(guest_name) between 2 and 60),
  attendance text not null check (attendance in ('hadir', 'tidak', 'ragu')),
  guests integer not null default 1 check (guests between 0 and 10),
  guest_token text not null check (char_length(guest_token) between 8 and 80),
  created_at timestamptz not null default now()
);

create table if not exists public.invitation_wishes (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations (id) on delete cascade,
  guest_name text not null check (char_length(guest_name) between 2 and 60),
  message text not null check (char_length(message) between 2 and 400),
  guest_token text not null check (char_length(guest_token) between 8 and 80),
  created_at timestamptz not null default now()
);

create table if not exists public.invitation_orders (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (char_length(event_type) between 2 and 40),
  theme text not null check (theme in ('melayu', 'emas', 'pantai', 'islami')),
  package text not null,
  contact_wa text not null check (contact_wa ~ '^[0-9]{10,15}$'),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists invitation_rsvps_inv_idx on public.invitation_rsvps (invitation_id, created_at desc);
create index if not exists invitation_wishes_inv_idx on public.invitation_wishes (invitation_id, created_at desc);

create or replace function public.invitation_is_active(inv uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.invitations where id = inv and status = 'active');
$$;

create or replace function public.keep_invitation_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and auth.role() <> 'service_role' and not public.is_admin() then
    new.status := 'draft';
  end if;
  if tg_op = 'UPDATE' and auth.role() <> 'service_role' and not public.is_admin() then
    new.status := old.status;
    new.owner_email := old.owner_email;
    new.edit_token_hash := old.edit_token_hash;
    new.slug := old.slug;
    new.package := old.package;
    if new.owner_id is distinct from old.owner_id then
      if old.owner_id is null
         and new.owner_id = auth.uid()
         and lower(old.owner_email) = lower(coalesce(auth.jwt() ->> 'email', '')) then
        null;
      else
        new.owner_id := old.owner_id;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists invitations_keep_status on public.invitations;
create trigger invitations_keep_status
  before insert or update on public.invitations
  for each row execute function public.keep_invitation_status();

create or replace function public.limit_rsvp()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.invitation_rsvps
    where invitation_id = new.invitation_id and guest_token = new.guest_token
  ) then
    raise exception 'RSVP untuk perangkat ini sudah ada';
  end if;
  return new;
end;
$$;

drop trigger if exists rsvp_once on public.invitation_rsvps;
create trigger rsvp_once
  before insert on public.invitation_rsvps
  for each row execute function public.limit_rsvp();

create or replace function public.limit_wish()
returns trigger
language plpgsql
as $$
declare
  n integer;
begin
  select count(*) into n from public.invitation_wishes
  where invitation_id = new.invitation_id
    and guest_token = new.guest_token
    and created_at > now() - interval '1 hour';
  if n >= 3 then
    raise exception 'Ucapan terlalu sering. Coba lagi nanti.';
  end if;
  return new;
end;
$$;

drop trigger if exists wish_rate on public.invitation_wishes;
create trigger wish_rate
  before insert on public.invitation_wishes
  for each row execute function public.limit_wish();

alter table public.invitations enable row level security;
alter table public.invitation_rsvps enable row level security;
alter table public.invitation_wishes enable row level security;
alter table public.invitation_orders enable row level security;

grant select on public.invitations to anon, authenticated;
grant insert, update on public.invitations to authenticated;
grant select, insert on public.invitation_rsvps to anon, authenticated;
grant select, insert on public.invitation_wishes to anon, authenticated;
grant insert on public.invitation_orders to anon, authenticated;
grant select on public.invitation_orders to authenticated;

drop policy if exists inv_read on public.invitations;
create policy inv_read on public.invitations
  for select to anon, authenticated
  using (
    status = 'active'
    or public.is_admin()
    or owner_id = auth.uid()
    or lower(owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists inv_insert on public.invitations;
create policy inv_insert on public.invitations
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists inv_update on public.invitations;
create policy inv_update on public.invitations
  for update to authenticated
  using (
    public.is_admin()
    or owner_id = auth.uid()
    or lower(owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    public.is_admin()
    or owner_id = auth.uid()
    or lower(owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists rsvp_read on public.invitation_rsvps;
create policy rsvp_read on public.invitation_rsvps
  for select to anon, authenticated
  using (
    public.invitation_is_active(invitation_id)
    or public.is_admin()
    or exists (
      select 1 from public.invitations i
      where i.id = invitation_id
        and (i.owner_id = auth.uid() or lower(i.owner_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    )
  );

drop policy if exists rsvp_insert on public.invitation_rsvps;
create policy rsvp_insert on public.invitation_rsvps
  for insert to anon, authenticated
  with check (public.invitation_is_active(invitation_id));

drop policy if exists wish_read on public.invitation_wishes;
create policy wish_read on public.invitation_wishes
  for select to anon, authenticated
  using (
    public.invitation_is_active(invitation_id)
    or public.is_admin()
    or exists (
      select 1 from public.invitations i
      where i.id = invitation_id
        and (i.owner_id = auth.uid() or lower(i.owner_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    )
  );

drop policy if exists wish_insert on public.invitation_wishes;
create policy wish_insert on public.invitation_wishes
  for insert to anon, authenticated
  with check (public.invitation_is_active(invitation_id));

drop policy if exists order_insert on public.invitation_orders;
create policy order_insert on public.invitation_orders
  for insert to anon, authenticated
  with check (char_length(contact_wa) between 10 and 15);

drop policy if exists order_read on public.invitation_orders;
create policy order_read on public.invitation_orders
  for select to authenticated
  using (public.is_admin());

create extension if not exists pgcrypto with schema extensions;

create or replace function public.invitation_token_hash(p_token text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function public.invitation_manage(p_slug text, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  row public.invitations;
begin
  if p_token is null or length(p_token) < 22 then
    return null;
  end if;
  select * into row from public.invitations
  where slug = p_slug
    and edit_token_hash is not null
    and edit_token_hash = public.invitation_token_hash(p_token);
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'id', row.id, 'slug', row.slug, 'theme', row.theme,
    'package', row.package, 'status', row.status, 'data', row.data
  );
end;
$$;

create or replace function public.invitation_save_token(p_slug text, p_token text, p_data jsonb)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  n integer;
begin
  if p_token is null or length(p_token) < 22 or p_data is null then
    return false;
  end if;
  if octet_length(p_data::text) > 100000 then
    return false;
  end if;
  update public.invitations
  set data = p_data
  where slug = p_slug
    and edit_token_hash is not null
    and edit_token_hash = public.invitation_token_hash(p_token);
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

create or replace function public.invitation_guests(p_slug text, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  inv uuid;
begin
  if p_token is null or length(p_token) < 22 then
    return null;
  end if;
  select id into inv from public.invitations
  where slug = p_slug
    and edit_token_hash is not null
    and edit_token_hash = public.invitation_token_hash(p_token);
  if inv is null then
    return null;
  end if;
  return jsonb_build_object(
    'rsvps', coalesce((
      select jsonb_agg(jsonb_build_object('guest_name', guest_name, 'attendance', attendance, 'guests', guests) order by created_at desc)
      from public.invitation_rsvps where invitation_id = inv
    ), '[]'::jsonb),
    'wishes', coalesce((
      select jsonb_agg(jsonb_build_object('guest_name', guest_name, 'message', message) order by created_at desc)
      from public.invitation_wishes where invitation_id = inv
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.invitation_token_hash(text) from public, anon, authenticated;
grant execute on function public.invitation_manage(text, text) to anon, authenticated;
grant execute on function public.invitation_save_token(text, text, jsonb) to anon, authenticated;
grant execute on function public.invitation_guests(text, text) to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('invitations', 'invitations', true)
on conflict (id) do update set public = true;

drop policy if exists invitation_storage_read on storage.objects;
create policy invitation_storage_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'invitations');

drop policy if exists invitation_storage_insert on storage.objects;
create policy invitation_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'invitations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
