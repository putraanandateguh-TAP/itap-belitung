-- Undangan Digital iTAP: dasbor pembeli (/undangan/akun/).
-- Jalankan SEKALI di Supabase SQL Editor, setelah supabase/undangan.sql dan supabase/undangan-admin.sql.
-- Aman dijalankan ulang (idempotent).
--
-- Tanpa file ini dasbor tetap jalan: Beranda, RSVP (lihat), Sebar (daftar tamu disimpan di HP saja),
-- Layanan, dan Profil. File ini menyalakan:
--   1. Sembunyikan/tampilkan ucapan tamu (kolom hidden). Undangan /u/ tidak menampilkan ucapan tersembunyi.
--   2. Daftar tamu tersimpan di server (tabel invitation_private), bisa dibuka dari HP mana pun.
--   3. Daftar Transaksi pembeli: pesanan yang ditautkan ke undangannya atau yang memakai emailnya.
--      Lewat fungsi khusus yang tidak membuka catatan admin dan nomor WA.
--   4. Masa aktif undangan (kolom expires_at). Dasar 30 hari, Klasik 90 hari, Lengkap ke atas selamanya
--      (angka hari bisa diubah di dasbor admin, tab Harga). Dihitung dari saat undangan diaktifkan.
--      Undangan lama tetap tanpa tanggal habis (expires_at kosong = selamanya). Undangan milik admin tidak pernah habis.
--      Undangan yang habis tidak bisa dibuka tamu (data tetap tersimpan), pemilik tetap bisa masuk dasbor,
--      dan admin bisa memperpanjang dari tab Undangan.

-- Pemilik undangan = owner_id cocok atau owner_email cocok dengan email akun yang masuk.
create or replace function public.invitation_owned(inv uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.invitations i
    where i.id = inv
      and (i.owner_id = auth.uid() or lower(i.owner_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;
-- Dipakai di policy yang juga dibaca tamu (anon); untuk anon hasilnya selalu false.
grant execute on function public.invitation_owned(uuid) to anon, authenticated;

-- 1. Moderasi ucapan.
alter table public.invitation_wishes add column if not exists hidden boolean not null default false;

-- Tamu (anon) hanya membaca ucapan yang tidak disembunyikan. Pemilik dan admin membaca semuanya.
drop policy if exists wish_read on public.invitation_wishes;
create policy wish_read on public.invitation_wishes
  for select to anon, authenticated
  using (
    (public.invitation_is_active(invitation_id) and not hidden)
    or public.is_admin()
    or public.invitation_owned(invitation_id)
  );

-- Tamu tidak boleh mengirim ucapan yang langsung tersembunyi/terlihat di luar aturan.
drop policy if exists wish_insert on public.invitation_wishes;
create policy wish_insert on public.invitation_wishes
  for insert to anon, authenticated
  with check (public.invitation_is_active(invitation_id) and not hidden);

-- Pemilik dan admin hanya boleh mengubah kolom hidden.
revoke update on public.invitation_wishes from anon, authenticated;
grant update (hidden) on public.invitation_wishes to authenticated;
drop policy if exists wish_update on public.invitation_wishes;
create policy wish_update on public.invitation_wishes
  for update to authenticated
  using (public.is_admin() or public.invitation_owned(invitation_id))
  with check (public.is_admin() or public.invitation_owned(invitation_id));

-- Tautan sunting pribadi (mode token) ikut menampilkan status hidden.
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
      select jsonb_agg(jsonb_build_object('guest_name', guest_name, 'message', message, 'hidden', hidden) order by created_at desc)
      from public.invitation_wishes where invitation_id = inv
    ), '[]'::jsonb)
  );
end;
$$;
grant execute on function public.invitation_guests(text, text) to anon, authenticated;

-- 2. Data pribadi undangan (daftar tamu untuk disebar). Tidak ikut terbaca publik seperti kolom data.
create table if not exists public.invitation_private (
  invitation_id uuid primary key references public.invitations (id) on delete cascade,
  guests jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint invitation_private_guests_chk check (jsonb_typeof(guests) = 'array' and octet_length(guests::text) <= 200000)
);
alter table public.invitation_private enable row level security;
revoke all on public.invitation_private from anon;
grant select, insert, update, delete on public.invitation_private to authenticated;
drop policy if exists priv_all on public.invitation_private;
create policy priv_all on public.invitation_private
  for all to authenticated
  using (public.is_admin() or public.invitation_owned(invitation_id))
  with check (public.is_admin() or public.invitation_owned(invitation_id));

