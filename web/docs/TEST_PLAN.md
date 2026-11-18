# Test Plan — iTAP Belitung (staging)

**Ruang lingkup:** aplikasi baru Next.js + TypeScript + Supabase + Drizzle
(`web/`, branch `replica/itap-satam`) + validasi lisensi server-side
PR #24 (branch `feat/license-server-side`). Semua test black-box
(HTTP-level) melawan deployment **staging** — TIDAK PERNAH production.
**Dokumen staging:** `web/docs/STAGING.md`.
**Suite otomatis:** `web/e2e/staging/` (Playwright) + `web/tests/seed-staging.test.ts`
(node:test, lokal).

## 1. Prasyarat staging (sekali, sebelum suite jalan)

1. Proyek Supabase staging dibuat (STAGING.md §1), migrasi 0001–0004
   jalan, Edge Functions `validate-license` + `admin-licenses` ter-deploy
   dengan `LICENSE_PEPPER` dummy staging.
2. Deployment Vercel staging jalan; `STAGING_BASE_URL` terisi.
3. Tiga akun test dibuat di Auth staging dan terverifikasi emailnya:
   - **admin** (`STAGING_ADMIN_EMAIL`) — role `superadmin` di `profiles`.
   - **buyer** (`STAGING_BUYER_EMAIL`) — role `reader`, DAN gerbang
     marketplace lengkap agar `POST /api/listings` lolos (bukan 403):
     ```sql
     -- di SQL Editor STAGING (ganti email test):
     update public.profiles
        set whatsapp_verified_at = now(),
            marketplace_rules_accepted_at = now()
      where email = 'buyer.staging-test@staging-test.invalid';
     ```
     Email terverifikasi didapat dari konfirmasi signup (atau
     Dashboard → Authentication → centang `email_confirmed_at`).
     Tanpa ini, CRUD-07/10/11 benar mengembalikan 403 — itu BUKAN bug.
   - **reader** (`STAGING_READER_EMAIL`) — role `reader`, tanpa gerbang
     marketplace (untuk uji 403).
4. Seed staging jalan: `npm run db:seed:staging` → `2 kategori,
   3 artikel, 3 listing, 7 lisensi` (STAGING.md §3).
5. Salin `web/.env.staging.example` → `web/.env.staging.local`,
   isi nilai staging. JANGAN commit file `.local` itu.
6. Jalankan: `npm run test:staging` dari `web/`.

**Akun test — catatan Confirm email:** bila "Confirm email" AKTIF di
staging (default yang disarankan), akun hasil `POST /api/auth/signup`
di AUTH-01 TIDAK BISA login sebelum verifikasi — test itu hanya
menegaskan respons signup (`ok:true`). Login diuji dengan tiga akun
yang sudah terverifikasi di atas. Bila ingin menguji alur
signup→login end-to-end, matikan Confirm email HANYA di staging
atau konfirmasi akun uji lewat Dashboard, lalu catat keputusan itu
di STAGING.md §1 langkah 5.

## 2. Matriks kasus uji otomatis

### 2.1 Autentikasi — `e2e/staging/auth.spec.ts` (8 test)

| ID | Kasus | Harapan |
|---|---|---|
| AUTH-01 | Signup body valid (email dummy baru) | 200 `{ok:true}` |
| AUTH-02 | Signup body tidak valid | 400 + pesan Indonesia (email/password/nama) |
| AUTH-03 | Signup JSON rusak | 400, bukan 500 |
| AUTH-04 | Login buyer staging | 200 + JWT (3 segmen) |
| AUTH-05 | Login password salah | 400 Supabase Auth |
| AUTH-06 | JWT palsu ke endpoint terproteksi | 401 |
| AUTH-07 | Tanpa token ke endpoint terproteksi | 401 |
| AUTH-08 | Token buyer ke `/api/me/profile` | 200 |

### 2.2 CRUD — `e2e/staging/crud.spec.ts` (12 test)

