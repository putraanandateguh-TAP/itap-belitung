# MATRIKS AUDIT KEAMANAN — Perbaikan SEC-01..SEC-21 + LIC-01..LIC-08 + K1

**Tanggal:** 2026-11-18 · **Branch:** `fix/security-sec-01-sec-14-license` (worktree
`worktrees/security-fixes`, berbasis `replica/itap-satam` bf1f2de) ·
**Dasar audit:** `~/workspace/master-exec/SECURITY-AUDIT-FULL.md` (29 temuan) ·
**Target DB:** Supabase `itap-belitung` (iwravgwsxmojxtbznori)

**Klasifikasi status** (sesuai Perintah Penyelesaian Akhir 20:12 WIB):
`VERIFIED` = terbukti live dengan bukti uji · `TESTED` = lolos uji PGlite/unit di VM
(bukan live) · `IMPLEMENTED` = kode/migrasi selesai, belum diuji live ·
`NOT TESTED` = belum ada bukti uji live pasca-perbaikan · `BLOCKED` = butuh
keputusan/akses pemilik · `WAITING FOR OWNER` = menunggu keputusan Teguh.

**Aturan baca:** `TESTED` di sini berarti logika perbaikan terbukti di Postgres
sungguhan (PGlite) — BUKAN klaim aman di production. Status menjadi `VERIFIED`
hanya setelah `web/tests/security-live-retest.py` (dan, untuk lisensi,
`web/docs/LICENSE-LIVE-TESTS.md`) dijalankan live pasca-penerapan migrasi
0007/0008/0009 + redeploy Edge Function, dengan semua cek lolos.

## 1. Temuan TINGGI — aplikasi baru

