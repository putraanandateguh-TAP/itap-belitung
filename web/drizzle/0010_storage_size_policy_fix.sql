-- ============================================================
-- 0010_storage_size_policy_fix.sql
-- SEC-12 follow-up (2026-11-18, uji live): syarat ukuran di policy
-- INSERT/UPDATE Storage GAGAL untuk upload sah via Storage API.
--
-- Diagnosis live (bucket diag-test, 4 tahap, semua dengan JWT user asli):
--   1. policy bucket-only (role authenticated) ............ LOLOS 200
--   2. policy bucket + foldername = auth.uid() ............ LOLOS 200
--   3. policy bucket + foldername + mimetype .............. LOLOS 200
--   4. policy 0008 lengkap (+ size) via API ............... GAGAL 400 RLS
--   5. simulasi SQL yang sama dengan metadata lengkap ..... LOLOS
-- Kesimpulan: server Storage memasukkan baris storage.objects SEBELUM
-- metadata 'size' terisi final (mimetype sudah ada saat insert, size
-- belum/tidak dalam bentuk yang diharapkan), sehingga syarat
-- (metadata->>'size')::bigint between 1 and 1048576 selalu gagal saat
-- INSERT/UPDATE lewat API. Asumsi di komentar 0008 ("metadata diisi
-- server saat upload, sehingga tersedia saat policy dievaluasi") hanya
-- benar untuk mimetype, bukan size.
--
-- Perbaikan: hapus syarat size dari keempat policy RLS Storage (INSERT +
-- UPDATE kedua bucket); batas ukuran ditegakkan di tingkat bucket
-- (storage.buckets.file_size_limit = 1048576), yang diperiksa server
-- Storage saat upload dan menolak file kebesaran dengan error yang jelas.
-- Perlindungan XSS (SEC-12) TETAP: syarat mimetype (hanya jpeg/png/webp)
-- dipertahankan di INSERT maupun UPDATE, sehingga file HTML/JS/SVG tetap
-- ditolak. Batas ukuran yang sama (1 MB) dipertahankan lewat bucket.
--
-- Idempotent. Diterapkan live 2026-11-18 via SQL Editor.
-- ============================================================

-- INSERT article-images: tanpa syarat size
drop policy if exists "author upload article-images" on storage.objects;
create policy "author upload article-images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'article-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (metadata->>'mimetype') in ('image/jpeg', 'image/png', 'image/webp'));

-- INSERT listing-photos: tanpa syarat size
drop policy if exists "seller upload listing-photos" on storage.objects;
create policy "seller upload listing-photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (metadata->>'mimetype') in ('image/jpeg', 'image/png', 'image/webp'));

-- UPDATE article-images: tanpa syarat size (USING tetap folder saja)
drop policy if exists "author update own article-images" on storage.objects;
create policy "author update own article-images" on storage.objects
  for update to authenticated
  using (bucket_id = 'article-images'
    and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'article-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (metadata->>'mimetype') in ('image/jpeg', 'image/png', 'image/webp'));

-- UPDATE listing-photos: tanpa syarat size
drop policy if exists "seller update own listing-photos" on storage.objects;
create policy "seller update own listing-photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (metadata->>'mimetype') in ('image/jpeg', 'image/png', 'image/webp'));

-- Batas ukuran 1 MB ditegakkan server Storage di tingkat bucket.
update storage.buckets set file_size_limit = 1048576
  where id in ('article-images', 'listing-photos');
