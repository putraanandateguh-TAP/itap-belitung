-- 0008_security_fixes.sql — Perbaikan temuan audit keamanan penuh (SEC-01 s.d. SEC-20).
-- Jalankan di Supabase SQL Editor (proyek BARU itap-belitung) SETELAH 0007_license_server_side.sql.
-- Idempotent: aman dijalankan ulang (DROP IF EXISTS / CREATE OR REPLACE / guard DO).
-- Dasar: ~/workspace/master-exec/SECURITY-AUDIT-FULL.md §2 (21 temuan) + pembuktian live
-- pemilik 2026-11-18 ~20:03 WIB (SEC-01/SEC-02/SEC-03 TERBUKTI dieksploitasi sebelum perbaikan).
-- Prinsip: RLS/trigger membatasi permukaan PostgREST langsung. Jalur server tepercaya
-- (Drizzle via DATABASE_URL sebagai peran postgres, dan PostgREST service_role) tetap
-- diizinkan — dikenali lewat current_user IN ('postgres','service_role'). Jalur itu
-- TIDAK bisa dipakai dari browser karena kuncinya tidak pernah ke frontend.
-- SEC-09 (koordinat penjual terbaca anon) TIDAK diubah di sini — menunggu keputusan
-- pemilik (opsi ada di matriks audit). SEC-06 (whatsapp-otp) diperbaiki di KODE
-- (supabase/functions/whatsapp-otp) + migrasi 0009_whatsapp_otps.sql, bukan di sini.

-- ============================================================
-- SEC-01 (TINGGI, TERBUKTI LIVE): pengguna baru INSERT profil role='superadmin'.
-- Lapisan 1: policy hanya mengizinkan INSERT dengan role='reader'.
-- Lapisan 2: trigger BEFORE INSERT memaksa role='reader' untuk pemanggil
--   PostgREST biasa; jalur server (postgres/service_role) dibiarkan apa adanya.
-- ============================================================
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid() and role = 'reader');

create or replace function public.profiles_insert_role_guard()
returns trigger language plpgsql as $$
begin
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;
  -- Pemanggil PostgREST biasa (authenticated): paksa reader, apa pun yang diminta.
  new.role := 'reader';
  return new;
end;
$$;
drop trigger if exists profiles_insert_role_guard on public.profiles;
create trigger profiles_insert_role_guard before insert on public.profiles
  for each row execute function public.profiles_insert_role_guard();

-- ============================================================
-- SEC-02 (TINGGI, TERBUKTI LIVE): admin_portal UPDATE role sendiri -> superadmin.
-- Trigger lama hanya memeriksa "pelaku adalah admin". Trigger baru:
-- superadmin boleh mengubah role siapa pun; admin_portal hanya boleh mengubah
-- role PENGGUNA LAIN (bukan dirinya sendiri) dan TIDAK BOLEH menetapkan superadmin;
-- reader/contributor tidak boleh mengubah role sama sekali.
-- Jalur server (postgres/service_role) tetap diizinkan (route admin via Drizzle).
-- ============================================================
create or replace function public.profiles_role_guard()
returns trigger language plpgsql as $$
declare
  actor_role text;
begin
  if new.role is distinct from old.role then
    if current_user in ('postgres', 'service_role') then
      return new;
    end if;
    actor_role := coalesce(public.current_user_role(), 'reader');
    if actor_role = 'superadmin' then
      return new;
    end if;
    if actor_role = 'admin_portal'
       and old.id <> auth.uid()
       and new.role <> 'superadmin' then
      return new;
    end if;
    raise exception 'role hanya bisa diubah superadmin';
  end if;
  return new;
end;
$$;
-- Trigger profiles_role_guard (before update of role) sudah ada di 0001; fungsi
-- di atas diganti (CREATE OR REPLACE) sehingga trigger lama otomatis memakai logika baru.