| ID | Kasus | Harapan |
|---|---|---|
| CRUD-01 | GET /api/articles | 200, berisi slug seed `staging-test-pantai-dummy` |
| CRUD-02 | GET artikel seed / slug tidak ada | 200 / 404 |
| CRUD-03 | GET artikel draf (publik) | 404 (draf tidak tampil publik) |
| CRUD-04 | Admin buat artikel published | 201 + slug |
| CRUD-05 | Reader buat artikel admin / tanpa login | 403 / 401 |
| CRUD-06 | GET /api/admin/articles sebagai reader | 403 |
| CRUD-07 | Buyer buat listing | 201, lalu GET detail 200 |
| CRUD-08 | POST listing body tidak valid | 400 |
| CRUD-09 | GET listing tidak ada / page=999 | 404 / 200 |
| CRUD-10 | Pemilik PATCH sendiri 200; orang lain PATCH | 403 |
| CRUD-11 | Pemilik DELETE sendiri 200; DELETE lagi | 404/403 |
| CRUD-12 | Admin buat kontribusi draft 201; reader buat | 403 |

Catatan CRUD-04/12: `category_id` wajib UUID kategori yang ada —
test mengambilnya dulu dari `GET /api/categories?channel=wisata`.

### 2.3 Lisensi — `e2e/staging/license.spec.ts` (16 test)

Kode dummy dari `scripts/seed-staging.sql` (pepper dummy staging).

| ID | Kasus | Harapan |
|---|---|---|
| LIC-01 | Entitlement tanpa login | 401 |
| LIC-02 | Validate tanpa login | 401 |
| LIC-03 | Entitlement buyer (bentuk respons) | 200 `{entitled:boolean, products:[]}` |
| LIC-04 | Kode generator valid (EF langsung) | `ok:true, product:generator, plan:lifetime` |
| LIC-05 | Kode kasir valid | `ok:true, product:kasir` |
| LIC-06 | Kode salah | `ok:false, reason:invalid` |
| LIC-07 | Kode expired (status) | `reason:expired` |
| LIC-08 | Lisensi aktif tapi `expires_at` lewat | `reason:expired` |
| LIC-09 | Kode revoked | `reason:revoked` |
| LIC-10 | Aktivasi kode valid → entitlement | `ok:true`, lalu `entitled:true, products:[generator]` |
| LIC-11 | Device limit (`max_devices=1`) | perangkat-1 ok; perangkat-2 `device_limit`; perangkat-1 idempotent ok |
| LIC-12 | Admin create → validate → revoke → validate | ok → ok → ok → `revoked`; kode cocok `ITAP-XXXX-XXXX-XXXX` |
| LIC-13 | Admin list | 200, berisi lisensi; TANPA `code_hash`/`lookup_hash` |
| LIC-14 | Reader panggil `/api/license/admin` | 403 |
| LIC-15 | Validate body tidak valid (kode pendek) | 400 |
| LIC-16 | Rate limit EF: 6x gagal kode sama | 429 pada percobaan ke-6 |

**Urutan mengikat:** LIC-16 HARUS terakhir di file ini (membakar
budget gagal per IP 10/15 mnt), dan file `license.spec.ts` jalan
terakhir (urutan alfabet: auth → crud → errors → license).
Kasus lisensi lewat Edge Function langsung, KECUALI LIC-01/02/03/10
(entitlement)/12/13/14/15 yang lewat route Next.js — agar budget
rate limit in-memory Next.js (5/15 mnt per IP) tidak habis.

### 2.4 Unauthorized + error handling — `e2e/staging/errors.spec.ts` (8 test)

| ID | Kasus | Harapan |
|---|---|---|
| ERR-01 | 6 endpoint tulis + admin baca tanpa login | semua 401 |
| ERR-02 | 4 endpoint admin sebagai reader | semua 403 |
| ERR-03 | Reader ke `/api/license/admin` | 403 |
| ERR-04 | GET id/slug tidak ada (3 endpoint) | 404 + pesan |
| ERR-05 | JSON rusak (login) | 400, bukan 500 |
| ERR-06 | Body tipe salah (login) | 400 + details |
| ERR-07 | Route tidak dikenal | 404 |
| ERR-08 | Respons error berupa JSON valid | 404 + `{error:string}` |

### 2.5 Seed — `tests/seed-staging.test.ts` (lokal, tanpa staging)

`npm run test:seed-staging` — 7 hash lisensi cocok dengan rumus
kontrak PR #24 + pepper dummy; struktur seed (7 lisensi, status,
produk, device-limit); label dummy; tidak ada data/kunci asli;
guard runner (tolak ref production, tolak UUID placeholder/tidak
valid, substitusi UUID lengkap).