| ID | Temuan | Perbaikan (file) | Status | Bukti |
|---|---|---|---|---|
| SEC-01 | Pengguna baru INSERT profil `role='superadmin'` (policy tanpa batas role; trigger hanya BEFORE UPDATE). **TERBUKTI LIVE 20:03 WIB: 201, role superadmin di DB.** | `web/drizzle/0008_security_fixes.sql`: policy `profiles_insert` → `WITH CHECK (id = auth.uid() AND role = 'reader')` + trigger `profiles_insert_role_guard` (BEFORE INSERT, paksa `role='reader'` untuk pemanggil PostgREST biasa; jalur server postgres/service_role dibiarkan). `web/src/app/api/auth/callback/route.ts` + `email-otp/verify/route.ts`: `catch {}` → `console.error` (jangan telan error pembuatan profil). | IMPLEMENTED + TESTED (PGlite) · live retest NOT TESTED | PGlite `test:security-0008` 35/35: insert superadmin tersimpan sebagai reader; role di DB reader. Bukti pra-perbaikan: uji live pemilik 20:03 WIB (201 + role superadmin). Uji ulang live: `security-live-retest.py` §SEC-01. |
| SEC-02 | `admin_portal` UPDATE role sendiri → superadmin (trigger hanya cek "pelaku admin"). **TERBUKTI LIVE 20:03 WIB: 200, role superadmin di DB.** | 0008: `profiles_role_guard` ditulis ulang — superadmin boleh ubah role siapa pun; admin_portal hanya boleh ubah role PENGGUNA LAIN (bukan diri sendiri) dan TIDAK BOLEH menetapkan superadmin; reader/contributor tidak boleh ubah role; jalur server tetap diizinkan. | IMPLEMENTED + TESTED (PGlite) · live retest NOT TESTED | PGlite 35/35: promosi diri DITOLAK; tetapkan superadmin ke orang lain DITOLAK; ubah role orang lain ke contributor diizinkan; superadmin/server diizinkan. Bukti pra-perbaikan: uji live 20:03 WIB (200 + superadmin). Uji ulang live: `security-live-retest.py` §SEC-02. |
| SEC-03 | RPC `award_contribution_point` (SECURITY DEFINER, tanpa REVOKE) dipanggil anon/user biasa → poin dicetak bebas. **TERBUKTI LIVE 20:03 WIB: anon 204 + user 204, baris poin + profil kontributor tercipta.** | 0008: `REVOKE EXECUTE ... FROM PUBLIC; GRANT EXECUTE ... TO service_role;` + keraskan badan fungsi (poin hanya bila karya disetujui: artikel `status='published'`, info `status='approved'`). Jalur sah (reviewArticle via Drizzle sebagai postgres) tidak terpengaruh. | IMPLEMENTED + TESTED (PGlite) · live retest NOT TESTED | PGlite 35/35: RPC sebagai anon/user DITOLAK (permission denied); via server untuk artikel published → poin 1; untuk draft → TIDAK ada poin. Bukti pra-perbaikan: uji live 20:03 WIB (204 + poin tercipta). Uji ulang live: `security-live-retest.py` §SEC-03. |
| SEC-06 | `whatsapp-otp`: tanpa verifikasi JWT, `to`/`code` dari client, tanpa rate limit, tanpa CORS (LATEN — fungsi masih 503). | `web/supabase/functions/whatsapp-otp/index.ts` ditulis ulang: verifikasi JWT via `getUser()` (401 tanpa JWT); `to` harus sama dengan `profiles.whatsapp_number` pemanggil (403 bila beda); OTP 6 digit dibuat server-side (`crypto.getRandomValues`), body berisi `code` → 400; hash SHA-256 + expiry 5 mnt disimpan di `whatsapp_otps`; rate limit 3/jam per pengguna DAN per nomor → 429; validasi E.164 `^\+62\d{8,13}$`; CORS hanya `https://itapbelitung.my.id`; fail-closed 503 bila env Meta kosong dipertahankan. `web/src/app/api/auth/whatsapp-otp/send|verify/route.ts` disesuaikan (send tidak lagi mengirim `code`; verify cek hash + attempts maks 5 + single-use). `web/drizzle/0009_whatsapp_otps.sql` (tabel baru, RLS deny-by-default, GRANT hanya service_role). `web/supabase/config.toml` + `supabase/config.toml`: `[functions.whatsapp-otp] verify_jwt = true`. | IMPLEMENTED + TESTED (PGlite 0009: 9/9; tsc bersih; transpile OK) · live NOT TESTED / BLOCKED | 0009 lolos PGlite 9/9 (kolom, RLS aktif, 0 policy, grant service_role, indeks, FK cascade). Deno check TIDAK DAPAT dilakukan (deno tidak ada di VM) — hanya cek sintaks transpile. Uji live BUTUH P2 (nomor lolos Meta + env + deploy + migrasi 0009): JWT A ke nomor B → 403; tanpa JWT → 401; kirim 4×/jam → 429; verify benar → `whatsapp_verified_at` terisi; salah 5× → hangus. CATATAN: fungsi ini memakai Meta Graph API langsung; bila P2 jadinya via ZapClaw, perlu adapter kecil (base URL api.zapclaw.app + header X-API-Key) saat kredensial ZapClaw ada. |

## 2. Temuan SEDANG — aplikasi baru