-- ============================================================
-- SEC-05 (SEDANG): UPDATE whatsapp_verified_at / marketplace_rules_accepted_at
-- sendiri via PostgREST (pemalsuan sinyal verifikasi). Hanya server (postgres /
-- service_role — Edge Function OTP + route aplikasi) dan admin yang boleh
-- mengubah kedua kolom itu. Kolom profil biasa (display_name, bahasa, lokasi)
-- tetap bisa diubah pemiliknya.
-- ============================================================
create or replace function public.profiles_sensitive_columns_guard()
returns trigger language plpgsql as $$
begin
  if new.whatsapp_verified_at is distinct from old.whatsapp_verified_at
     or new.marketplace_rules_accepted_at is distinct from old.marketplace_rules_accepted_at then
    if current_user in ('postgres', 'service_role') then
      return new;
    end if;
    if coalesce(public.current_user_role(), 'reader') in ('admin_portal', 'superadmin') then
      return new;
    end if;
    raise exception 'kolom verifikasi hanya bisa diubah server/admin';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_sensitive_columns_guard on public.profiles;
create trigger profiles_sensitive_columns_guard before update on public.profiles
  for each row execute function public.profiles_sensitive_columns_guard();

-- ============================================================
-- SEC-03 (TINGGI, TERBUKTI LIVE): RPC award_contribution_point (SECURITY DEFINER)
-- bisa dipanggil siapa pun termasuk anon -> poin dicetak bebas.
-- (a) Cabut EXECUTE dari PUBLIC; beri hanya ke service_role (Edge Function/cron).
--     Jalur aplikasi sah memanggil via Drizzle (peran postgres) — tidak terpengaruh.
-- (b) Keraskan badan fungsi: poin hanya diberikan bila karya sumber benar-benar
--     disetujui (artikel status='published', info status='approved').
-- ============================================================
create or replace function public.award_contribution_point(
  p_user_id uuid, p_source_type contribution_source, p_source_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_source_type = 'article' then
    if not exists (select 1 from public.articles
                    where id = p_source_id and status = 'published') then
      return;
    end if;
  elsif p_source_type = 'info' then
    if not exists (select 1 from public.info_submissions
                    where id = p_source_id and status = 'approved') then
      return;
    end if;
  end if;
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
revoke execute on function public.award_contribution_point(uuid, contribution_source, uuid) from public;
grant execute on function public.award_contribution_point(uuid, contribution_source, uuid) to service_role;

-- ============================================================
-- SEC-14 (RENDAH): RPC increment_article_views / increment_listing_views
-- (SECURITY DEFINER) bisa dipanggil siapa pun -> inflasi views.
-- Jalur aplikasi sah memanggil via Drizzle (peran postgres) — tidak terpengaruh.
-- Cabut dari PUBLIC; beri hanya ke service_role.
-- ============================================================
revoke execute on function public.increment_article_views(uuid) from public;
revoke execute on function public.increment_listing_views(uuid) from public;
grant execute on function public.increment_article_views(uuid) to service_role;
grant execute on function public.increment_listing_views(uuid) to service_role;

-- ============================================================
-- SEC-04 (SEDANG): contributor_profiles — INSERT/UPDATE verification_status,
-- auto_approve, points_total oleh pemilik sendiri (pemalsuan status terverifikasi).
-- Trigger: pemanggil biasa dipaksa ke nilai default saat INSERT dan dilarang
-- mengubah ketiga kolom itu saat UPDATE. Admin + jalur server (postgres /
-- service_role, termasuk RPC award_contribution_point) tetap diizinkan.
-- ============================================================
create or replace function public.contributor_profile_guard()
returns trigger language plpgsql as $$
begin
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;
  if coalesce(public.current_user_role(), 'reader') in ('admin_portal', 'superadmin') then
    return new;
  end if;
  -- CATATAN: TG_OP bernilai HURUF BESAR ('INSERT'/'UPDATE'). Perbandingan
  -- 'insert' (huruf kecil) SELALU salah dan membuat INSERT jatuh ke cabang
  -- UPDATE — bug ini tertangkap uji PGlite 2026-11-18 dan sudah diperbaiki.
  if tg_op = 'INSERT' then
    new.verification_status := 'unverified';
    new.auto_approve := false;
    new.points_total := 0;
    return new;
  end if;
  if new.verification_status is distinct from old.verification_status
     or new.auto_approve is distinct from old.auto_approve
     or new.points_total is distinct from old.points_total then
    raise exception 'kolom verifikasi/poin hanya bisa diubah admin';
  end if;
  return new;
end;
$$;
drop trigger if exists contributor_profile_guard on public.contributor_profiles;
create trigger contributor_profile_guard before insert or update on public.contributor_profiles
  for each row execute function public.contributor_profile_guard();

-- ============================================================
-- SEC-07 (SEDANG): info_submissions INSERT dengan status='approved' (bypass moderasi).
-- Samakan dengan comments_insert: hanya 'pending' yang boleh dibuat pengguna.
-- (Aplikasi membuat kiriman via Drizzle sebagai postgres — tidak terpengaruh.)
-- ============================================================
drop policy if exists info_insert on public.info_submissions;
create policy info_insert on public.info_submissions for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

-- ============================================================
-- SEC-08 (SEDANG): reports INSERT dengan status/moderator bebas (polusi antrean).
-- Laporan baru harus status='open' tanpa moderator dan tanpa catatan moderator.
-- (Aplikasi membuat laporan via Drizzle sebagai postgres — tidak terpengaruh.)
-- ============================================================
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid()
              and status = 'open'
              and moderator_id is null
              and moderator_note is null);

