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

-- Undangan admin yang sudah ada (bila ada) ikut dinaikkan ke paket penuh.
update public.invitations i
set package = 'penuh'
from public.profiles p
where p.id = i.owner_id and p.role = 'admin' and i.package <> 'penuh';

-- Cek cepat: harus menampilkan email admin dengan role 'admin'.
select u.email, p.role
from auth.users u join public.profiles p on p.id = u.id
where p.role = 'admin';
