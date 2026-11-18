# Skrip uji live bypass lisensi (LIC — uji setelah deploy)

Uji ini dilakukan SETELAH: migrasi 0007 diterapkan di Supabase SQL
Editor, kedua Edge Function lisensi ter-deploy, dan `LICENSE_PEPPER`
di-set sebagai Edge Function secret. Semua langkah memakai JWT asli
(login sebagai pengguna uji di browser, ambil JWT dari DevTools >
Application > Cookies — atau token dari `supabase.auth.getSession()`).

Ganti placeholder:
- `<PROJECT>` = `iwravgwsxmojxtbznori` (proyek baru `itap-belitung`)
- `<ANON_KEY>` = anon key proyek (bukan service-role — tidak pernah
  dipakai dari client)
- `<JWT_USER_A>`, `<JWT_USER_B>` = JWT dua pengguna uji berbeda
- `<JWT_ADMIN>` = JWT superadmin / admin_portal

Kode plaintext lisensi uji HANYA dicatat sementara selama pengujian
(di catatan lokal penguji, bukan repo/chat/log) dan dicabut setelah
pengujian selesai.

## Persiapan

```bash
# 1. Buat lisensi uji (JWT admin) — simpan `code` + `license_id`:
curl -s -X POST https://<PROJECT>.supabase.co/functions/v1/admin-licenses \
  -H "Authorization: Bearer <JWT_ADMIN>" -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"action":"create","product":"generator","plan":"lifetime","buyer_name":"Uji live"}'
# -> { "ok": true, "code": "ITAP-XXXX-XXXX-XXXX", "license_id": "<ID>", "warning": "Kode di atas hanya tampil SEKALI..." }
```

## (a) Entitlement tanpa auth → harus 401/403

```bash
# Tanpa header Authorization sama sekali:
curl -s "https://<PROJECT>.supabase.co/functions/v1/validate-license?action=entitlement" \
  -H "apikey: <ANON_KEY>"
# HARUS: HTTP 401 { "error": "auth" }

# Tanpa auth ke route Next.js:
curl -s https://itapbelitung.my.id/api/license/entitlement
# HARUS: 401 (atau redirect login) — dan bila 200, bodinya WAJIB
# { "entitled": false, ... }, TIDAK PERNAH entitled:true.
```

## (b) Validate kode sampah → invalid

```bash
curl -s -X POST https://<PROJECT>.supabase.co/functions/v1/validate-license \
  -H "Authorization: Bearer <JWT_USER_A>" -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"action":"validate","code":"ITAP-XXXX-XXXX-XXXX","device_id":"uji-a"}'
# HARUS: 200 { "ok": false, "reason": "invalid" }
# (Bukan 500, bukan ok:true. Cek juga license_audit_log: ada baris
# validate_fail reason=not_found untuk percobaan ini.)
```

## (c) Aktivasi lisensi milik pengguna lain → ditolak

```bash
# User A mengaktifkan kode uji (miliknya — aktivasi pertama):
curl -s -X POST https://<PROJECT>.supabase.co/functions/v1/validate-license \
  -H "Authorization: Bearer <JWT_USER_A>" -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"action":"activate","code":"<KODE_UJI>","device_id":"uji-a"}'
# HARUS: 200 { "ok": true, "product": "generator", ... }

# Entitlement user B (yang TIDAK pernah mengaktifkan kode itu):
curl -s "https://<PROJECT>.supabase.co/functions/v1/validate-license?action=entitlement" \
  -H "Authorization: Bearer <JWT_USER_B>" -H "apikey: <ANON_KEY>"
# HARUS: { "entitled": false, "products": [] }
# (User B tidak mendapat FULL hanya karena kode itu ada.)

# RLS negatif (PostgREST langsung, JWT user B):
# GET https://<PROJECT>.supabase.co/rest/v1/license_activations?select=* 
#   -H "Authorization: Bearer <JWT_USER_B>" -H "apikey: <ANON_KEY>"
# HARUS: hanya baris milik user B (0 baris bila belum pernah aktivasi),
# TIDAK ADA baris milik user A.
# GET .../rest/v1/licenses?select=* dengan JWT user mana pun:
# HARUS: 0 baris / ditolak — hash dan salt tidak boleh terbaca client.
```

## (d) Lisensi kedaluwarsa / dicabut → invalid

```bash
# Buat lisensi monthly (kedaluwarsa 30 hari) lalu ubah expires_at-nya
# menjadi kemarin via SQL Editor (hanya untuk pengujian):
#   update public.licenses set expires_at = now() - interval '1 day'
#   where id = '<ID>';
curl -s -X POST https://<PROJECT>.supabase.co/functions/v1/validate-license \
  -H "Authorization: Bearer <JWT_USER_A>" -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"action":"validate","code":"<KODE_UJI>","device_id":"uji-a"}'
# HARUS: { "ok": false, "reason": "expired" }

# Cabut lisensi uji (JWT admin):
curl -s -X POST https://<PROJECT>.supabase.co/functions/v1/admin-licenses \
  -H "Authorization: Bearer <JWT_ADMIN>" -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"action":"revoke","license_id":"<ID>","reason":"uji live selesai"}'
# HARUS: { "ok": true }
# Ulangi validate di atas:
# HARUS: { "ok": false, "reason": "revoked" }
# Dan entitlement user A setelah revoke:
# HARUS: { "entitled": false, "products": [] }
```