-- ============================================================
-- SEC-10 (SEDANG): chat_threads INSERT dengan seller_id sembarang (bukan
-- penjual listing). Dua lapis:
-- (a) Policy memakai bentuk skalar — JANGAN pakai EXISTS dengan `seller_id`
--     tanpa kualifikasi di dalam subquery: `seller_id` di sana terikat ke
--     kolom listings.seller_id (lingkup dalam), sehingga EXISTS selalu benar.
--     Bentuk skalar ini tidak ambigu: subquery mengembalikan penjual listing,
--     lalu dibandingkan dengan seller_id baris baru di luar subquery.
-- (b) Trigger thread_listing_active_guard diperkuat: selain listing aktif,
--     seller thread harus sama dengan penjual listing.
-- (Aplikasi membuat thread via Drizzle sebagai postgres — tidak terpengaruh.)
-- ============================================================
drop policy if exists threads_insert on public.chat_threads;
create policy threads_insert on public.chat_threads for insert to authenticated
  with check (buyer_id = auth.uid()
              and seller_id <> auth.uid()
              and (select l.seller_id from public.listings l
                    where l.id = listing_id) = seller_id);

create or replace function public.thread_listing_active_guard()
returns trigger language plpgsql as $$
declare
  st listing_status;
  actual_seller uuid;
begin
  select status, seller_id into st, actual_seller from public.listings where id = new.listing_id;
  if st is distinct from 'aktif' then
    raise exception 'thread hanya bisa dibuat untuk listing aktif';
  end if;
  if actual_seller is distinct from new.seller_id then
    raise exception 'seller thread harus penjual listing';
  end if;
  return new;
end;
$$;
-- Trigger chat_threads_listing_active (before insert) sudah ada di 0001;
-- CREATE OR REPLACE di atas membuat trigger lama memakai logika baru.

-- ============================================================
-- SEC-15 (RENDAH): article_revisions INSERT untuk artikel mana pun.
-- Editor harus penulis artikel itu, atau admin.
-- (Aplikasi menulis revisi via Drizzle sebagai postgres — tidak terpengaruh.)
-- ============================================================
drop policy if exists article_revisions_insert on public.article_revisions;
create policy article_revisions_insert on public.article_revisions for insert to authenticated
  with check ((editor_id = auth.uid()
               and exists (select 1 from public.articles a
                            where a.id = article_id and a.author_id = auth.uid()))
              or public.current_user_role() in ('admin_portal', 'superadmin'));