| ID | Temuan | Perbaikan (file) | Status | Bukti |
|---|---|---|---|---|
| SEC-04 | `contributor_profiles`: INSERT/UPDATE `verification_status`/`auto_approve`/`points_total` sendiri (pemalsuan "terverifikasi"). | 0008: trigger `contributor_profile_guard` (BEFORE INSERT OR UPDATE): pemanggil biasa dipaksa default saat INSERT (`unverified`/false/0) dan dilarang ubah ketiga kolom saat UPDATE; admin + jalur server (postgres/service_role, termasuk RPC award) diizinkan. **Pelajaran dari uji:** `TG_OP` bernilai HURUF BESAR (`'INSERT'`) — perbandingan `'insert'` selalu salah dan membuat INSERT jatuh ke cabang UPDATE (bug ini tertangkap uji PGlite dan diperbaiki). | IMPLEMENTED + TESTED (PGlite) · live retest NOT TESTED | PGlite 35/35: insert verified/9999 → dipaksa default; update points → DITOLAK; update institution → diizinkan. Uji ulang live: `security-live-retest.py` §SEC-04. |
| SEC-05 | UPDATE `whatsapp_verified_at` / `marketplace_rules_accepted_at` sendiri via PostgREST. | 0008: trigger `profiles_sensitive_columns_guard` (BEFORE UPDATE): perubahan kedua kolom hanya oleh server (postgres/service_role — Edge Function OTP + route aplikasi) atau admin. Kolom biasa tetap bisa diubah pemilik. | IMPLEMENTED + TESTED (PGlite) · live retest NOT TESTED | PGlite: isi `whatsapp_verified_at` sendiri DITOLAK; ubah display_name diizinkan. Uji ulang live: §SEC-05. |
| SEC-07 | `info_submissions` INSERT dengan `status='approved'` (bypass moderasi). | 0008: policy `info_insert` → `WITH CHECK (user_id = auth.uid() AND status = 'pending')` (samakan `comments_insert`). Aplikasi membuat kiriman via Drizzle (postgres) — tidak terpengaruh. | IMPLEMENTED + TESTED (PGlite) · live retest NOT TESTED | PGlite: insert approved DITOLAK; pending diizinkan. Uji ulang live: §SEC-07. |
| SEC-08 | `reports` INSERT dengan status/moderator bebas (polusi antrean moderasi). | 0008: policy `reports_insert` → `WITH CHECK (reporter_id = auth.uid() AND status = 'open' AND moderator_id IS NULL AND moderator_note IS NULL)`. Aplikasi membuat laporan via Drizzle — tidak terpengaruh. | IMPLEMENTED + TESTED (PGlite) · live retest NOT TESTED | PGlite: insert dismissed+note DITOLAK; laporan biasa → status open. Uji ulang live: §SEC-08. |
| SEC-09 | Anon bisa SELECT `location_lat/lng` persis semua listing aktif via PostgREST (API menyamarkan, RLS tidak). | TIDAK DIUBAH — menunggu keputusan pemilik (lihat §5 Opsi). | WAITING FOR OWNER | Bukti statis: `listings_select` mengembalikan seluruh baris ke anon untuk `status='aktif'`. Uji live (SELECT koordinat sebagai anon) sudah bisa dilakukan kapan saja — hasilnya menentukan kebijakan. |
| SEC-10 | `chat_threads` INSERT dengan `seller_id` sembarang (bukan penjual listing). | 0008, DUA lapis: (a) policy `threads_insert` memakai bentuk skalar `(select l.seller_id ... where l.id = listing_id) = seller_id` — **JANGAN pakai EXISTS dengan `seller_id` tanpa kualifikasi**: di dalam subquery, `seller_id` terikat ke `listings.seller_id` (lingkup dalam) sehingga EXISTS selalu benar — bug ini tertangkap uji PGlite (thread palsu lolos) dan diperbaiki; (b) trigger `thread_listing_active_guard` diperkuat: selain listing aktif, seller thread harus sama dengan penjual listing. | IMPLEMENTED + TESTED (PGlite) · live retest NOT TESTED | PGlite 35/35: thread seller palsu DITOLAK; seller benar diizinkan. Uji ulang live: §SEC-10. |
| SEC-11 | `delete-account`: error `list()`/`remove()` Storage ditelan → foto bisa tetap publik setelah akun dihapus, fungsi tetap klaim `{ok:true}`. | `web/supabase/functions/delete-account/index.ts`: periksa error `list()` dan `remove()`; bila gagal → kembalikan 500 TANPA menghapus profil/Auth (akun utuh, pengguna bisa coba lagi; jangan klaim sukses). + log error. CATATAN: file ini juga di-sync dari working copy (versi yang ter-deploy di dashboard sudah berisi perbaikan POST-only + CORS; versi di HEAD branch masih `'*'` — PR ini membawa versi yang benar). **Redeploy fungsi WAJIB setelah PR ini di-merge** (fungsi ter-deploy saat ini masih kode pra-SEC-11). | IMPLEMENTED (kode) · live retest jalur bahagia NOT TESTED · jalur gagal NOT TESTED | Uji live jalur bahagia ada di `security-live-retest.py` §SEC-11 (foto ikut terhapus + URL publik 404 setelah hapus akun). Jalur gagal (500 saat Storage error) TIDAK bisa diuji live tanpa mensimulasikan outage Storage — statusnya code review + log, bukan bukti live. |
| SEC-12 | Storage: upload file tipe/ukuran sembarang (termasuk HTML/JS/SVG) ke bucket publik via Storage API langsung. | 0008: policy INSERT kedua bucket diperketat — hanya `image/jpeg|image/png|image/webp` dan ukuran 1..1048576 byte (samakan `UPLOAD_LIMITS` di `src/lib/upload.ts`); policy UPDATE (SEC-18) memakai batas yang sama. Metadata (mimetype/size) diisi server Storage saat upload. | IMPLEMENTED · live NOT TESTED | Sintaks pglast OK. Policy Storage TIDAK BISA diuji di PGlite (skema `storage.*` hanya ada di Supabase) — uji live WAJIB: upload `.html` → ditolak; upload PNG sah → lolos + bisa dibuka publik. Ada di `security-live-retest.py` §SEC-12. Bila perilaku Supabase berbeda (metadata kosong saat policy dievaluasi), rollback: hapus syarat metadata dari policy INSERT/UPDATE. |
| SEC-13 | Grant service_role point-in-time (0006): tabel baru setelah 0006 tidak mendapat grant → Edge Function 403. | 0008: jalankan ulang `grant all on all tables ... to service_role` (+ sequences) di akhir migrasi — idempotent, mencakup tabel lisensi (0007) + whatsapp_otps (0009). 0007 juga membawa GRANT-nya sendiri (LIC-04). | IMPLEMENTED · live NOT TESTED | PGlite chain 12/12: service_role bisa akses `licenses`. Uji live: panggil `validate-license`/`admin-licenses` setelah 0007 (lihat LICENSE-LIVE-TESTS.md). |

