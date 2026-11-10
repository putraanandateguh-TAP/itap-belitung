-- iTAP Belitung: akun pengunjung & admin/owner (pesanan produk, akses produk, ulasan, favorit, berkas produk).
-- Idempoten: aman dijalankan ulang di SQL Editor Supabase. Butuh schema.sql (profiles, is_admin) sudah terpasang.
-- Tidak menyentuh tabel undangan, listings, stories. Tidak ada data contoh / ulasan palsu.

create extension if not exists pgcrypto;

-- 1) Pesanan produk iTAP (bayar tetap lewat WhatsApp/QRIS, dicatat di sini) -----------------------
create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id text not null check (product_id ~ '^[a-z0-9-]{2,40}$'),
  product_name text not null check (char_length(product_name) between 2 and 120),
  price integer not null default 0 check (price between 0 and 100000000),
  qty integer not null default 1 check (qty between 1 and 99),
  note text not null default '' check (char_length(note) <= 500),
  wa text not null default '' check (wa = '' or wa ~ '^[0-9]{10,15}$'),
  status text not null default 'baru' check (status in ('baru', 'dibayar', 'diproses', 'selesai', 'batal')),
  admin_note text not null default '' check (char_length(admin_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shop_orders_user_idx on public.shop_orders (user_id, created_at desc);
create index if not exists shop_orders_status_idx on public.shop_orders (status, created_at desc);

-- 2) Hak akses produk (diberikan admin setelah bayar dicek). expires_at null = selamanya -------------
create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id text not null check (product_id ~ '^[a-z0-9-]{2,40}$'),
  order_id uuid references public.shop_orders (id) on delete set null,
  expires_at timestamptz,
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
create index if not exists entitlements_user_idx on public.entitlements (user_id);

-- 3) Ulasan & rating produk iTAP dan Kedai. Tampil publik hanya setelah disetujui admin -------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id text not null check (product_id ~ '^[a-z0-9-]{2,40}$'),
  author_name text not null default '' check (char_length(author_name) <= 60),
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);
create index if not exists reviews_public_idx on public.reviews (product_id, status, created_at desc);

-- 4) Favorit (produk, iklan jual beli, tempat) -------------------------------------------------------
create table if not exists public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('produk', 'iklan', 'tempat')),
  item_id text not null check (char_length(item_id) between 1 and 80),
  label text not null default '' check (char_length(label) <= 120),
  created_at timestamptz not null default now(),
  primary key (user_id, kind, item_id)
);

-- Penjaga kolom: pengguna biasa tidak bisa mengubah status/pemilik sendiri ---------------------------
create or replace function public.guard_shop_order()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' or session_user in ('postgres', 'supabase_admin') or public.is_admin() then
    new.updated_at := now();
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'baru';
    new.admin_note := '';
    new.user_id := auth.uid();
  else
    -- pembeli hanya boleh membatalkan pesanan yang masih baru
    new.user_id := old.user_id;
    new.product_id := old.product_id;
    new.product_name := old.product_name;
    new.price := old.price;
    new.admin_note := old.admin_note;
    if not (old.status = 'baru' and new.status in ('baru', 'batal')) then
      new.status := old.status;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists shop_orders_guard on public.shop_orders;
create trigger shop_orders_guard before insert or update on public.shop_orders
  for each row execute function public.guard_shop_order();

create or replace function public.guard_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' or session_user in ('postgres', 'supabase_admin') or public.is_admin() then
    new.updated_at := now();
    return new;
  end if;
  -- ulasan baru atau yang diubah pengguna kembali menunggu tinjauan
  new.status := 'pending';
  if tg_op = 'INSERT' then new.user_id := auth.uid(); else new.user_id := old.user_id; new.product_id := old.product_id; end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists reviews_guard on public.reviews;
create trigger reviews_guard before insert or update on public.reviews
  for each row execute function public.guard_review();

-- RLS ---------------------------------------------------------------------------------------------
alter table public.shop_orders enable row level security;
alter table public.entitlements enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;

