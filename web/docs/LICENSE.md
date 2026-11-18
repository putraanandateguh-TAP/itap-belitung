# Lisensi FULL server-side (Workstream B)

Validasi lisensi iTAP Belitung yang sebelumnya 100% client-side
(temuan audit K1 — lihat `LICENSE_AUDIT.md` di branch PR #24) dipindah
ke server: Supabase Postgres + Edge Functions + API route Next.js.
Frontend hanya menampilkan entitlement yang sudah divalidasi server.

> Port + perbaikan LIC-01..LIC-08 di branch
> `fix/security-sec-01-sec-14-license` (dari implementasi PR #24,
> branch `feat/license-server-side`). Migrasi di sini bernomor **0007**
> — 0004 sudah dipakai `0004_listing_category.sql` di branch ini.
> Perubahan terhadap PR #24 dirangkum di § Perbaikan port (LIC-02..LIC-08).

## Arsitektur

```
Pembeli --(kode)--> /api/license/validate --(JWT user)--> Edge Function validate-license
                                                              |-- baca licenses (service role, RLS deny client)
                                                              |-- cek hash salted + expiry + revoke + device limit
                                                              |-- rate limit (license_attempts) + audit log
Admin   --(JWT)--> /api/license/admin ----(JWT user)--> Edge Function admin-licenses
                                                              |-- cek profiles.role (admin_portal/superadmin)
                                                              |-- create (kode sekali) / list / get / revoke
Frontend --(JWT)--> /api/license/entitlement ------------> validate-license?action=entitlement
                                                              |-- aktivasi aktif milik user -> { entitled, products, plan, expires_at }
```

## File yang ditambahkan/diubah (branch `fix/security-sec-01-sec-14-license`)

| File | Isi |
|---|---|
| `web/drizzle/0007_license_server_side.sql` | Tabel `licenses`, `license_activations`, `license_audit_log`, `license_attempts` + 4 enum + RLS + GRANT (LIC-04) + indeks unik legacy per produk (LIC-02) + indeks unik partial aktivasi aktif (LIC-07) |
| `supabase/functions/validate-license/index.ts` | Validasi + aktivasi + entitlement (JWT user, service role internal); perbaikan LIC-02/05/06/07 |
| `supabase/functions/admin-licenses/index.ts` | Buat / lihat / cabut lisensi (admin saja); perbaikan LIC-05/08 |
| `supabase/config.toml` | `[functions.validate-license]` + `[functions.admin-licenses]`, `verify_jwt = true` |
| `web/src/lib/license/validate.ts` | Logika murni: normalisasi, SHA-256, timing-safe compare, expiry, device limit, rate limit, generator kode, `selectLegacyLicenses()` (LIC-02) |
| `web/src/lib/license/server.ts` | Helper Next.js: panggil Edge Function dengan JWT user |
| `web/src/lib/license.ts` | Client: `fetchEntitlement()` + `activateLicense()` (memori saja) |
| `web/src/hooks/use-license.ts` | Hook entitlement (React state; TANPA localStorage) |
| `web/src/components/license-activate-form.tsx` | Form aktivasi kode |
| `web/src/components/license-section.tsx` | Status lisensi di halaman Produk |
| `web/src/app/produk/page.tsx` | Menampilkan `LicenseSection` |
| `web/src/app/api/license/entitlement/route.ts` | GET entitlement (wajib login) |
| `web/src/app/api/license/validate/route.ts` | POST validate/activate (wajib login, rate limit 5/15 mnt, teruskan `product` opsional) |
| `web/src/app/api/license/admin/route.ts` | POST admin (wajib admin portal/superadmin) |
| `web/src/lib/db/schema.ts` | Cerminan Drizzle tabel lisensi |
| `web/tests/license.test.ts` | 17 unit test logika murni (13 lama + 4 LIC-02) |
| `web/docs/license-legacy-migration.sql` | Grandfathering 21 kode lama (DOKUMEN SAJA — JANGAN JALANKAN, LIC-01) |
| `web/docs/LICENSE-LIVE-TESTS.md` | Skenario uji live bypass lisensi (a–g) |
| `web/.env.example` | `LICENSE_PEPPER` (nama saja) |
| `web/package.json` / `web/tsconfig.json` | Script `test:license`; `allowImportingTsExtensions` (agar test `.ts` lolos `tsc`) |

## Desain keamanan

- **Hash dua lapis.** `lookup_hash = SHA-256(pepper || kode)` untuk
  pencarian; `code_hash = SHA-256(salt || pepper || kode)` dengan salt
  acak 16 byte per lisensi untuk verifikasi (perbandingan waktu-konstan).
  Kode plaintext tidak pernah disimpan, tidak pernah di-log.
- **Pepper server-side saja.** `LICENSE_PEPPER` hanya sebagai Supabase
  Edge Function secret. Bila pepper bocor/berubah, semua kode issued
  harus di-re-issue (tidak ada jalan pintas).
- **RLS deny-by-default.** Tabel `licenses` dan `license_attempts` tidak
  punya policy sama sekali: anon/authenticated tidak bisa membaca hash
  atau salt, bahkan barisnya sendiri. `license_activations` hanya bisa
  dibaca pemiliknya / admin; `license_audit_log` hanya admin.
- **GRANT mandiri (LIC-04).** Migrasi 0007 menulis GRANT-nya sendiri:
  `authenticated` hanya `SELECT` pada `license_activations` (policy
  membatasi ke baris sendiri/admin); `service_role` mendapat `ALL` pada
  keempat tabel lisensi + `USAGE, SELECT` pada sequences. Tidak bergantung
  pada 0005/0006 (yang hanya memberi GRANT pada tabel yang sudah ada saat
  keduanya dijalankan) maupun 0008.
- **Fail-closed.** Konfigurasi hilang, pepper hilang, Edge Function
  error, atau jaringan gagal -> `entitled: false`. Frontend tidak
  menyimpan status FULL di localStorage/sessionStorage; entitlement
  hidup di React state dan di-refresh dari server.
- **Rate limiting.** Dua lapis: in-memory di Next.js route (5 percobaan /
  15 menit per IP, `lib/rate-limit.ts`) dan persisten di Edge Function
  (maks 5 gagal per kode / 15 menit; maks 10 gagal per IP-hash / 15 menit;
  jawaban 429). IP hanya disimpan sebagai hash SHA-256. Kunci rate limit
  TIDAK PERNAH memakai X-Forwarded-For mentah (LIC-06).
- **Audit.** Setiap keputusan dicatat di `license_audit_log` (aksi +
  alasan generik + `license_id`/`user_id`/`device_hash`/`ip_hash`).
  Tidak ada kode, pepper, atau salt di log.
- **Device limit (LIC-07).** Default 3 perangkat aktif per lisensi;
  aktivasi dicatat di `license_activations` (hash perangkat, bukan ID
  mentah). Keunikan aktivasi aktif ditegakkan indeks unik partial
  `((license_id, user_id, device_hash) WHERE revoked_at IS NULL)` —
  aktivasi bersamaan bersifat atomik (konflik 23505 = sudah aktif,
  idempotent), dan aktivasi ulang setelah revoke tetap bisa dilakukan.
  Mencabut lisensi juga mencabut semua aktivasinya.
- **Admin.** Peran dicek server-side dari `profiles.role` di Edge
  Function DAN di Next.js route (`requireAdmin`). Kode baru dibuat
  server-side (`ITAP-XXXX-XXXX-XXXX`, alfabet tanpa 0/O/1/I/L) dan
  dikembalikan plaintext HANYA SEKALI di respons create (LIC-08).

## Perbaikan port (LIC-02..LIC-08)

- **LIC-02 — lookup legacy per produk.** `legacy_code_hash` yang sama
  muncul di DUA baris: hash pertama Generator = hash owner Kasir
  (lihat `license-legacy-migration.sql`). Implementasi PR #24 memakai
  `.maybeSingle()` tanpa filter product pada lookup legacy — query itu
  error (lebih dari 1 baris) tepat untuk kode kasir owner, sehingga
  kode tersebut selalu dijawab `invalid`. Perbaikan: migrasi 0007
  menambahkan indeks unik `(legacy_code_hash, product) WHERE
  origin='legacy'`; Edge Function mengambil SEMUA baris yang cocok
  (tanpa `maybeSingle`), menyaring dengan `.eq('product', …)` bila
  pemanggil meminta produk tertentu (field `product` opsional di body
  POST, diteruskan route Next.js), dan bila tanpa filter produk ada 2
  baris maka kode itu membuka kedua produk (keduanya divalidasi /
  diaktivasi, masing-masing dengan `max_devices`-nya). Error lookup DB
  kini ditangani eksplisit: 503 fail-closed, bukan `invalid` yang
  menyembunyikan gangguan DB. Logika pemilihan baris dicerminkan fungsi
  murni `selectLegacyLicenses()` di `src/lib/license/validate.ts` dan
  diuji 4 kasus di `tests/license.test.ts`. Kolom `product` sudah ada di
  skema sejak 0004 — tidak perlu kolom baru.
- **LIC-03 — penomoran migrasi.** File migrasi lisensi di branch ini
  adalah `web/drizzle/0007_license_server_side.sql` (0004 sudah dipakai
  `0004_listing_category.sql`). Isi = 0004 PR #24 + LIC-02/04/07.
- **LIC-04 — GRANT di 0007.** Lihat § Desain keamanan di atas.
- **LIC-05 — CORS dipersempit.** Kedua Edge Function lisensi memakai
  `Access-Control-Allow-Origin: https://itapbelitung.my.id` (sama
  seperti `delete-account` kanonis di `site/web`), bukan `'*'`.
- **LIC-06 — IP tepercaya saja.** `clientIp()` lama memakai entri
  pertama `X-Forwarded-For` — header itu ditulis client dan bisa
  dipalsukan, sehingga penyerang bisa mengencerkan rate limit per-IP.
  Sekarang: pakai `cf-connecting-ip` (ditulis Cloudflare di depan Edge
  Function) bila ada, lalu `x-real-ip` (ditulis proxy tepercaya
  Supabase); bila keduanya tidak ada, fallback ke kunci gabungan
  `user:<user_id>` — rate limit tetap jalan per akun. `X-Forwarded-For`
  TIDAK PERNAH dibaca. Batas per-kode (5 gagal / 15 menit) tetap
  menjadi pertahanan utama dan tidak bergantung pada IP. Yang disimpan
  di `license_attempts` tetap hanya hash SHA-256 dari kunci itu.
  Pilihan ini didokumentasikan juga di komentar kode Edge Function.
- **LIC-07 — aktivasi atomik.** Lihat § Desain keamanan (indeks unik
  partial + penanganan 23505 sebagai sukses idempotent).
- **LIC-08 — kode hanya tampil sekali.** Respons `create` di
  `admin-licenses` kini membawa field `warning` eksplisit: kode hanya
  tampil sekali, wajib disampaikan ke pembeli lewat jalur aman
  (WA/email) sekarang juga, jangan disimpan di repo/chat/log; bila
  hilang, solusinya buat lisensi baru + cabut yang lama (kode tidak
  bisa ditampilkan lagi).

## Keterbatasan yang diketahui

- **Device ID = per-pengguna, bukan per-perangkat nyata (LIC-07).**
  Route Next.js `/api/license/validate` membuat `device_id` sebagai
  `SHA-256('license-device:' + user_id)` — stabil per pengguna, sama di
  HP, laptop, dan tablet milik pengguna yang sama. Akibatnya batas
  `max_devices` (default 3) saat ini praktis menghitung AKUN, bukan
  perangkat: satu pengguna yang masuk dari 3 perangkat berbeda tetap
  memakai 1 slot aktivasi. Ini dipilih sengaja sebagai langkah awal
  (tidak ada identitas perangkat tepercaya di web). Bila batas
  per-perangkat nyata dibutuhkan: kirim `device_id` persisten dari
  client (dibangkitkan sekali, disimpan di penyimpanan lokal perangkat,
  dikirim tiap aktivasi) dan perbarui bagian ini. Selama keterbatasan
  ini berlaku, JANGAN mengklaim "maks 3 perangkat" ke pembeli — yang
  ditegakkan saat ini adalah "maks 3 AKUN per kode".
- **Tidak ada UI admin lisensi** di repo ini (belum ada pola halaman
  admin lisensi; `/redaksi` adalah redaksi konten). Manajemen lewat
  endpoint `POST /api/license/admin` (create/list/get/revoke) — lihat
  contoh curl di bawah. UI admin bisa ditambahkan bila Teguh meminta.
- **Rotasi pepper** tidak didukung tanpa re-issue semua kode. Bila
  pepper bocor, buat pepper baru, re-issue semua lisensi aktif, lalu
  revoke yang lama.

## Deployment — checklist untuk pemilik (MANUAL, berurutan)

> Semua langkah di bawah ini BELUM dilakukan oleh pekerjaan ini
> (dilarang mengubah DB production / deploy). Lakukan setelah PR
> di-merge ke `replica/itap-satam` dan/atau `main`.

1. **Buat pepper** (sekali, simpan di Secure Vault — jangan di repo/chat):
   `openssl rand -hex 32` (64 hex char). JANGAN generate pepper di
   pekerjaan ini — hanya catat langkahnya.
2. **Jalankan migrasi 0007** di Supabase SQL Editor proyek `itap-belitung`
   (ref `iwravgwsxmojxtbznori`): tempel isi
   `web/drizzle/0007_license_server_side.sql`, jalankan, pastikan 4 tabel
   + 4 enum + 2 policy + GRANT terbentuk. Alternatif: `npm run db:migrate`
   dari mesin yang bisa mencapai Postgres Supabase (VM ini terblokir
   egress proxy — lihat BUG-005). Urutan: 0007 SETELAH 0001–0006,
   SEBELUM 0008 (0008 sudah ditulis dengan asumsi 0007 lebih dulu).
3. **Deploy Edge Functions** (Supabase CLI, dari root repo):
   ```
   supabase link --project-ref iwravgwsxmojxtbznori
   supabase functions deploy validate-license
   supabase functions deploy admin-licenses
   ```
4. **Set secrets Edge Function:**
   ```
   supabase secrets set LICENSE_PEPPER=<nilai-dari-langkah-1> --project-ref iwravgwsxmojxtbznori
   ```
   (Supabase URL / anon / service-role sudah tersedia otomatis untuk
   Edge Function; tidak perlu di-set manual.)
5. **Pastikan env Vercel** (sudah ada dari P1): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`. TIDAK ADA service-role key di Vercel
   frontend env — service role hanya dipakai Edge Function.
6. **Uji end-to-end** (lihat § Test plan di bawah + skenario
   `web/docs/LICENSE-LIVE-TESTS.md`).
7. **(WAITING FOR OWNER — LIC-01) Migrasi kode lama:** JANGAN jalankan
   `web/docs/license-legacy-migration.sql` sebelum keputusan pemilik —
   lihat § Migrasi kode lama di bawah.

## Migrasi kode lama (21 kode FULL Generator + 1 Kasir) — LIC-01

- File `web/docs/license-legacy-migration.sql` (22 baris: 21 `generator`
  + 1 `kasir`) dibuat dari hash di `main:generator/lock.js` dan
  `main:kasir/lock.js`. Hash pertama Generator = hash owner Kasir,
  jadi kode itu membuka kedua produk.
- Jalur validasi legacy di `validate-license`: bila `lookup_hash`
  (salted) tidak ketemu, Edge Function menghitung `SHA-256(kode)` dan
  mencocokkan `legacy_code_hash` (dengan filter product bila diminta —
  LIC-02). Jawaban membawa `legacy: true` agar frontend menampilkan
  peringatan re-issue. Bila tidak ada baris legacy sama sekali, jalur
  ini fail-closed: kode dijawab `invalid`.
- **STATUS: WAITING FOR OWNER — JANGAN JALANKAN.** File itu disimpan
  sebagai DOKUMEN di `web/docs/` (bukan di `web/drizzle/`, dan TIDAK
  disertakan eksekusinya di migrasi 0007). Baris pertama file berisi
  peringatan: "JANGAN JALANKAN sebelum keputusan pemilik (re-issue
  paksa vs grandfather bertenggat 30 hari + revoke terjadwal + hapus
  lock.js dari main)".
- **Keputusan yang ditunggu dari Teguh** — pilih satu:
  - **(a) Re-issue paksa:** kode lama langsung tidak berlaku; admin
    menerbitkan kode baru (salted) untuk tiap pembeli lama yang
    teridentifikasi dan menyampaikannya lewat WA/email. File legacy
    TIDAK PERNAH dijalankan.
  - **(b) Grandfather bertenggat 30 hari:** jalankan file legacy
    (manual, SQL Editor, setelah 0007), kode lama tetap jalan 30 hari
    sambil admin menerbitkan kode baru untuk tiap pembeli lama; pada
    hari ke-30 jalankan revoke terjadwal:
    `update public.licenses set status='revoked', revoke_reason='legacy retired' where origin='legacy';`
    lalu hapus `generator/lock.js` + `kasir/lock.js` dari `main`.
- **Rencana re-issue (wajib, apa pun pilihannya):** kode legacy tetap
  memakai hash tanpa salt yang sudah publik — grandfathering hanya
  jembatan, bukan perbaikan. Admin menerbitkan kode baru via
  `POST /api/license/admin` `{ action:"create", product, plan }` untuk
  tiap pembeli lama, menyampaikan kode baru lewat WA/email, lalu
  setelah tenggat: revoke semua `origin='legacy'` (SQL di atas),
  kemudian hapus `generator/lock.js` + `kasir/lock.js` dari `main`.

## Test plan

### Sudah jalan lokal (bukti di laporan agen LISENSI)
- `npm run test:license` — 17/17 unit test lolos (hashing incl. vektor
  SHA-256 standar, normalisasi, expiry, revocation, device limit,
  rate limit, generator kode, + 4 kasus LIC-02 `selectLegacyLicenses`).
- `npm run typecheck` — lolos (0 error) untuk file yang diubah.
- Sintaks SQL migrasi 0007: lihat laporan agen (parser yang dipakai
  dicatat di sana — bila tidak ada parser di VM, statusnya ditulis
  jujur sebagai belum terverifikasi, BUKAN diklaim lolos).
- Kedua Edge Function lolos transpile TypeScript (tanpa Deno — Deno
  tidak tersedia di VM ini).

### Belum teruji (butuh Supabase baru + secrets + deploy)
- [ ] Migrasi 0007 di Supabase SQL Editor proyek baru.
- [ ] Deploy + `LICENSE_PEPPER` + panggil `validate-license` /
      `admin-licenses` dengan JWT asli (kasus: kode valid, kode salah,
      revoke, expired, device limit, rate limit 6x gagal, aktivasi
      bersamaan, kode legacy dua produk).
- [ ] `GET /api/license/entitlement` + aktivasi dari halaman `/produk`
      (login sebagai pembeli uji).
- [ ] RLS negatif: anon/authenticated SELECT `licenses` ditolak;
      user A tidak bisa membaca `license_activations` user B.
- [ ] Admin non-admin (role reader) memanggil `/api/license/admin`
      -> 403; Edge Function langsung -> 403.
- [ ] Legacy: kode lama (bila masih diketahui pemiliknya) mengembalikan
      `ok:true, legacy:true`; setelah revoke legacy -> `revoked`.
- Skenario lengkap (a–g) ada di `web/docs/LICENSE-LIVE-TESTS.md`.

### Perintah uji manual (setelah deploy)
```bash
# 1. Buat lisensi (login sebagai superadmin di browser, ambil JWT dari
#    DevTools > Application > Cookies, atau pakai curl dengan token):
curl -X POST https://<project>.supabase.co/functions/v1/admin-licenses \
  -H "Authorization: Bearer <JWT_ADMIN>" -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"action":"create","product":"generator","plan":"lifetime","buyer_name":"Uji"}'