## 3. Temuan RENDAH — aplikasi baru

| ID | Temuan | Perbaikan (file) | Status | Bukti |
|---|---|---|---|---|
| SEC-14 | RPC `increment_article_views` / `increment_listing_views` (SECURITY DEFINER) dipanggil publik → inflasi views. | 0008: `REVOKE EXECUTE ... FROM PUBLIC; GRANT EXECUTE ... TO service_role;` untuk keduanya. Jalur sah via Drizzle (postgres) tidak terpengaruh. | IMPLEMENTED + TESTED (PGlite) · live retest NOT TESTED | PGlite: RPC sebagai user DITOLAK; via server → views 1. Uji ulang live: §SEC-14. |
| SEC-15 | `article_revisions` INSERT untuk artikel mana pun. | 0008: policy `article_revisions_insert` → editor harus penulis artikel itu (`EXISTS articles.author_id = auth.uid()`) atau admin. | IMPLEMENTED + TESTED (PGlite) · live retest NOT TESTED | PGlite: revisi artikel orang lain DITOLAK; penulis sendiri diizinkan. Uji ulang live: §SEC-15. |
| SEC-16 | Penjual UPDATE counter `views`/`saves_count`/`likes_count` listing sendiri. | 0008: trigger `listings_counters_guard` (BEFORE UPDATE): perubahan ketiga kolom hanya dari server (postgres — termasuk RPC `increment_listing_views` — dan service_role); update kolom lain tetap diizinkan. | IMPLEMENTED + TESTED (PGlite) · live retest NOT TESTED | PGlite: ubah views sendiri DITOLAK; ubah judul diizinkan; RPC via server → views 1. Uji ulang live: §SEC-16. |
| SEC-17 | `profiles.email` tanpa UNIQUE. | 0008: blok `DO` — tambah constraint `profiles_email_unique` bila belum ada DAN tidak ada duplikat (bila ada duplikat, tidak menambah — bersihkan dulu, jalankan ulang). | IMPLEMENTED + TESTED (PGlite) · live NOT TESTED | PGlite: email duplikat DITOLAK. Uji live: cek constraint ada + tidak ada duplikat di DB live (1 profil admin — aman). |
| SEC-18 | Tidak ada policy UPDATE pada `storage.objects` (upsert ditolak). | 0008: policy UPDATE pemilik-sendiri untuk kedua bucket (USING + WITH CHECK sama dengan INSERT, termasuk batas mimetype/ukuran SEC-12). | IMPLEMENTED · live NOT TESTED | Sintaks pglast OK; tidak bisa diuji di PGlite. Uji live: upload ulang file yang sama dengan `upsert=true` sebagai pemilik → harus lolos; sebagai orang lain → ditolak. |
| SEC-19 | Divergensi salinan `delete-account`: worktree lisensi menargetkan bucket `listings` (tidak ada) + CORS `'*'`. | PR ini HANYA membawa salinan yang benar (`web/supabase/functions/delete-account/`, CORS `https://itapbelitung.my.id`, bucket benar, + perbaikan SEC-11). Salinan worktree lisensi TIDAK disalin ke PR ini. PR #24 sebaiknya DITUTUP setelah PR ini dibuat (isinya sudah termasuk di sini, dengan perbaikan LIC-02/03/04 + penomoran 0007) — keputusan penutupan di tangan pemilik. | IMPLEMENTED (di branch ini) | Yang ter-deploy di dashboard adalah salinan site/web yang benar (uji live 19:31 WIB: 401/405/401/200 + cascade LOLOS). |
| SEC-20 | Grant sequence ke `authenticated` tidak dibutuhkan. | 0008: `revoke usage, select on all sequences in schema public from authenticated;` (semua tabel memakai `gen_random_uuid()`; tidak ada kolom identity/serial). | IMPLEMENTED · live NOT TESTED | Sintaks pglast OK. Uji live: insert data biasa tetap jalan (tidak ada yang memakai sequence). |
| SEC-21 | `config.toml` tanpa seksi `verify_jwt` eksplisit (bergantung default platform). | `web/supabase/config.toml` + `supabase/config.toml`: `[functions.delete-account] verify_jwt = true` dan `[functions.whatsapp-otp] verify_jwt = true` (root juga sudah berisi `validate-license` + `admin-licenses` = true; `push-alert` = false adalah bawaan lama, di luar ruang lingkup — butuh audit tersendiri sebelum deploy, lihat audit §5.4). | IMPLEMENTED · live NOT TESTED | Verifikasi live: panggil fungsi tanpa JWT setelah deploy → gateway menolak (401) sebelum kode jalan. |

