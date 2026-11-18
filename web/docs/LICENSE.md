# Lisensi FULL server-side (Workstream B)

Validasi lisensi iTAP Belitung yang sebelumnya 100% client-side
(temuan audit K1 — lihat `LICENSE_AUDIT.md`) dipindah ke server:
Supabase Postgres + Edge Functions + API route Next.js. Frontend hanya
menampilkan entitlement yang sudah divalidasi server.

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

## File yang ditambahkan/diubah (branch `feat/license-server-side`)

| File | Isi |
|---|---|
| `web/drizzle/0004_license_server_side.sql` | Tabel `licenses`, `license_activations`, `license_audit_log`, `license_attempts` + 4 enum + RLS |
| `supabase/functions/validate-license/index.ts` | Validasi + aktivasi + entitlement (JWT user, service role internal) |
| `supabase/functions/admin-licenses/index.ts` | Buat / lihat / cabut lisensi (admin saja) |
| `supabase/config.toml` | `[functions.validate-license]` + `[functions.admin-licenses]`, `verify_jwt = true` |
| `web/src/lib/license/validate.ts` | Logika murni: normalisasi, SHA-256, timing-safe compare, expiry, device limit, rate limit, generator kode |
| `web/src/lib/license/server.ts` | Helper Next.js: panggil Edge Function dengan JWT user |
| `web/src/lib/license.ts` | Client: `fetchEntitlement()` + `activateLicense()` (memori saja) |
| `web/src/hooks/use-license.ts` | Hook entitlement (React state; TANPA localStorage) |
| `web/src/components/license-activate-form.tsx` | Form aktivasi kode |
| `web/src/components/license-section.tsx` | Status lisensi di halaman Produk |
| `web/src/app/produk/page.tsx` | Menampilkan `LicenseSection` |
| `web/src/app/api/license/entitlement/route.ts` | GET entitlement (wajib login) |
| `web/src/app/api/license/validate/route.ts` | POST validate/activate (wajib login, rate limit 5/15 mnt) |
| `web/src/app/api/license/admin/route.ts` | POST admin (wajib admin portal/superadmin) |
| `web/src/lib/db/schema.ts` | Cerminan Drizzle tabel lisensi |
| `web/tests/license.test.ts` | 13 unit test logika murni |
| `web/docs/license-legacy-migration.sql` | Grandfathering 21 kode lama (MANUAL, bukan di `drizzle/`) |
| `web/docs/LICENSE_AUDIT.md` | Audit sistem lama (main) |
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
- **Fail-closed.** Konfigurasi hilang, pepper hilang, Edge Function
  error, atau jaringan gagal -> `entitled: false`. Frontend tidak
  menyimpan status FULL di localStorage/sessionStorage; entitlement
  hidup di React state dan di-refresh dari server.
- **Rate limiting.** Dua lapis: in-memory di Next.js route (5 percobaan /
  15 menit per IP, `lib/rate-limit.ts`) dan persisten di Edge Function
  (maks 5 gagal per kode / 15 menit; maks 10 gagal per IP-hash / 15 menit;
  jawaban 429). IP hanya disimpan sebagai hash SHA-256.
- **Audit.** Setiap keputusan dicatat di `license_audit_log` (aksi +
  alasan generik + `license_id`/`user_id`/`device_hash`/`ip_hash`).
  Tidak ada kode, pepper, atau salt di log.
- **Device limit.** Default 3 perangkat aktif per lisensi; aktivasi
  dicatat di `license_activations` (hash perangkat, bukan ID mentah).
  Mencabut lisensi juga mencabut semua aktivasinya.
- **Admin.** Peran dicek server-side dari `profiles.role` di Edge
  Function DAN di Next.js route (`requireAdmin`). Kode baru dibuat
  server-side (`ITAP-XXXX-XXXX-XXXX`, alfabet tanpa 0/O/1/I/L) dan
  dikembalikan plaintext HANYA SEKALI di respons create.

## Deployment — checklist untuk pemilik (MANUAL, berurutan)

> Semua langkah di bawah ini BELUM dilakukan oleh Workstream B
> (dilarang mengubah DB production / deploy). Lakukan setelah PR
> di-merge ke `replica/itap-satam` dan/atau `main`.

1. **Buat pepper** (sekali, simpan di Secure Vault — jangan di repo/chat):
   `openssl rand -hex 32` (64 hex char).