grant select, insert, update on public.shop_orders to authenticated;
grant delete on public.shop_orders to authenticated;
grant select on public.entitlements to authenticated;
grant insert, update, delete on public.entitlements to authenticated;
grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant select, insert, delete on public.favorites to authenticated;

drop policy if exists shop_orders_select on public.shop_orders;
create policy shop_orders_select on public.shop_orders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists shop_orders_insert on public.shop_orders;
create policy shop_orders_insert on public.shop_orders for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists shop_orders_update on public.shop_orders;
create policy shop_orders_update on public.shop_orders for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
drop policy if exists shop_orders_delete on public.shop_orders;
create policy shop_orders_delete on public.shop_orders for delete to authenticated
  using (public.is_admin());

drop policy if exists entitlements_select on public.entitlements;
create policy entitlements_select on public.entitlements for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists entitlements_admin_insert on public.entitlements;
create policy entitlements_admin_insert on public.entitlements for insert to authenticated
  with check (public.is_admin());
drop policy if exists entitlements_admin_update on public.entitlements;
create policy entitlements_admin_update on public.entitlements for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists entitlements_admin_delete on public.entitlements;
create policy entitlements_admin_delete on public.entitlements for delete to authenticated
  using (public.is_admin());

drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select to anon, authenticated
  using (status = 'approved' or user_id = auth.uid() or public.is_admin());
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists favorites_own on public.favorites;
create policy favorites_own on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Admin: lihat laporan iklan (tabel dari schema.sql) sudah lewat reports_select (is_admin).

-- Admin: cari akun dari email untuk memberi akses produk. Hanya admin; pengguna lain dapat kosong. ---
create or replace function public.admin_find_user(p_email text)
returns table (id uuid, display_name text, phone text)
language sql stable security definer set search_path = public, auth as $$
  select p.id, p.display_name, p.phone
  from auth.users u join public.profiles p on p.id = u.id
  where public.is_admin() and lower(u.email) = lower(trim(p_email))
  limit 1;
$$;
revoke all on function public.admin_find_user(text) from public, anon;
grant execute on function public.admin_find_user(text) to authenticated;

-- Admin: daftar email pemesan (profiles tidak menyimpan email). Hanya admin. ----------------------
create or replace function public.admin_user_emails(p_ids uuid[])
returns table (id uuid, email text)
language sql stable security definer set search_path = public, auth as $$
  select u.id, u.email::text from auth.users u
  where public.is_admin() and u.id = any (p_ids);
$$;
revoke all on function public.admin_user_emails(uuid[]) from public, anon;
grant execute on function public.admin_user_emails(uuid[]) to authenticated;

-- Storage: berkas produk digital (PDF dsb). PRIVAT. Owner/admin baca-tulis semua, pembeli hanya
-- folder produk yang hak aksesnya aktif. Jalur berkas: <product_id>/<nama-berkas>.
insert into storage.buckets (id, name, public, file_size_limit)
values ('produk', 'produk', false, 52428800)
on conflict (id) do update set public = false;

drop policy if exists produk_read on storage.objects;
create policy produk_read on storage.objects for select to authenticated
  using (
    bucket_id = 'produk'
    and (
      public.is_admin()
      or exists (
        select 1 from public.entitlements e
        where e.user_id = auth.uid()
          and e.product_id = (storage.foldername(name))[1]
          and (e.expires_at is null or e.expires_at > now())
      )
    )
  );
drop policy if exists produk_admin_insert on storage.objects;
create policy produk_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'produk' and public.is_admin());
drop policy if exists produk_admin_update on storage.objects;
create policy produk_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'produk' and public.is_admin());
drop policy if exists produk_admin_delete on storage.objects;
create policy produk_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'produk' and public.is_admin());

-- Cek cepat setelah Run:
-- select table_name from information_schema.tables where table_schema='public'
--   and table_name in ('shop_orders','entitlements','reviews','favorites');