## 3. Budget rate limit (angka yang harus dijaga)

| Limiter | Batas | Dipakai suite | Sisa |
|---|---|---|---|
| Next.js `license-validate` (per IP) | 5/15 mnt | 3 (ERR-01, LIC-02, LIC-15) | 2 |
| Next.js `listing-create` (per IP) | 5/15 mnt | 5 (CRUD-07/08/10/11 + ERR-01) | 0 |
| Next.js `auth-signup` (per IP) | 5/15 mnt | 3 (AUTH-01/02/03) | 2 |
| Next.js `contribution-create` (per IP) | 10/15 mnt | 4 (CRUD-12 x2 + ERR-05/06) | 6 |
| Edge Function gagal/kode | 5/15 mnt | 6 (LIC-16, kode khusus) | — |
| Edge Function gagal/IP | 10/15 mnt | 10 (LIC-06/07/08/09/12 + LIC-16 x5) | 0 |

**JANGAN tambah panggilan ke endpoint di atas tanpa menghitung ulang
budget ini.** Bila suite kena 429 di run pertama, tunggu 15 menit
dan ulangi — itu perilaku limiter yang benar, bukan bug (kecuali
429 muncul pada panggilan PERTAMA ke endpoint itu).

## 4. Uji manual (tidak/belum terotomasi)

- [ ] **M1 — RLS negatif (SQL Editor staging):** sebagai `anon`,
      `select * from public.licenses` ditolak; sebagai buyer,
      `select * from public.license_activations where user_id <>
      '<buyer-id>'` kosong/ditolak. (Butuh 2 JWT berbeda — jalankan
      lewat Supabase API dengan token masing-masing, atau SQL dengan
      `set_config('request.jwt.claims', ...)`.)
- [ ] **M2 — Cron staging:** `GET /api/cron/availability-reminders`
      tanpa secret → 401/503; dengan `STAGING_CRON_SECRET` → 200.
- [ ] **M3 — Storage staging:** upload foto listing ke bucket
      staging `listing-photos` lewat UI/API → file HANYA ada di
      proyek staging (cek Dashboard staging vs production).
- [ ] **M4 — Pemisahan staging/production:** panggil production URL
      dengan anon key staging → gagal; panggil staging URL dengan
      anon key production → gagal.
- [ ] **M5 — Login Google staging:** bila diaktifkan, login Google
      di deployment staging → profil terbentuk, role `reader`.
- [ ] **M6 — Legacy (bila dijalankan):** kode lama (21 generator +
      1 kasir) → `ok:true, legacy:true` — lihat LICENSE.md PR #24.
- [ ] **M7 — UI aktivasi lisensi:** halaman `/produk` sebagai buyer
      → aktivasi kode seed valid → entitlement tampil FULL; revoke
      → tampil bukan FULL. (Tidak ada test UI otomatis untuk ini.)

## 5. Kriteria lolos / gagal

- **LOLOS:** semua 44 test Playwright + test seed lokal hijau dalam
  satu run, dan M1–M4 manual tercentang.
- **GAGAL (blokir):** satu pun 500 pada input yang bisa diprediksi;
  401/403 tertukar (mis. reader dapat 200 di endpoint admin);
  lisensi valid ditolak / lisensi revoked diterima; hash/salt
  bocor di respons list; data seed muncul di production.
- **GAGAL (flaky, ulangi dulu):** 429 pada panggilan pertama
  (budget §3 habis dari run sebelumnya — tunggu 15 menit).

## 6. Menjalankan ulang / mereset

- Suite idempotent: aktivasi lisensi seed persisten (device-1
  tetap ok di run berikut); listing/artikel baru dibuat per run
  (`runId` unik) — tidak perlu reset antar run.
- Reset penuh staging (bila perlu): hapus proyek Supabase staging
  dan buat ulang dari STAGING.md §1, atau jalankan ulang seed
  (`ON CONFLICT DO NOTHING`) + hapus manual data uji lewat
  Dashboard. JANGAN PERNAH reset database production.
- Bila `LICENSE_PEPPER` staging diganti: hitung ulang hash di
  `scripts/seed-staging.sql` (rumus di header file), lalu
  `npm run test:seed-staging` harus hijau sebelum seed ulang.