2. **Jalankan migrasi 0004** di Supabase SQL Editor proyek `itap-belitung`
   (ref `iwravgwsxmojxtbznori`): tempel isi
   `web/drizzle/0004_license_server_side.sql`, jalankan, pastikan 4 tabel
   + 4 enum + 2 policy terbentuk. Alternatif: `npm run db:migrate`
   dari mesin yang bisa mencapai Postgres Supabase (VM ini terblokir
   egress proxy — lihat BUG-005).
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
6. **Uji end-to-end** (lihat § Test plan di bawah).
7. **(Opsional, setelah persetujuan Teguh) Migrasi kode lama:**
   jalankan `web/docs/license-legacy-migration.sql` di SQL Editor,
   lalu ikuti rencana re-issue di bawah.

## Migrasi kode lama (21 kode FULL Generator + 1 Kasir)

- File `web/docs/license-legacy-migration.sql` (22 baris: 21 `generator`
  + 1 `kasir`) dibuat otomatis dari hash di `main:generator/lock.js`
  dan `main:kasir/lock.js`. Hash pertama Generator = hash owner Kasir,
  jadi kode itu membuka kedua produk.
- Jalur validasi legacy di `validate-license`: bila `lookup_hash`
  (salted) tidak ketemu, Edge Function menghitung `SHA-256(kode)` dan
  mencocokkan `legacy_code_hash`. Jawaban membawa `legacy: true` agar
  frontend menampilkan peringatan re-issue.
- **Rencana re-issue (wajib):** kode legacy tetap memakai hash tanpa
  salt yang sudah publik — grandfathering hanya jembatan, bukan
  perbaikan. Admin menerbitkan kode baru via `POST /api/license/admin`
  `{ action:"create", product, plan }` untuk tiap pembeli lama,
  menyampaikan kode baru lewat WA/email, lalu setelah tenggat yang
  diputuskan Teguh (disarankan 90 hari):
  `update public.licenses set status='revoked', revoke_reason='legacy retired' where origin='legacy';`
  kemudian hapus `generator/lock.js` + `kasir/lock.js` dari `main`.

## Test plan

### Sudah jalan lokal (bukti di laporan Workstream B)
- `npm run test:license` — 13/13 unit test lolos (hashing incl. vektor
  SHA-256 standar, normalisasi, expiry, revocation, device limit,
  rate limit, generator kode).
- `npm run typecheck` — lolos (0 error).
- Migrasi 0004 + legacy SQL dieksekusi di PGlite lokal (stub Supabase:
  role `anon`/`authenticated`/`service_role`, `auth.uid()`,
  `profiles`, `current_user_role()`): 4 tabel, 4 enum, 2 policy, RLS
  aktif di 4 tabel, insert 1 baris lisensi OK; legacy SQL: 21 generator
  + 1 kasir.
- Kedua Edge Function lolos transpile TypeScript (tanpa Deno — Deno
  tidak tersedia di VM ini).

### Belum teruji (butuh Supabase baru + secrets + deploy)
- [ ] Migrasi 0004 di Supabase SQL Editor proyek baru.
- [ ] Deploy + `LICENSE_PEPPER` + panggil `validate-license` /
      `admin-licenses` dengan JWT asli (kasus: kode valid, kode salah,
      revoke, expired, device limit ke-4, rate limit 6x gagal).
- [ ] `GET /api/license/entitlement` + aktivasi dari halaman `/produk`
      (login sebagai pembeli uji).
- [ ] RLS negatif: anon/authenticated SELECT `licenses` ditolak;
      user A tidak bisa membaca `license_activations` user B.
- [ ] Admin non-admin (role reader) memanggil `/api/license/admin`
      -> 403; Edge Function langsung -> 403.
- [ ] Legacy: kode lama (bila masih diketahui pemiliknya) mengembalikan
      `ok:true, legacy:true`; setelah revoke legacy -> `revoked`.

### Perintah uji manual (setelah deploy)
```bash
# 1. Buat lisensi (login sebagai superadmin di browser, ambil JWT dari
#    DevTools > Application > Cookies, atau pakai curl dengan token):
curl -X POST https://<project>.supabase.co/functions/v1/admin-licenses \
  -H "Authorization: Bearer <JWT_ADMIN>" -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"action":"create","product":"generator","plan":"lifetime","buyer_name":"Uji"}'
# -> simpan `code` dari respons (hanya muncul sekali).

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
- **Tidak ada UI admin lisensi** di repo ini (belum ada pola halaman
  admin lisensi; `/redaksi` adalah redaksi konten). Manajemen lewat
  endpoint `POST /api/license/admin` (create/list/get/revoke) — lihat
  contoh curl di atas. UI admin bisa ditambahkan bila Teguh meminta.
