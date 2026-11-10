-- Undangan Digital iTAP: akses penuh seumur hidup untuk akun admin.
-- Jalankan SEKALI di Supabase SQL Editor, setelah supabase/schema.sql dan supabase/undangan.sql.
-- Aman dijalankan ulang (idempotent).
--
-- Yang sudah berlaku tanpa file ini (dari undangan.sql):
--   * hanya admin (profiles.role = 'admin') yang boleh membuat undangan (policy inv_insert);
--   * admin boleh mengubah dan mengaktifkan undangan mana pun tanpa pembayaran (inv_update + keep_invitation_status);
--   * tidak ada masa aktif / tanggal kedaluwarsa di tabel invitations;
--   * tidak ada batas jumlah undangan.
--
-- Yang ditambahkan file ini:
--   1. Undangan milik admin sendiri (owner_id = admin yang sedang masuk) selalu dipaksa paket 'penuh'
--      oleh database, jadi semua fitur terbuka. Ditentukan oleh peran, bukan kode bersama.
--   2. Admin boleh menghapus undangan (belum ada policy delete).
--   3. Admin boleh mengganti/menghapus foto yang ia unggah sendiri di bucket invitations.
--   4. Status & catatan pesanan. 5. Hapus ucapan/RSVP. 6. Harga paket dari dasbor.

create or replace function public.admin_own_invitation_full()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() and new.owner_id is not null and new.owner_id = auth.uid() then
    new.package := 'penuh';
  end if;
  return new;
end;
$$;

-- Nama diawali "invitations_admin" supaya berjalan sebelum invitations_keep_status (urutan abjad).
drop trigger if exists invitations_admin_full on public.invitations;
create trigger invitations_admin_full
  before insert or update on public.invitations
  for each row execute function public.admin_own_invitation_full();

grant delete on public.invitations to authenticated;
drop policy if exists inv_delete on public.invitations;
create policy inv_delete on public.invitations
  for delete to authenticated
  using (public.is_admin());

drop policy if exists invitation_storage_update on storage.objects;
create policy invitation_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'invitations' and (storage.foldername(name))[1] = auth.uid()::text and public.is_admin())
  with check (bucket_id = 'invitations' and (storage.foldername(name))[1] = auth.uid()::text and public.is_admin());

drop policy if exists invitation_storage_delete on storage.objects;
create policy invitation_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'invitations' and (storage.foldername(name))[1] = auth.uid()::text and public.is_admin());

-- 4. Pesanan bisa diberi status dan catatan oleh admin dari dasbor (baru/dibayar/selesai/batal).
alter table public.invitation_orders add column if not exists status text not null default 'baru';
alter table public.invitation_orders add column if not exists admin_note text not null default '';
alter table public.invitation_orders add column if not exists invitation_id uuid references public.invitations (id) on delete set null;
alter table public.invitation_orders add column if not exists updated_at timestamptz not null default now();
alter table public.invitation_orders drop constraint if exists invitation_orders_status_chk;
alter table public.invitation_orders add constraint invitation_orders_status_chk check (status in ('baru', 'dibayar', 'selesai', 'batal'));
alter table public.invitation_orders drop constraint if exists invitation_orders_note_chk;
alter table public.invitation_orders add constraint invitation_orders_note_chk check (char_length(admin_note) <= 1000);

-- Pembeli (anon) tetap hanya bisa membuat pesanan berstatus 'baru'.
drop policy if exists order_insert on public.invitation_orders;
create policy order_insert on public.invitation_orders
  for insert to anon, authenticated
  with check (char_length(contact_wa) between 10 and 15 and status = 'baru' and admin_note = '' and invitation_id is null);

grant update, delete on public.invitation_orders to authenticated;
drop policy if exists order_update on public.invitation_orders;
create policy order_update on public.invitation_orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists order_delete on public.invitation_orders;
create policy order_delete on public.invitation_orders
  for delete to authenticated using (public.is_admin());

-- 5. Admin boleh menghapus ucapan dan RSVP (misalnya spam).
grant delete on public.invitation_wishes, public.invitation_rsvps to authenticated;
drop policy if exists wish_delete on public.invitation_wishes;
create policy wish_delete on public.invitation_wishes
  for delete to authenticated using (public.is_admin());
drop policy if exists rsvp_delete on public.invitation_rsvps;
create policy rsvp_delete on public.invitation_rsvps
  for delete to authenticated using (public.is_admin());

-- 6. Harga paket bisa diubah dari dasbor. Semua orang boleh membaca, hanya admin yang boleh menulis.
--    Bila baris 'prices' tidak ada, situs memakai harga bawaan di undangan/config.js.
create table if not exists public.undangan_settings (
  key text primary key check (key in ('prices')),
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.undangan_settings enable row level security;
grant select on public.undangan_settings to anon, authenticated;
grant insert, update, delete on public.undangan_settings to authenticated;
drop policy if exists settings_read on public.undangan_settings;
create policy settings_read on public.undangan_settings for select to anon, authenticated using (true);
drop policy if exists settings_write on public.undangan_settings;
create policy settings_write on public.undangan_settings for insert to authenticated with check (public.is_admin());
drop policy if exists settings_update on public.undangan_settings;
create policy settings_update on public.undangan_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists settings_delete on public.undangan_settings;
create policy settings_delete on public.undangan_settings for delete to authenticated using (public.is_admin());

-- Undangan admin yang sudah ada (bila ada) ikut dinaikkan ke paket penuh.
update public.invitations i
set package = 'penuh'
from public.profiles p
where p.id = i.owner_id and p.role = 'admin' and i.package <> 'penuh';

-- Cek cepat: harus menampilkan email admin dengan role 'admin'.
select u.email, p.role
from auth.users u join public.profiles p on p.id = u.id
where p.role = 'admin';
