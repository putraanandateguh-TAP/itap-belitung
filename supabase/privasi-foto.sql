-- Privasi foto Jual Beli. Idempoten; jalankan di SQL Editor setelah schema.sql.
-- 1) Admin boleh menghapus file foto iklan siapa pun di bucket publik "listings" (untuk iklan yang dihapus/ditolak).
--    Pemilik sudah bisa menghapus foldernya sendiri lewat kebijakan listing_storage_delete di schema.sql.
drop policy if exists listing_storage_admin_delete on storage.objects;
create policy listing_storage_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'listings' and public.is_admin());

-- 2) Daftar file "yatim": foto di bucket listings yang barisnya di listing_photos sudah tidak ada
--    (misalnya iklan/akun terhapus sebelum pembersihan foto dipasang). Hanya admin.
--    Penghapusan filenya tetap lewat Storage API (tombol "Bersihkan foto yatim" di /akun/ → Moderasi),
--    karena menghapus baris storage.objects langsung lewat SQL tidak menghapus berkas aslinya.
create or replace function public.admin_listing_photo_orphans()
returns table (name text)
language sql stable security definer set search_path = public, storage as $$
  select o.name
  from storage.objects o
  where public.is_admin()
    and o.bucket_id = 'listings'
    and not exists (select 1 from public.listing_photos p where p.path = o.name)
  limit 1000;
$$;
revoke all on function public.admin_listing_photo_orphans() from public, anon;
grant execute on function public.admin_listing_photo_orphans() to authenticated;
