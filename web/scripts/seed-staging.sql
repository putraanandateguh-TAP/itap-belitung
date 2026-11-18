-- ============================================================
-- seed-staging.sql — DATA DUMMY untuk environment STAGING SAJA.
-- (Workstream E — Staging + black-box test suite.)
--
-- JALANKAN HANYA di proyek Supabase STAGING (itap-belitung-staging).
-- JANGAN PERNAH jalankan di proyek production `itap-belitung`.
-- menolak STAGING_DATABASE_URL yang mengandung ref production.
--
-- PRASYARAT (lihat web/docs/STAGING.md §3):
--   1. Migrasi 0001–0003 (replica/itap-satam) + 0004 lisensi
--      server-side (PR #24, branch feat/license-server-side) SUDAH
--      jalan di staging. Tanpa 0004, bagian lisensi di bawah GAGAL.
--   2. Tiga akun test SUDAH dibuat di Supabase Auth staging
--      (admin / buyer / reader) dan profilnya ada. GANTI tiga UUID
--      di DECLARE di bawah dengan id auth.users ASLI dari staging.
--      UUID default di bawah ini HANYA placeholder — seed akan
--      GAGAL (foreign key) bila akun test belum dibuat.
--   3. Pepper Edge Function staging HARUS
--      'staging-pepper-dummy-0123456789abcdef' (nilai dummy, BUKAN
--      pepper production). Hash lisensi di bawah dihitung dari
--      pepper dummy itu:
--        lookup_hash = SHA-256(pepper || kode_ternormalisasi)
--        code_hash   = SHA-256(salt || pepper || kode_ternormalisasi)
--      Bila pepper staging diganti, hitung ulang hash-nya
--      (cek otomatis: npm run test:seed-staging).
--
-- ISI: 2 kategori, 3 artikel, 3 listing, 7 lisensi — SEMUA dummy,
-- berlabel [STAGING-TEST], email *.staging-test.invalid.
-- TIDAK ADA data asli, TIDAK ADA password/kunci asli di file ini.
-- Idempotent: aman dijalankan ulang (ON CONFLICT DO NOTHING).
-- ============================================================

DO $$
DECLARE
  -- >>> GANTI tiga UUID ini dengan id akun test staging (auth.users) <<<
  v_admin_id  uuid := '11111111-1111-4111-8111-111111111111'; -- STAGING_ADMIN_ID
  v_buyer_id  uuid := '22222222-2222-4222-8222-222222222222'; -- STAGING_BUYER_ID
  v_reader_id uuid := '33333333-3333-4333-8333-333333333333'; -- STAGING_READER_ID
  v_cat_wisata  uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_cat_kuliner uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
BEGIN
  -- Pastikan baris profiles ada untuk ketiga akun test
  -- (biasanya sudah dibuat trigger signup; ini hanya pengaman).
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES
    (v_admin_id,  'admin.staging-test@staging-test.invalid',  'Admin Staging Test',  'superadmin'),
    (v_buyer_id,  'buyer.staging-test@staging-test.invalid',  'Pembeli Staging Test', 'reader'),
    (v_reader_id, 'reader.staging-test@staging-test.invalid', 'Pembaca Staging Test', 'reader')
  ON CONFLICT (id) DO NOTHING;

  -- ---------- Kategori dummy ----------
  INSERT INTO public.categories (id, channel, name_id, name_en, slug)
  VALUES
    (v_cat_wisata,  'wisata',  '[STAGING-TEST] Wisata Dummy',  'Dummy Tourism',  'staging-test-wisata'),
    (v_cat_kuliner, 'kuliner', '[STAGING-TEST] Kuliner Dummy', 'Dummy Culinary', 'staging-test-kuliner')
  ON CONFLICT DO NOTHING;

  -- ---------- Artikel dummy ----------
  INSERT INTO public.articles
    (id, author_id, category_id, channel, slug, title_id, title_en, body_id, body_en,
     gallery, location_name, source, status, published_at, views)
  VALUES
    ('aaaaaaaa-0001-4000-8000-000000000001', v_admin_id, v_cat_wisata, 'wisata',
     'staging-test-pantai-dummy', '[STAGING-TEST] Pantai Dummy',
     'Dummy Beach', 'Paragraf pertama artikel dummy staging. Paragraf kedua artikel dummy staging.',
     'Dummy article body.', '[]'::jsonb, 'Pantai Dummy', 'seed-staging', 'published', now(), 0),
    ('aaaaaaaa-0002-4000-8000-000000000002', v_admin_id, v_cat_kuliner, 'kuliner',
     'staging-test-mie-dummy', '[STAGING-TEST] Mie Dummy',
     'Dummy Noodles', 'Paragraf pertama artikel kuliner dummy staging. Paragraf kedua artikel kuliner dummy staging.',
     'Dummy culinary article body.', '[]'::jsonb, 'Warung Dummy', 'seed-staging', 'published', now(), 0),
    ('aaaaaaaa-0003-4000-8000-000000000003', v_admin_id, v_cat_wisata, 'wisata',
     'staging-test-draf-dummy', '[STAGING-TEST] Draf Dummy',
     'Dummy Draft', 'Draf artikel dummy staging yang belum terbit. Isi draf dummy staging.',
     'Dummy draft body.', '[]'::jsonb, NULL, 'seed-staging', 'draft', NULL, 0)
  ON CONFLICT (id) DO NOTHING;

  -- ---------- Listing dummy (marketplace) ----------
  INSERT INTO public.listings
    (id, seller_id, title, description, price_cents, currency, location_name, status)
  VALUES
    ('bbbbbbbb-0001-4000-8000-000000000001', v_buyer_id, '[STAGING-TEST] Sepeda Bekas Dummy',
     'Listing dummy staging: sepeda bekas, kondisi dummy.', 50000000, 'IDR', 'Tanjungpandan Dummy', 'aktif'),
    ('bbbbbbbb-0002-4000-8000-000000000002', v_buyer_id, '[STAGING-TEST] Kain Cual Dummy',
     'Listing dummy staging: kain cual motif dummy.', 25000000, 'IDR', 'Tanjungpandan Dummy', 'aktif'),
    ('bbbbbbbb-0003-4000-8000-000000000003', v_reader_id, '[STAGING-TEST] Buku Bekas Dummy (Terjual)',
     'Listing dummy staging: buku bekas, sudah terjual.', 7500000, 'IDR', 'Manggar Dummy', 'terjual')
  ON CONFLICT (id) DO NOTHING;

  -- ---------- Lisensi dummy ----------
  -- Kode plaintext (dummy, staging saja — TIDAK PERNAH dipakai di production):
  --   ITAP-TEST-VALD-0001  generator lifetime, aktif, max_devices 3
  --   ITAP-TEST-EXPR-0002  generator monthly, status expired
  --   ITAP-TEST-RVKD-0003  generator lifetime, status revoked
  --   ITAP-TEST-DVCE-0004  generator lifetime, aktif, max_devices 1 (uji device limit)
  --   ITAP-TEST-KSR1-0005  kasir lifetime, aktif, max_devices 3
  --   ITAP-TEST-PAST-0006  generator lifetime, status AKTIF tapi expires_at sudah lewat
  --                         (uji cabang "tanggal kedaluwarsa" di Edge Function)
  --   ITAP-TEST-MNTH-0007  generator monthly, aktif, kedaluwarsa 30 hari lagi
  -- Hash dihitung dengan pepper staging dummy; JANGAN ubah hash tanpa
  -- menghitung ulang (lihat header file + npm run test:seed-staging).
  INSERT INTO public.licenses
    (id, lookup_hash, salt, code_hash, product, plan, status, origin,
     legacy_code_hash, expires_at, max_devices, buyer_name, buyer_contact,
     issued_by, revoked_at, revoke_reason)
  VALUES
    ('cccccccc-0001-4000-8000-000000000001',
     'ab01664c7db5f0ac1f36953b1371271823df086b2a331085cdd265e877c71338',
     'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
     '36d08ce01f48fa79951344087673cb1fb35fda6d3695ea6cad9a7158964ba5b9',
     'generator', 'lifetime', 'active', 'issued', NULL, NULL, 3,
     'Pembeli Dummy (staging)', 'buyer.staging-test@staging-test.invalid', NULL, NULL, NULL),
    ('cccccccc-0002-4000-8000-000000000002',
     '924d6903f9ed2ab55307997f0831864836ae4ea9bc7d2a90f7c2fd49a4400a6c',
     'b1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
     '3825ea129ef3363859f1a5312416f504986752e54df2725a23e2e24d8ca5a49f',
     'generator', 'monthly', 'expired', 'issued', NULL, now() - interval '30 days', 3,
     'Pembeli Dummy Kedaluwarsa (staging)', 'buyer.staging-test@staging-test.invalid', NULL, NULL, NULL),
    ('cccccccc-0003-4000-8000-000000000003',
     '378137e0187dfb6e38ddeab5ae76a2b34f0047a4fadad0ef98498ca25d47a633',
     'c1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
     '4e7b60508260cb861d8cba8ada2e17d6ab91aad4d17f9ef5e57c1b4d1858b321',
     'generator', 'lifetime', 'revoked', 'issued', NULL, NULL, 3,
     'Pembeli Dummy Dicabut (staging)', 'buyer.staging-test@staging-test.invalid', NULL,
     now() - interval '1 day', 'dicabut untuk uji staging'),
    ('cccccccc-0004-4000-8000-000000000004',
     'b003b3b464d0562580c7e862f0186e046e85026dd0b6f555459f18ce533bbcea',
     'd1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
     '49d3482802930985cb7bdc44da86855fa9e1a70666404914f6b5c5106feef72d',
     'generator', 'lifetime', 'active', 'issued', NULL, NULL, 1,
     'Pembeli Dummy Device-Limit (staging)', 'buyer.staging-test@staging-test.invalid', NULL, NULL, NULL),
    ('cccccccc-0005-4000-8000-000000000005',
     'e9a86e4a7602927377d96dd95317cc190c868a16d57fe2dd70072ae797aad5a1',
     'e1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
     'cd6cc70060916b9102418e12c77b74f0ebe3fc95d1e8441085ae1048e0694dd4',
     'kasir', 'lifetime', 'active', 'issued', NULL, NULL, 3,
     'Pembeli Dummy Kasir (staging)', 'buyer.staging-test@staging-test.invalid', NULL, NULL, NULL),
    ('cccccccc-0006-4000-8000-000000000006',
     '0507e7ecf9d81445c7148445e71f51739ede6c73e3d446a9bf1a6c779fc38386',
     'f1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
     '7aaf46034da21d88b20eabb5d5ff6f569b21fdf650d291f9822ddbf594647f08',
     'generator', 'lifetime', 'active', 'issued', NULL, now() - interval '1 day', 3,
     'Pembeli Dummy Lewat-Tanggal (staging)', 'buyer.staging-test@staging-test.invalid', NULL, NULL, NULL),
    ('cccccccc-0007-4000-8000-000000000007',
     '3ba119fa61269a7f5ad5fdc16453b9cf79b2a79b0a13f319c645a8fa4a5181c5',
     '1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d',
     '6fd1e9e8ba1366832995cbc0d8e21be8d68f01a2d7635129169442e6d709a175',
     'generator', 'monthly', 'active', 'issued', NULL, now() + interval '30 days', 3,
     'Pembeli Dummy Bulanan (staging)', 'buyer.staging-test@staging-test.invalid', NULL, NULL, NULL)
  ON CONFLICT (lookup_hash) DO NOTHING;
END $$;

-- Ringkasan isi seed (untuk pengecekan cepat setelah jalan):
--   select 'kategori' as tabel, count(*) from public.categories where slug like 'staging-test-%'
--   union all select 'artikel', count(*) from public.articles where slug like 'staging-test-%'
--   union all select 'listing', count(*) from public.listings where title like '[STAGING-TEST]%'
--   union all select 'lisensi', count(*) from public.licenses where buyer_name like '%(staging)%';
-- Harus: kategori 2, artikel 3, listing 3, lisensi 7.