-- 3. Daftar Transaksi pembeli. Hanya kolom aman (tanpa catatan admin & nomor WA).
create or replace function public.my_invitation_orders()
returns table (id uuid, created_at timestamptz, event_type text, theme text, package text, status text, invitation_id uuid, names text)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.created_at, o.event_type, o.theme, o.package, o.status, o.invitation_id, coalesce(o.payload ->> 'names', '')
  from public.invitation_orders o
  where auth.uid() is not null
    and (
      (o.invitation_id is not null and public.invitation_owned(o.invitation_id))
      or (coalesce(auth.jwt() ->> 'email', '') <> '' and lower(o.payload ->> 'email') = lower(auth.jwt() ->> 'email'))
    )
  order by o.created_at desc
  limit 50;
$$;
revoke all on function public.my_invitation_orders() from public, anon;
grant execute on function public.my_invitation_orders() to authenticated;

-- 4. Masa aktif.
alter table public.invitations add column if not exists expires_at timestamptz;

-- Hari masa aktif per paket: dari undangan_settings (kunci 'prices', bagian 'days'), bawaan Dasar 30 / Klasik 90.
-- 0 atau kosong = selamanya (null).
create or replace function public.invitation_package_days(p_package text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select nullif(coalesce(
    (select case when (s.value -> 'days') ? p_package
                 then nullif(s.value -> 'days' ->> p_package, '')::integer end
     from public.undangan_settings s where s.key = 'prices' and jsonb_typeof(s.value -> 'days') = 'object'),
    case p_package when 'dasar' then 30 when 'klasik' then 90 else 0 end
  ), 0);
$$;

create or replace function public.invitation_set_expiry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  d integer;
  admin_owned boolean;
begin
  admin_owned := new.owner_id is not null
    and exists (select 1 from public.profiles p where p.id = new.owner_id and p.role = 'admin');
  -- Hanya admin (atau server) yang boleh mengubah tanggal habis.
  if tg_op = 'UPDATE' and auth.role() <> 'service_role' and not public.is_admin() then
    new.expires_at := old.expires_at;
    return new;
  end if;
  if admin_owned then
    new.expires_at := null;
    return new;
  end if;
  if new.status = 'active' then
    d := public.invitation_package_days(new.package);
    if tg_op = 'INSERT' then
      if new.expires_at is null and d is not null then
        new.expires_at := now() + make_interval(days => d);
      end if;
    elsif new.expires_at is not distinct from old.expires_at then
      -- Baru diaktifkan, atau paket diganti (upgrade): hitung ulang dari sekarang.
      -- Bila admin mengisi tanggal sendiri pada simpanan yang sama, tanggal admin yang dipakai.
      if old.status <> 'active' and old.expires_at is null and d is not null then
        new.expires_at := now() + make_interval(days => d);
      elsif new.package is distinct from old.package then
        new.expires_at := case when d is null then null else now() + make_interval(days => d) end;
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- Nama "invitations_zz" supaya berjalan setelah invitations_admin_full dan invitations_keep_status (urutan abjad),
-- sehingga paket yang dipakai sudah final.
drop trigger if exists invitations_zz_expiry on public.invitations;
create trigger invitations_zz_expiry
  before insert or update on public.invitations
  for each row execute function public.invitation_set_expiry();

-- Undangan yang habis tidak lagi dianggap aktif: tamu tidak bisa membuka, RSVP, atau mengirim ucapan.
create or replace function public.invitation_is_active(inv uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.invitations
    where id = inv and status = 'active' and (expires_at is null or expires_at > now())
  );
$$;

drop policy if exists inv_read on public.invitations;
create policy inv_read on public.invitations
  for select to anon, authenticated
  using (
    (status = 'active' and (expires_at is null or expires_at > now()))
    or public.is_admin()
    or owner_id = auth.uid()
    or lower(owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- Halaman /u/ menanyakan keadaan undangan tanpa membuka isinya: 'active', 'expired', atau null.
create or replace function public.invitation_public_state(p_slug text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when status <> 'active' then null
    when expires_at is not null and expires_at <= now() then 'expired'
    else 'active' end
  from public.invitations where slug = p_slug;
$$;
grant execute on function public.invitation_public_state(text) to anon, authenticated;

-- Penanda versi supaya dasbor tahu file ini sudah dijalankan.
create or replace function public.undangan_dashboard_ready()
returns integer
language sql
immutable
as $$ select 1; $$;
grant execute on function public.undangan_dashboard_ready() to anon, authenticated;

-- Cek cepat: harus menampilkan 1 dan true.
select public.undangan_dashboard_ready() as versi,
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'invitation_wishes' and column_name = 'hidden') as kolom_hidden;