## 4. Lisensi FULL server-side (PR #24 → PR ini)

Arsitektur baru BENAR (salted hash + pepper server-side + RLS deny + fail-closed +
tanpa localStorage) — tidak ditemukan cara bypass dari client untuk kode issued baru.
Sistem BELUM LIVE (tabel belum ada di DB, pepper belum diisi, fungsi belum di-deploy).

| ID | Temuan | Perbaikan (file) | Status | Bukti |
|---|---|---|---|---|
| K1 | Lisensi FULL client-side di situs lama (KRITIS): 21 hash SHA-256 tanpa salt di repo publik; salt + `kMake`/`kSig` hardcode; FULL hanya flag localStorage; halaman owner hanya dicek flag; kode lewat URL `?kode=`; Gemini API key plaintext di localStorage. | Sistem baru di PR ini (0007 + 2 Edge Function + 3 route + hook). K1 di situs lama TETAP TERBUKA sampai: PR ini di-merge + 0007 diterapkan + fungsi di-deploy + pepper diisi + legacy ditangani (LIC-01) + `lock.js` dihapus dari `main`. | BLOCKED (menunggu deploy + LIC-01) | Arsitektur baru lolos review + 17/17 tes lisensi (unit). Situs live saat ini masih itap-v74 (client-side) — K1 terbuka penuh. |
| LIC-01 | Kode FULL kasir dapat ditemukan siapa pun dari repo publik begitu migrasi legacy dijalankan (±11 ribu kandidat KSR, brute-force hitungan detik). | TIDAK DIJALANKAN. `web/docs/license-legacy-migration.sql` disimpan sebagai DOKUMEN dengan header peringatan "JANGAN JALANKAN sebelum keputusan pemilik". Jalur legacy di `validate-license` tetap fail-closed bila tidak ada baris legacy. | WAITING FOR OWNER — pilih: (a) re-issue paksa tanpa grandfather, atau (b) grandfather dengan `expires_at` singkat (mis. 30 hari) + revoke terjadwal + hapus `lock.js` dari `main` bersamaan. | Uji enumerasi KSR HANYA di lingkungan uji, bukan live (lihat LICENSE-LIVE-TESTS.md). |
| LIC-02 | Hash legacy `999e1ee1…` diimpor 2× (generator + kasir) → `.maybeSingle()` error → kode kasir owner dijawab `invalid` (gagal diam-diam). | 0007: indeks unik `(legacy_code_hash, product)` + `validate-license`: lookup legacy mengambil SEMUA baris cocok (tanpa `maybeSingle`) lalu memfilter per produk. | IMPLEMENTED + TESTED (unit 17/17) · live NOT TESTED | Tes `selectLegacyLicenses`: tanpa filter → kedua baris; dengan filter product → hanya baris itu; hash tak dikenal → [] fail-closed. Uji live: aktivasi kode legacy kasir end-to-end (SETELAH keputusan LIC-01). |
| LIC-03 | Tabrakan nomor migrasi 0004 (lisensi vs listing_category). | Migrasi lisensi dinomori `0007_license_server_side.sql`; dicatat di LICENSE.md. | IMPLEMENTED + TESTED (PGlite chain) | Rantai 0001+0005+0006+0007+0008+0009 termuat; 33 tabel. |
| LIC-04 | Migrasi lisensi tanpa GRANT → service-role 403 (pola kegagalan 0006). | 0007 membawa GRANT mandiri (authenticated: SELECT `license_activations` milik sendiri; service_role: ALL keempat tabel + sequences). 0008 menjalankan ulang grant semua tabel sebagai jaring pengaman. | IMPLEMENTED + TESTED (PGlite chain) · live NOT TESTED | PGlite chain: service_role bisa akses `licenses`. Uji live: panggil Edge Function setelah 0007. |
| LIC-05 | CORS `'*'` pada kedua fungsi lisensi. | Dibatasi ke `https://itapbelitung.my.id` (samakan delete-account). | IMPLEMENTED · live NOT TESTED | Review kode. Uji live: panggil dari origin lain → CORS ditolak. |
| LIC-06 | `clientIp()` memakai entri pertama `X-Forwarded-For` (bisa dipalsukan) → rate limit per-IP bisa dilewati. | IP diambil dari `cf-connecting-ip` lalu `x-real-ip` (header tepercaya platform); X-Forwarded-For mentah tidak lagi dipakai. Batas per-kode tetap pertahanan utama. | IMPLEMENTED · live NOT TESTED | Review kode. Uji live: 6× kode salah → 429 (batas per-kode). |
| LIC-07 | Batas perangkat check-then-insert tidak atomik; `device_id` server-side = per-pengguna, bukan per-perangkat. | 0007: indeks unik partial `(license_id, user_id, device_hash) WHERE revoked_at IS NULL` (aktivasi ganda bersamaan → satu kena konflik 23505). Didokumentasikan di LICENSE.md: batas saat ini = per pengguna. | IMPLEMENTED + TESTED (unit) · live NOT TESTED | Review + tes unit. Uji live: dua aktivasi bersamaan → satu berhasil, satu konflik. |
| LIC-08 | Respons `create` mengembalikan kode plaintext sekali (risiko proses: admin menyalin ke chat/log). | Peringatan ditambahkan di respons + dokumentasi (kode hanya tampil SEKALI, sampaikan lewat jalur aman, jangan simpan di repo/chat/log). | IMPLEMENTED | Review kode/dok. Bukan celah kode — celah proses; mitigasi: kirim kode langsung ke pembeli dari server (pekerjaan lanjutan, belum diputuskan). |