## (e) Rate limit: 6x kode salah → 429

```bash
# Kirim 6x kode salah yang sama (kode format valid tapi tidak ada),
# dengan JWT user A, berurutan:
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST \
    https://<PROJECT>.supabase.co/functions/v1/validate-license \
    -H "Authorization: Bearer <JWT_USER_A>" -H "apikey: <ANON_KEY>" \
    -H "Content-Type: application/json" \
    -d '{"action":"validate","code":"ITAP-SALAH-SALAH-0001","device_id":"uji-a"}'
done
# HARUS: 5 jawaban pertama 200 { "ok": false, "reason": "invalid" },
# jawaban ke-6 (atau setelahnya) HTTP 429
# { "ok": false, "reason": "rate_limited", "retry_after_sec": 900 }.
# Catatan: batas per-kode adalah 5 gagal / 15 menit; bila pengujian ini
# dijalankan setelah skenario (b) dengan kode yang sama, hitungan sudah
# berjalan — pakai kode salah yang BARU agar hitungan mulai dari 0.
# Batas per-IP/akun (10 gagal / 15 menit) diuji dengan 10 kode salah
# BERBEDA dari akun yang sama — jawaban ke-11 harus 429 juga.
```

## (f) FULL palsu via localStorage — tidak relevan (uji manual browser)

Sistem baru TIDAK PERNAH menyimpan status FULL di localStorage /
sessionStorage, jadi serangan klasik situs lama (satu baris di DevTools
mengaktifkan FULL) tidak punya permukaan lagi. Uji penggantinya,
manual di browser (login sebagai pengguna TANPA lisensi):

1. Buka https://itapbelitung.my.id/produk — status harus
   "Belum ada lisensi FULL aktif di akun ini."
2. Di DevTools > Application > Local Storage, tambahkan kunci apa pun
   (`itap_full`, `itap_kasir_full`, `itap_kasir_owner`, `entitled` —
   coba semuanya dengan nilai `true` / `"1"`).
3. Refresh halaman.
   HARUS: status tetap "Belum ada lisensi FULL aktif" — kunci-kunci itu
   tidak dibaca siapa pun.
4. Di DevTools > Network, cari respons `GET /api/license/entitlement`
   (harus `{ "entitled": false, ... }`). Ubah respons itu di client
   (mis. lewat override / breakpoint) menjadi
   `{ "entitled": true, "products": ["generator"] }`.
   HARUS: tampilan halaman BOLEH berubah sesaat (itu hanya tampilan),
   tetapi akses ke konten FULL yang sesungguhnya (unduh file produk /
   fitur generator / kasir) TETAP DITOLAK server — karena keputusan
   entitlement selalu diambil ulang server-side dari
   `license_activations`, bukan dari apa yang dikirim client.
   Bila ada fitur yang terbuka hanya karena respons entitlement yang
   diubah, itu BUG — catat dan laporkan (permukaan itu harus ditutup
   dengan pengecekan entitlement server-side di endpoint fitur itu juga).

## (g) Uji enumerasi KSR legacy — HANYA di lingkungan uji, bukan live

> PERINGATAN: pengujian ini MENYENTUH hash lama yang sudah publik.
> Jalankan HANYA di proyek uji / database uji, TIDAK PERNAH di proyek
> live `itap-belitung` sebelum keputusan pemilik (LIC-01). Tujuannya
> membuktikan perbaikan LIC-02 (lookup legacy per produk), bukan
> membobol kode siapa pun.

1. Di database UJI, jalankan `web/docs/license-legacy-migration.sql`
   (setelah migrasi 0007).
2. Ambil satu kode legacy yang diketahui pemiliknya (kode lama yang
   hash-nya ada di `generator/lock.js` main — pemiliknya yang
   memberikan kode itu untuk pengujian; JANGAN brute-force hash).
3. Validate kode itu TANPA field `product`:
   HARUS: `{ "ok": true, "legacy": true, "products": ["generator", "kasir"] }`
   bila kode itu hash pertama Generator (= hash owner Kasir) — kode
   membuka kedua produk (LIC-02: dua baris dikembalikan, bukan error
   maybeSingle).
4. Validate kode itu DENGAN `"product": "kasir"`:
   HARUS: `{ "ok": true, "legacy": true, "product": "kasir", ... }`.
5. Validate kode itu DENGAN `"product": "generator"`:
   HARUS: `{ "ok": true, "legacy": true, "product": "generator", ... }`.
6. Activate kode itu (JWT pengguna uji), lalu cek entitlement:
   HARUS: kedua produk muncul di `products`.
7. Setelah pengujian: revoke SEMUA baris `origin='legacy'` di database
   uji dan hapus data uji.

## Pembersihan setelah uji live

- Revoke lisensi uji (skenario d) bila belum.
- Hapus pengguna uji bila dibuat khusus untuk pengujian.
- Pastikan `license_attempts` tidak menumpuk baris uji (retensi 30 hari
  membersihkannya otomatis, atau hapus manual bila perlu).
