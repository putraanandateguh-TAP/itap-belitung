-- ============================================================
-- license-legacy-migration.sql — Grandfathering 21 kode FULL lama
-- (Workstream B). JANGAN jalankan ke production tanpa membaca
-- web/docs/LICENSE.md bagian "Migrasi kode lama".
--
-- ASAL: generator/lock.js di branch main (21 hash SHA-256 TANPA salt,
-- repo publik) + kasir/lock.js (1 hash owner — SAMA dengan hash pertama
-- generator, jadi kode itu membuka generator DAN kasir).
--
-- SIFAT FILE INI:
--   * Berisi hash lama APA ADANYA (sudah publik di main) — BUKAN kode
--     plaintext (plaintext kode lama TIDAK diketahui siapa pun kecuali
--     pemiliknya; hash ini tidak bisa dibalik tanpa brute-force).
--   * File ini TIDAK berada di web/drizzle/ dengan sengaja: scripts/
--     migrate.ts menjalankan semua *.sql di sana, dan migrasi ini
--     HANYA boleh jalan manual di Supabase SQL Editor setelah 0004,
--     setelah Teguh menyetujui.
--   * Baris yang dibuat: origin='legacy', status='active', plan=
--     'lifetime', product='generator' (21 baris) + 1 baris product=
--     'kasir' untuk hash yang sama dengan owner Kasir.
--   * lookup_hash diisi 'legacy-<hash>' (tidak akan cocok dengan jalur
--     salted — Edge Function validate-license memakai jalur legacy
--     lewat legacy_code_hash). salt/code_hash diisi placeholder yang
--     TIDAK PERNAH lolos verifikasi salted (salt nol + code_hash =
--     hash lama); verifikasi legacy hanya membandingkan
--     SHA-256(kode) dengan legacy_code_hash.
--
-- RENCANA RE-ISSUE (wajib — lihat LICENSE.md):
--   1. Jalankan file ini (manual, SQL Editor) -> kode lama tetap jalan.
--   2. Admin menerbitkan kode BARU (salted) via POST /api/license/admin
--      { action:"create" } untuk setiap pembeli lama yang teridentifikasi.
--   3. Sampaikan kode baru ke pembeli lewat WA/email; minta aktivasi ulang.
--   4. Setelah semua pembeli teridentifikasi beralih (atau tenggat yang
--      diputuskan Teguh, mis. 90 hari), jalankan:
--        update public.licenses set status='revoked',
--          revoke_reason='legacy retired'
--        where origin='legacy';
--      Lalu hapus generator/lock.js + kasir/lock.js dari main.
-- ============================================================

-- Prasyarat: migrasi 0004 sudah diterapkan.

insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-999e1ee161bc13ba72150e76cf3800b5250fe977cca9f36da81a55a5e2c110df', '00000000000000000000000000000000', '999e1ee161bc13ba72150e76cf3800b5250fe977cca9f36da81a55a5e2c110df', 'generator', 'lifetime', 'active', 'legacy', '999e1ee161bc13ba72150e76cf3800b5250fe977cca9f36da81a55a5e2c110df', 3)
  on conflict (lookup_hash) do nothing;
insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-9a73d2ed0d71b89d6bde301a7aebbdd76a56f4497ea894beb05cc20bb53e48d6', '00000000000000000000000000000000', '9a73d2ed0d71b89d6bde301a7aebbdd76a56f4497ea894beb05cc20bb53e48d6', 'generator', 'lifetime', 'active', 'legacy', '9a73d2ed0d71b89d6bde301a7aebbdd76a56f4497ea894beb05cc20bb53e48d6', 3)
  on conflict (lookup_hash) do nothing;
insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-5460920d583552746ac176d26cfebe29278260f0d4e08f0bb9d79867f889c810', '00000000000000000000000000000000', '5460920d583552746ac176d26cfebe29278260f0d4e08f0bb9d79867f889c810', 'generator', 'lifetime', 'active', 'legacy', '5460920d583552746ac176d26cfebe29278260f0d4e08f0bb9d79867f889c810', 3)
  on conflict (lookup_hash) do nothing;
insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-ae994138899d7c766180a2210e7fca3c78348c357ff8d18cb2f817d2b5742748', '00000000000000000000000000000000', 'ae994138899d7c766180a2210e7fca3c78348c357ff8d18cb2f817d2b5742748', 'generator', 'lifetime', 'active', 'legacy', 'ae994138899d7c766180a2210e7fca3c78348c357ff8d18cb2f817d2b5742748', 3)
  on conflict (lookup_hash) do nothing;
insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-0d20b84588cc1afc00589d326509940982e807461c625b7db4fe3526097ad324', '00000000000000000000000000000000', '0d20b84588cc1afc00589d326509940982e807461c625b7db4fe3526097ad324', 'generator', 'lifetime', 'active', 'legacy', '0d20b84588cc1afc00589d326509940982e807461c625b7db4fe3526097ad324', 3)
  on conflict (lookup_hash) do nothing;
insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-8c8ea3555c0a5581a8abfe2adbf29070eaf7412529a386596febdef4de83df2f', '00000000000000000000000000000000', '8c8ea3555c0a5581a8abfe2adbf29070eaf7412529a386596febdef4de83df2f', 'generator', 'lifetime', 'active', 'legacy', '8c8ea3555c0a5581a8abfe2adbf29070eaf7412529a386596febdef4de83df2f', 3)
  on conflict (lookup_hash) do nothing;
insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-f1deb7fb181f5a13751208de869b5e799f9bb973cd679566fb4a146f413f2e1b', '00000000000000000000000000000000', 'f1deb7fb181f5a13751208de869b5e799f9bb973cd679566fb4a146f413f2e1b', 'generator', 'lifetime', 'active', 'legacy', 'f1deb7fb181f5a13751208de869b5e799f9bb973cd679566fb4a146f413f2e1b', 3)
  on conflict (lookup_hash) do nothing;
insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-350ffe71ac74405ffcc1000197e8dc723ad9f649a7683abb0f2dd5cb0c23ece7', '00000000000000000000000000000000', '350ffe71ac74405ffcc1000197e8dc723ad9f649a7683abb0f2dd5cb0c23ece7', 'generator', 'lifetime', 'active', 'legacy', '350ffe71ac74405ffcc1000197e8dc723ad9f649a7683abb0f2dd5cb0c23ece7', 3)
  on conflict (lookup_hash) do nothing;
insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-b234907c31ff697b6f9d1f8681a08c1359baa5ea27d2b1cfbd48dd0959798be5', '00000000000000000000000000000000', 'b234907c31ff697b6f9d1f8681a08c1359baa5ea27d2b1cfbd48dd0959798be5', 'generator', 'lifetime', 'active', 'legacy', 'b234907c31ff697b6f9d1f8681a08c1359baa5ea27d2b1cfbd48dd0959798be5', 3)
  on conflict (lookup_hash) do nothing;
insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-48e2a7fb1b115ed22cb1b326b80c01a0d56b6d8e05130fdec2dfb3751a863690', '00000000000000000000000000000000', '48e2a7fb1b115ed22cb1b326b80c01a0d56b6d8e05130fdec2dfb3751a863690', 'generator', 'lifetime', 'active', 'legacy', '48e2a7fb1b115ed22cb1b326b80c01a0d56b6d8e05130fdec2dfb3751a863690', 3)
  on conflict (lookup_hash) do nothing;
insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-f79691fdd10b1aaa481406d4f5c3a3dddef69e3b123fb332152666d1de235865', '00000000000000000000000000000000', 'f79691fdd10b1aaa481406d4f5c3a3dddef69e3b123fb332152666d1de235865', 'generator', 'lifetime', 'active', 'legacy', 'f79691fdd10b1aaa481406d4f5c3a3dddef69e3b123fb332152666d1de235865', 3)
  on conflict (lookup_hash) do nothing;
insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-6f2c6a7c2a25f181238144b03a62583ce47df95094dafcee66e4e73a6ef9a564', '00000000000000000000000000000000', '6f2c6a7c2a25f181238144b03a62583ce47df95094dafcee66e4e73a6ef9a564', 'generator', 'lifetime', 'active', 'legacy', '6f2c6a7c2a25f181238144b03a62583ce47df95094dafcee66e4e73a6ef9a564', 3)
  on conflict (lookup_hash) do nothing;
insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-fe53454ce2eb3fc902685dc8080f0c51b8a661d74913b7a2115a2646e5d6e432', '00000000000000000000000000000000', 'fe53454ce2eb3fc902685dc8080f0c51b8a661d74913b7a2115a2646e5d6e432', 'generator', 'lifetime', 'active', 'legacy', 'fe53454ce2eb3fc902685dc8080f0c51b8a661d74913b7a2115a2646e5d6e432', 3)
  on conflict (lookup_hash) do nothing;
insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-dffe3a941cfc4c71944cc6fc73090207f7c0d839b9dfe9a3289e04f36ec797f5', '00000000000000000000000000000000', 'dffe3a941cfc4c71944cc6fc73090207f7c0d839b9dfe9a3289e04f36ec797f5', 'generator', 'lifetime', 'active', 'legacy', 'dffe3a941cfc4c71944cc6fc73090207f7c0d839b9dfe9a3289e04f36ec797f5', 3)
  on conflict (lookup_hash) do nothing;
insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-490fbcfda89bcf7472bc3c7ac5c8674bcf0da56f888ac7efe47da3083f371b10', '00000000000000000000000000000000', '490fbcfda89bcf7472bc3c7ac5c8674bcf0da56f888ac7efe47da3083f371b10', 'generator', 'lifetime', 'active', 'legacy', '490fbcfda89bcf7472bc3c7ac5c8674bcf0da56f888ac7efe47da3083f371b10', 3)
  on conflict (lookup_hash) do nothing;
insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-8be876b0b47e74414643c6199cc2ccb45fc7b342b2c9bce78f7d29e8de3d3a10', '00000000000000000000000000000000', '8be876b0b47e74414643c6199cc2ccb45fc7b342b2c9bce78f7d29e8de3d3a10', 'generator', 'lifetime', 'active', 'legacy', '8be876b0b47e74414643c6199cc2ccb45fc7b342b2c9bce78f7d29e8de3d3a10', 3)
  on conflict (lookup_hash) do nothing;
insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-f33b4aafacc77a50b110e18af3bb3b4ccaea5218ba01889557aee340d121f9fe', '00000000000000000000000000000000', 'f33b4aafacc77a50b110e18af3bb3b4ccaea5218ba01889557aee340d121f9fe', 'generator', 'lifetime', 'active', 'legacy', 'f33b4aafacc77a50b110e18af3bb3b4ccaea5218ba01889557aee340d121f9fe', 3)
  on conflict (lookup_hash) do nothing;
insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-40ba6daf8018bfb19a0f8a606096b7721bccb638337bb48279c965dddbf83899', '00000000000000000000000000000000', '40ba6daf8018bfb19a0f8a606096b7721bccb638337bb48279c965dddbf83899', 'generator', 'lifetime', 'active', 'legacy', '40ba6daf8018bfb19a0f8a606096b7721bccb638337bb48279c965dddbf83899', 3)
  on conflict (lookup_hash) do nothing;
insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-0ad442205b6fd911cff7a7ff804941637bbf209aa70f6fb0a3dfd36aaef6187f', '00000000000000000000000000000000', '0ad442205b6fd911cff7a7ff804941637bbf209aa70f6fb0a3dfd36aaef6187f', 'generator', 'lifetime', 'active', 'legacy', '0ad442205b6fd911cff7a7ff804941637bbf209aa70f6fb0a3dfd36aaef6187f', 3)
  on conflict (lookup_hash) do nothing;
insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-ce0c1b4a5fad27952103cc09a85bd3f801a2626661b11415680bc879b938e890', '00000000000000000000000000000000', 'ce0c1b4a5fad27952103cc09a85bd3f801a2626661b11415680bc879b938e890', 'generator', 'lifetime', 'active', 'legacy', 'ce0c1b4a5fad27952103cc09a85bd3f801a2626661b11415680bc879b938e890', 3)
  on conflict (lookup_hash) do nothing;
insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-bad5ba0ac13e3d8eb4ff40201dba7dd27103c9f2db4986636c9fa6e98c66ba45', '00000000000000000000000000000000', 'bad5ba0ac13e3d8eb4ff40201dba7dd27103c9f2db4986636c9fa6e98c66ba45', 'generator', 'lifetime', 'active', 'legacy', 'bad5ba0ac13e3d8eb4ff40201dba7dd27103c9f2db4986636c9fa6e98c66ba45', 3)
  on conflict (lookup_hash) do nothing;
insert into public.licenses (lookup_hash, salt, code_hash, product, plan, status, origin, legacy_code_hash, max_devices)
  values ('legacy-kasir-999e1ee161bc13ba72150e76cf3800b5250fe977cca9f36da81a55a5e2c110df', '00000000000000000000000000000000', '999e1ee161bc13ba72150e76cf3800b5250fe977cca9f36da81a55a5e2c110df', 'kasir', 'lifetime', 'active', 'legacy', '999e1ee161bc13ba72150e76cf3800b5250fe977cca9f36da81a55a5e2c110df', 3)
  on conflict (lookup_hash) do nothing;