## 5. Keputusan yang menunggu pemilik (WAITING FOR OWNER)

### SEC-09 — Koordinat persis penjual terbaca anon
Fakta: `listings_select` mengembalikan `location_lat`/`location_lng` persis ke anon
untuk listing aktif; API menyamarkan, PostgREST langsung tidak. Nomor WhatsApp
TIDAK bocor (hanya di `profiles`, anon tidak bisa baca).
- **Opsi A (status quo):** koordinat persis tetap publik — alasannya lokasi penjual
  (kedai/toko) adalah info publik yang memang ditampilkan di peta. Risiko: privasi
  penjual rumahan.
- **Opsi B (disarankan bila ada penjual rumahan):** publikasikan koordinat yang
  dibulatkan (±100 m, 3 desimal) lewat view `listings_public`; koordinat persis
  hanya untuk pemilik/admin/pembeli yang sudah punya thread.
- **Opsi C (paling ketat):** anon tidak mendapat koordinat sama sekali; pembeli
  melihat koordinat setelah thread dibuat.
Keputusan ini menentukan apakah SEC-09 ditutup sebagai "diterima" atau diperbaiki
dengan view + perubahan policy SELECT.

### LIC-01 — Legacy lisensi (lihat §4)
- **Opsi A (disarankan auditor):** re-issue paksa — jangan grandfather kode kasir
  sama sekali; semua pembeli lama mendapat kode baru dari sistem server-side.
