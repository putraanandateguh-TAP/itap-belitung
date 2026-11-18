-- ============================================================
-- 0007_license_server_side.sql — Validasi lisensi FULL server-side
-- (Workstream B — perbaikan temuan audit K1; port + perbaikan
-- LIC-02..LIC-08 dari PR #24 ke branch fix/security-sec-01-sec-14-license).
--
-- PENOMORAN: file ini 0007, BUKAN 0004 — 0004 sudah dipakai oleh
-- 0004_listing_category.sql di branch ini. Isi = migrasi lisensi
-- 0004 dari branch feat/license-server-side (PR #24) + perbaikan
-- LIC-02 (indeks unik legacy per produk), LIC-04 (GRANT mandiri),
-- LIC-07 (indeks unik partial aktivasi aktif). Lihat web/docs/LICENSE.md.
--
-- Masalah yang diperbaiki (situs lama, branch main):
--   * generator/lock.js menyimpan 21 hash SHA-256 TANPA salt di repo
--     publik; siapa pun bisa brute-force kode dan mencetak FULL gratis.
--   * kasir/lock.js menyimpan salt (KSALT) + algoritma pembuatan kode
--     (kMake/kSig) di client — siapa pun bisa mencetak kode KSR-* sendiri.
--   * Status FULL hanya flag localStorage (itap_full / itap_kasir_full /
--     itap_kasir_owner) — satu baris di DevTools mengaktifkan FULL.
--   * kasir/buatkode.html "khusus owner" hanya dicek dari flag
--     localStorage itap_kasir_owner — bukan otorisasi.
--   * akun/akun.js membaca tabel entitlements lalu MENULIS flag
--     localStorage — entitlement tetap diputuskan client-side.
--
-- Prinsip baru (fail-closed):
--   * Kode lisensi TIDAK PERNAH ada di repo/frontend. Yang disimpan:
--     lookup_hash = SHA-256(pepper || kode) untuk pencarian, dan
--     code_hash = SHA-256(salt || pepper || kode) dengan salt acak
--     per lisensi untuk verifikasi. Pepper (LICENSE_PEPPER) hanya ada
--     sebagai secret Edge Function — BUKAN di repo, BUKAN di .env
--     frontend, BUKAN di .env.example (hanya namanya).
--   * Hash/salt TIDAK BISA dibaca client: RLS menolak SELECT untuk
--     anon/authenticated pada licenses (hanya service role / Edge
--     Function yang bisa baca). User hanya melihat status lisensinya
--     sendiri lewat license_activations + endpoint entitlement.
--   * Frontend TIDAK menyimpan status FULL di localStorage. Entitlement
--     diambil dari server setiap kali dibutuhkan dan disimpan hanya di
--     memori (React state); error jaringan = tidak berhak (deny).
--   * Kode mentah, pepper, salt, dan service-role key TIDAK PERNAH
--     dicatat di license_audit_log / license_attempts — hanya hash
--     (lookup_hash / ip_hash) dan alasan generik.
--
-- Cara pakai: jalankan di Supabase SQL Editor proyek BARU
-- (itap-belitung) SETELAH 0001–0006, atau lewat scripts/migrate.ts.
-- TIDAK dijalankan ke database production oleh pekerjaan ini.
-- Migrasi legacy (web/docs/license-legacy-migration.sql) TIDAK termasuk
-- di sini dan JANGAN dijalankan — menunggu keputusan pemilik (LIC-01).
-- ============================================================

-- ---------- enums ----------
create type license_product as enum ('generator', 'kasir');
create type license_plan as enum ('lifetime', 'monthly', 'quarterly', 'yearly');
create type license_status as enum ('active', 'revoked', 'expired');
create type license_origin as enum ('issued', 'legacy');

-- ---------- 1. licenses ----------
-- Satu baris per kode lisensi yang diterbitkan admin.
-- `code` (plaintext) TIDAK DISIMPAN di mana pun.
create table public.licenses (
  id uuid primary key default gen_random_uuid(),
  -- Hash pencarian: SHA-256 hex (lowercase) dari pepper || kode
  -- ternormalisasi. Unik; dipakai Edge Function untuk menemukan baris
  -- tanpa tahu salt per-baris.
  lookup_hash text not null unique,
  -- Salt acak per lisensi (32 hex char = 16 byte). Dipakai untuk
  -- verifikasi: code_hash = SHA-256(salt || pepper || kode).
  salt text not null,
  -- Hash verifikasi: SHA-256 hex dari salt || pepper || kode.
  code_hash text not null,
  product license_product not null,
  plan license_plan not null,
  status license_status not null default 'active',
  -- 'issued' = diterbitkan server-side (salted). 'legacy' = kode lama
  -- situs main yang di-grandfather (lihat web/docs/
  -- license-legacy-migration.sql) — wajib di-re-issue, lihat LICENSE.md.
  origin license_origin not null default 'issued',
  -- Untuk legacy: hash SHA-256 TANPA salt dari kode lama (apa adanya
  -- dari generator/lock.js). NULL untuk lisensi baru. Dipakai hanya
  -- oleh jalur legacy di Edge Function validate-license.
  -- CATATAN (LIC-02): legacy_code_hash TIDAK unik secara global — hash
  -- pertama Generator SAMA dengan hash owner Kasir, jadi satu hash
  -- bisa muncul di DUA baris (product 'generator' dan 'kasir').
  -- Karena itu lookup legacy WAJIB dibedakan per produk (atau
  -- menangani banyak baris) — jangan pernah .maybeSingle() tanpa
  -- filter product. Indeks unik di bawah menegakkan: satu baris per
  -- (legacy_code_hash, product).
  legacy_code_hash text,
  expires_at timestamptz,
  max_devices integer not null default 3 check (max_devices >= 1),
  -- Identitas pembeli (opsional, untuk admin): nama + kontak. Bukan secret.
  buyer_name text,
  buyer_contact text,
  issued_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  revoke_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index licenses_product_status_idx on public.licenses (product, status);
create index licenses_expires_idx on public.licenses (expires_at);
-- LIC-02: satu baris legacy per (hash, product). Tanpa ini, impor
-- legacy yang dijalankan dua kali (atau hash yang sama untuk dua
-- produk) bisa membuat baris duplikat dan lookup ambigu.
create unique index licenses_legacy_hash_product_idx
  on public.licenses (legacy_code_hash, product)
  where origin = 'legacy' and legacy_code_hash is not null;
create trigger licenses_updated_at before update on public.licenses
  for each row execute function public.set_updated_at();

-- ---------- 2. license_activations ----------
-- Satu baris per (lisensi, pengguna, perangkat). Perangkat diidentifikasi
-- dari device_id yang di-hash client (SHA-256) — device_id mentah tidak
-- disimpan; yang disimpan hanya hash-nya.
create table public.license_activations (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_hash text not null,
  device_label text,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
  -- TIDAK ADA unique constraint penuh di sini (LIC-07): constraint
  -- unique (license_id, user_id, device_hash) tanpa syarat akan
  -- memblokir aktivasi ULANG setelah baris lama di-revoke, karena
  -- baris yang di-revoke tetap ada di tabel. Keunikan aktivasi AKTIF
  -- ditegakkan oleh indeks partial di bawah.
);
create index license_activations_license_idx on public.license_activations (license_id);
create index license_activations_user_idx on public.license_activations (user_id);
-- LIC-07: atomik — paling banyak SATU aktivasi aktif per
-- (lisensi, pengguna, perangkat). Dua INSERT bersamaan untuk perangkat
-- yang sama: satu berhasil, satu kena konflik unique (23505) dan harus
-- ditangani Edge Function sebagai "sudah aktif" (idempotent), bukan
-- error 503. Baris yang revoked_at-nya terisi TIDAK masuk indeks, jadi
-- aktivasi ulang setelah revoke tetap bisa dilakukan.
create unique index license_activations_active_device_idx
  on public.license_activations (license_id, user_id, device_hash)
  where revoked_at is null;

-- ---------- 3. license_audit_log ----------
-- Jejak audit SEMUA keputusan lisensi. TIDAK menyimpan kode, pepper,
-- salt, atau secret apa pun — hanya id, aksi, dan alasan generik.
create table public.license_audit_log (
  id uuid primary key default gen_random_uuid(),
  license_id uuid references public.licenses (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  action text not null check (action in (
    'validate_ok', 'validate_fail', 'activate_ok', 'activate_fail',
    'create', 'revoke', 'entitlement'
  )),
  device_hash text,
  -- Hash SHA-256 dari IP pemanggil (bukan IP mentah) — untuk forensik
  -- rate-limit tanpa menyimpan PII.
  ip_hash text,
  reason text,
  created_at timestamptz not null default now()
);
create index license_audit_log_license_idx on public.license_audit_log (license_id, created_at desc);
create index license_audit_log_created_idx on public.license_audit_log (created_at desc);

-- ---------- 4. license_attempts ----------
-- Percobaan validasi gagal/sukses per kode (lookup_hash) + per IP-hash,
-- untuk rate limiting di Edge Function. Baris lama boleh dibersihkan
-- berkala (retensi 30 hari, lihat LICENSE.md).
create table public.license_attempts (
  id uuid primary key default gen_random_uuid(),
  lookup_hash text not null,
  ip_hash text not null,
  success boolean not null default false,
  created_at timestamptz not null default now()
);
create index license_attempts_lookup_idx on public.license_attempts (lookup_hash, created_at desc);
create index license_attempts_ip_idx on public.license_attempts (ip_hash, created_at desc);

-- ---------- RLS ----------
-- licenses: TIDAK ADA policy SELECT untuk anon/authenticated — hash dan
-- salt hanya bisa dibaca service role (Edge Function). Ini disengaja:
-- client tidak pernah boleh membaca tabel ini, bahkan barisnya sendiri.
alter table public.licenses enable row level security;
-- (Tidak ada policy sama sekali: default deny untuk anon + authenticated.
--  Service-role key melewati RLS.)

-- license_activations: user hanya melihat aktivasi miliknya sendiri.
alter table public.license_activations enable row level security;
create policy license_activations_select_own on public.license_activations
  for select to authenticated
  using (user_id = auth.uid() or public.current_user_role() in ('admin_portal', 'superadmin'));

-- license_audit_log: hanya admin yang boleh membaca.
alter table public.license_audit_log enable row level security;
create policy license_audit_log_select_admin on public.license_audit_log
  for select to authenticated
  using (public.current_user_role() in ('admin_portal', 'superadmin'));

-- license_attempts: tidak bisa dibaca client sama sekali (deny default).
alter table public.license_attempts enable row level security;
-- (Tidak ada policy: hanya service role.)

-- ---------- GRANT (LIC-04) ----------
-- Migrasi ini MANDIRI: GRANT yang dibutuhkan tabel lisensi ditulis di
-- sini, tidak bergantung pada 0005/0006 (yang hanya memberi GRANT pada
-- tabel yang sudah ada saat keduanya dijalankan) maupun pada 0008.
-- Prinsip: GRANT hanya membuka pintu; policy RLS yang menentukan baris
-- mana yang boleh dibaca/ditulis.
--
-- authenticated: HANYA SELECT pada license_activations — dan policy di
-- atas membatasinya ke baris milik sendiri (atau admin). TIDAK ADA
-- GRANT apa pun untuk authenticated pada licenses, license_audit_log,
-- dan license_attempts: hash/salt lisensi dan jejak percobaan tidak
-- boleh dibaca client sama sekali. (Policy SELECT admin pada
-- license_audit_log sengaja tanpa GRANT client: pembacaan audit oleh
-- admin dilakukan lewat Edge Function dengan service role, bukan
-- lewat PostgREST langsung.)
grant usage on schema public to authenticated;
grant select on public.license_activations to authenticated;

-- service_role (Edge Function): akses penuh ke keempat tabel lisensi
-- + sequence. Service role melewati RLS, jadi GRANT inilah yang
-- membuatnya bisa membaca licenses (hash/salt) dan menulis audit
-- log / attempts. Kunci service-role TIDAK PERNAH dipakai di frontend.
grant usage on schema public to service_role;
grant all on public.licenses to service_role;
grant all on public.license_activations to service_role;
grant all on public.license_audit_log to service_role;
grant all on public.license_attempts to service_role;
grant usage, select on all sequences in schema public to service_role;