-- ============================================================
-- SEC-16 (RENDAH): penjual UPDATE counter views/saves_count/likes_count
-- listingnya sendiri via PostgREST. Trigger: perubahan ketiga kolom itu hanya
-- boleh dari jalur server (postgres — termasuk RPC increment_listing_views —
-- dan service_role). Update kolom lain oleh penjual tetap diizinkan.
-- ============================================================
create or replace function public.listings_counters_guard()
returns trigger language plpgsql as $$
begin
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;
  if new.views is distinct from old.views
     or new.saves_count is distinct from old.saves_count
     or new.likes_count is distinct from old.likes_count then
    raise exception 'counter listing hanya bisa diubah server';
  end if;
  return new;
end;
$$;
drop trigger if exists listings_counters_guard on public.listings;
create trigger listings_counters_guard before update on public.listings
  for each row execute function public.listings_counters_guard();

-- ============================================================
-- SEC-17 (RENDAH): profiles.email tanpa UNIQUE. Tambah constraint bila belum
-- ada dan tidak ada duplikat (bila ada duplikat, blok ini diam-diam tidak
-- menambah constraint — bersihkan duplikat dulu, lalu jalankan ulang).
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_email_unique')
     and not exists (select 1 from public.profiles group by email having count(*) > 1) then
    alter table public.profiles add constraint profiles_email_unique unique (email);
  end if;
end $$;

-- ============================================================
-- SEC-12 (SEDANG): Storage — upload file tipe/ukuran sembarang (termasuk HTML)
-- ke bucket publik via Storage API langsung. Perketat policy INSERT kedua
-- bucket: hanya JPEG/PNG/WebP, ukuran 1..1048576 byte (samakan UPLOAD_LIMITS
-- di src/lib/upload.ts). Metadata (mimetype/size) diisi server Storage saat
-- upload, sehingga tersedia saat policy dievaluasi.
-- UJI LIVE WAJIB: upload gambar sah harus tetap lolos; upload .html harus ditolak.
-- ============================================================
drop policy if exists "author upload article-images" on storage.objects;
create policy "author upload article-images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'article-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (metadata->>'mimetype') in ('image/jpeg', 'image/png', 'image/webp')
    and (metadata->>'size')::bigint between 1 and 1048576);

drop policy if exists "seller upload listing-photos" on storage.objects;
create policy "seller upload listing-photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (metadata->>'mimetype') in ('image/jpeg', 'image/png', 'image/webp')
    and (metadata->>'size')::bigint between 1 and 1048576);

-- ============================================================
-- SEC-18 (RENDAH): tidak ada policy UPDATE pada storage.objects — pengguna
-- tidak bisa menimpa file miliknya sendiri (upsert=true ditolak). Tambah
-- policy UPDATE pemilik-sendiri untuk kedua bucket.
-- ============================================================
drop policy if exists "author update own article-images" on storage.objects;
create policy "author update own article-images" on storage.objects
  for update to authenticated
  using (bucket_id = 'article-images'
    and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'article-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (metadata->>'mimetype') in ('image/jpeg', 'image/png', 'image/webp')
    and (metadata->>'size')::bigint between 1 and 1048576);

drop policy if exists "seller update own listing-photos" on storage.objects;
create policy "seller update own listing-photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (metadata->>'mimetype') in ('image/jpeg', 'image/png', 'image/webp')
    and (metadata->>'size')::bigint between 1 and 1048576);

-- ============================================================
-- SEC-13 (SEDANG) + LIC-04: grant service_role point-in-time (0006).
-- Tabel baru (lisensi 0007, whatsapp_otps 0009, dan tabel apa pun sesudahnya)
-- tidak mendapat grant bila 0006 sudah lewat. Jalankan ulang grant ini di
-- akhir setiap migrasi yang menambah tabel. Idempotent.
-- ============================================================
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ============================================================
-- SEC-20 (RENDAH): grant sequence ke authenticated tidak dibutuhkan (semua
-- tabel memakai gen_random_uuid(); tidak ada kolom identity/serial). Cabut
-- agar nilai sequence tidak bisa dibaca pengguna biasa.
-- ============================================================
revoke usage, select on all sequences in schema public from authenticated;