# -> simpan `code` dari respons (hanya muncul sekali — LIC-08).

# 2. Aktivasi (JWT pembeli uji):
curl -X POST https://<project>.supabase.co/functions/v1/validate-license \
  -H "Authorization: Bearer <JWT_USER>" -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"action":"activate","code":"ITAP-XXXX-XXXX-XXXX","device_id":"uji-1"}'

# 3. Entitlement:
curl "https://<project>.supabase.co/functions/v1/validate-license?action=entitlement" \
  -H "Authorization: Bearer <JWT_USER>" -H "apikey: <ANON_KEY>"

# 4. Cabut (JWT admin):
curl -X POST https://<project>.supabase.co/functions/v1/admin-licenses \
  -H "Authorization: Bearer <JWT_ADMIN>" -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"action":"revoke","license_id":"<id>","reason":"uji"}'
# lalu ulangi langkah 2 -> harus `reason:"revoked"`.
```

## Operasional
- **Retensi `license_attempts`:** bersihkan baris > 30 hari berkala
  (`delete from public.license_attempts where created_at < now() - interval '30 days';`).
- **Rotasi pepper:** tidak didukung tanpa re-issue semua kode. Bila
  pepper bocor, buat pepper baru, re-issue semua lisensi aktif, lalu
  revoke yang lama.