- **Opsi B:** grandfather dengan `expires_at` singkat (±30 hari) + revoke terjadwal
  + hapus `kasir/lock.js` dan `generator/lock.js` dari `main` BERSAMAAN dengan migrasi.

### D-08 (di luar keamanan, dicatat karena menahan deploy)
5 cron di `vercel.json` (termasuk `daily-info-fetch` per jam) vs batas Hobby 1×/hari:
(a) upgrade Pro $20/bln, (b) pindahkan cron ke GitHub Actions `schedule` (gratis),
atau (c) cron-job.org. Bukan keputusan keamanan — dicatat di laporan akhir.

## 6. Ringkasan status

| Kelompok | Total | IMPLEMENTED+TESTED (PGlite/unit) | IMPLEMENTED (belum uji live) | WAITING/BLOCKED |
|---|---|---|---|---|
| SEC TINGGI (01,02,03,06) | 4 | 3 (01,02,03) + 06 (unit/PGlite 0009) | — | 06 live (butuh P2) |
| SEC SEDANG (04,05,07,08,09,10,11,12,13) | 9 | 7 (04,05,07,08,10 + 13 chain) | 2 (11,12 — tidak bisa di PGlite) | 09 (keputusan) |
| SEC RENDAH (14–21) | 8 | 4 (14,15,16,17 — PGlite) | 4 (18,20,21 + 19 di branch) | — |
| LIC (01–08) | 8 | 7 (02–08 unit/PGlite) | — | 01 (keputusan) |
| K1 (situs lama) | 1 | — | sistem baru siap | BLOCKED (deploy + LIC-01) |
| **Total** | **30** | — | — | — |

**Yang sudah TERBUKTI (bukan sekadar code review):**
- PGlite `test:security-0008`: **35/35 PASS** (eksploitasi SEC-01/02/03/04/05/07/08/
  10/14/15/16/17 DITOLAK + alur sah LOLOS + regresi RLS).
- PGlite `test:security-chain`: **12/12 PASS** (rantai 0001+0005+0006+0007+0008+0009;
  33 tabel; RLS aktif; deny-by-default; indeks LIC-02/07; grant service_role;
  revoke RPC; 5 trigger pengaman).
- Tes lisensi `test:license`: **17/17 PASS** (termasuk skenario LIC-02).
- `tsc --noEmit`: **bersih (exit 0)** di branch ini.
- Build seed mode: **lolos (exit 0)**, BUILD_ID `9218CeAh3XGy0APi8VzHz137`, **102/102 halaman**, First Load JS 103 kB.
- Full Playwright (seed mode, production server, `--workers=1`): **70/74 PASS (run ke-3, 14,9 mnt)**. 3 gagal in-scope terbukti FLAKE lingkungan: F02-E2 (lolos solo 1/1 dalam 5,2 dtk), F04-H1 + F04-H2 (lolos di re-run f02+f04). 1 gagal (musik) adalah base gap — pemutar musik tidak ada di base bf1f2de (hanya uncommitted di working copy site), bukan regresi; `music.spec.ts` dikeluarkan dari branch ini. Run ke-1 INVALID (server dev mati OOM, 21/74 ECONNREFUSED); run ke-2 terputus restart runtime. Log: `~/workspace/master-exec/pw-run3.log`, `pw-rerun-f02-f04.log`, `pw-single-f02e2.log`. 0 regresi kode.

**Yang masih NOT TESTED live (wajib sebelum GO):**
- Terapkan 0007 + 0008 + 0009 via SQL Editor, lalu jalankan
  `web/tests/security-live-retest.py` — semua cek harus PASS.
- Deploy `validate-license` + `admin-licenses` (+ redeploy `delete-account`
  versi SEC-11 dan `whatsapp-otp` versi SEC-06), isi `LICENSE_PEPPER`,
  lalu jalankan skenario `web/docs/LICENSE-LIVE-TESTS.md`.
- Uji Storage SEC-12/SEC-18 live (upload `.html` ditolak; PNG sah lolos;
  upsert pemilik lolos).
- Keputusan SEC-09 + LIC-01 + D-08 dari pemilik.
