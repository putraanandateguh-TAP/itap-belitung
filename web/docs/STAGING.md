# Staging Environment — iTAP Belitung

**Status dokumen:** desain + skrip siap; proyek Supabase staging BELUM dibuat
(prosesnya butuh tindakan pemilik lewat browser — lihat §1).
**Cakupan:** aplikasi baru Next.js + TypeScript + Supabase + Drizzle di `web/`,
branch `replica/itap-satam`, ditambah validasi lisensi server-side PR #24
(branch `feat/license-server-side`, base `replica/itap-satam`).
**Prinsip:** staging adalah cermin production yang TIDAK PERNAH menyentuh
data, kredensial, atau layanan production. Semua eksperimen, seed dummy,
dan automated test black-box jalan di staging.

> **JANGAN PERNAH** menjalankan seed/migrasi/test suite ini ke proyek
> production `itap-belitung` (ref `iwravgwsxmojxtbznori`). Guard di
> `scripts/seed-staging.ts` menolak `DATABASE_URL` production dan hanya
> menerima `STAGING_DATABASE_URL`.

## 1. Membuat proyek Supabase staging (manual — pemilik, lewat browser)

1. Buka https://supabase.com/dashboard — login sebagai
   `putraanandateguh@gmail.com` (akun yang sama dengan production).
2. **New project** (bukan di organisasi production bila ada — buat di
   organisasi yang sama tidak apa-apa, yang penting proyeknya beda):
   - **Name:** `itap-belitung-staging`
   - **Database Password:** buat baru yang BERBEDA dari production
     (simpan di Secure Vault, beri label `Supabase staging DB password`).
   - **Region:** Singapore (`ap-southeast-1`) — sama dengan production.
   - **Plan:** Free.
3. Setelah proyek `Healthy`, catat dari **Project Settings → API**:
   - Project URL → `STAGING_SUPABASE_URL`
   - `anon public` key → `STAGING_SUPABASE_ANON_KEY`
   - `service_role` key → `STAGING_SUPABASE_SERVICE_ROLE_KEY` (server saja!)
   - Project ref (bagian dari URL, mis. `abcdefghijklmnopqrst`) — dipakai
     untuk `supabase link --project-ref <ref-staging>`.
4. Dari **Project Settings → Database → Connection string → Session pooler**
   (port 5432) → `STAGING_DATABASE_URL`
   (format `postgresql://postgres.<ref>:<db-password>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres`).
   JANGAN pakai connection string production.
5. **Authentication → URL Configuration:**
   - Site URL: `https://<staging-domain>` (lihat §4; sementara boleh
     `http://localhost:3100` untuk uji lokal).
   - Redirect URLs: tambahkan `https://<staging-domain>/api/auth/callback`.
   - **Confirm email: AKTIF** (sama seperti production) — atau MATIKAN
     sementara bila test signup otomatis butuh login langsung tanpa inbox
     (lihat `docs/TEST_PLAN.md` § "Akun test"). Keputusan ini dicatat di
     sini saat staging dibuat; default: AKTIF, dan test memakai OTP
     via email test atau mematikan konfirmasi hanya di staging.
6. **Authentication → Providers:** aktifkan Email + Google (Google OAuth
   client yang sama boleh dipakai; redirect staging harus didaftarkan di
   Google Cloud Console bila login Google diuji di staging).
7. **Storage:** bucket dibuat OTOMATIS oleh migrasi `0002_storage.sql`
   (`article-images`, `listing-photos`) — jangan buat manual dengan nama
   lain. Bucket staging terpisah total dari production karena proyeknya
   beda, walau namanya sama.
8. **Edge Functions** (deploy dari repo — lihat §3):
   `validate-license`, `admin-licenses` (PR #24, di `supabase/functions/`),
   `delete-account`, `chat`, `push-alert` (di `web/supabase/functions/`).
   Perintah deploy dijalankan DUA kali dengan `--project-ref` berbeda
   (production vs staging) — jangan tertukar.
9. **Secrets staging** (Dashboard → Edge Functions → Secrets, atau CLI):
   `LICENSE_PEPPER` staging = nilai DUMMY dari `web/.env.staging.example`
   (`staging-pepper-dummy-0123456789abcdef`). Nilai ini HANYA untuk
   staging — pepper production HARUS beda dan rahasia. Seed lisensi
   (`scripts/seed-staging.sql`) hash-nya dihitung dari pepper dummy ini;
   bila pepper staging diganti, hash di seed harus dihitung ulang
   (lihat `scripts/seed-staging.sql` § header).
10. **Database → Replication / Webhooks:** TIDAK ADA replikasi dari
    production ke staging. Staging TIDAK PERNAH berisi data asli.

## 2. Variabel lingkungan staging

Template lengkap (placeholder saja, tanpa nilai asli):
`web/.env.staging.example`. Salin ke `web/.env.staging.local`
(yang ini TIDAK di-commit — sudah tercakup pola `.env*.local` di
`.gitignore` repo; verifikasi sebelum commit pertama).

| Variabel | Keterangan |
|---|---|
| `STAGING_BASE_URL` | URL deployment staging (Vercel) atau `http://localhost:3100` untuk uji lokal |
| `STAGING_SUPABASE_URL` | Project URL staging (bukan production) |
| `STAGING_SUPABASE_ANON_KEY` | anon key staging |
| `STAGING_SUPABASE_SERVICE_ROLE_KEY` | service-role staging — HANYA server/CLI, jangan ke frontend |
| `STAGING_DATABASE_URL` | Session pooler staging (port 5432) |
| `STAGING_CRON_SECRET` | Secret cron staging — BERBEDA dari production |
| `STAGING_LICENSE_PEPPER` | Pepper dummy staging (lihat §1 langkah 9) |
| `STAGING_ADMIN_EMAIL` / `STAGING_ADMIN_PASSWORD` | Akun admin test (dibuat di §3) |
| `STAGING_BUYER_EMAIL` / `STAGING_BUYER_PASSWORD` | Akun pembeli test |
| `STAGING_READER_EMAIL` / `STAGING_READER_PASSWORD` | Akun reader test |

Aturan penamaan: SEMUA variabel staging berawalan `STAGING_`.
Aplikasi production membaca `NEXT_PUBLIC_SUPABASE_URL` /
`DATABASE_URL` / `CRON_SECRET` (tanpa prefix) — pemisahan nama ini
yang mencegah test suite salah sasaran ke production. Test suite
(`web/e2e/staging/`) MEMBACA HANYA variabel `STAGING_*` dan menolak
jalan bila `STAGING_BASE_URL` kosong.

## 3. Migrasi + seed di staging

Jalankan dari worktree/branch staging (bukan dari working copy utama):

```bash
cd web
# 1. Migrasi 0001–0003 (branch replica/itap-satam) + 0004 lisensi (PR #24).
#    PR #24 HARUS sudah di-merge ke branch staging sebelum seed lisensi.
#    Opsi A — lewat Supabase SQL Editor proyek STAGING (paling aman di VM
#    ini, karena koneksi Postgres langsung dari VM diblokir egress proxy):
#    tempel isi web/drizzle/0001_init.sql, 0002_storage.sql,
#    0003_content_columns.sql, lalu 0004_license_server_side.sql
#    (dari branch feat/license-server-side) satu per satu, urut.
#    Opsi B — dari mesin yang bisa konek Postgres langsung:
STAGING_DATABASE_URL='postgresql://...' npm run db:migrate:staging
#    (script ini HANYA membaca STAGING_DATABASE_URL; lihat scripts/migrate.ts)

# 2. Buat 3 akun test di staging (Dashboard → Authentication → Add user,
#    atau signup lewat /masuk di deployment staging):
#      - admin test  (STAGING_ADMIN_EMAIL)  → ubah role jadi superadmin
#        di SQL Editor staging:
#        update public.profiles set role='superadmin' where email='<admin-test>';
#      - buyer test  (STAGING_BUYER_EMAIL)  → role reader (default)
#      - reader test (STAGING_READER_EMAIL) → role reader (default)
#    Catat UUID ketiganya (kolom id di auth.users / profiles).

# 3. Seed dummy (butuh UUID 3 akun di atas):
STAGING_DATABASE_URL='postgresql://...' \
STAGING_ADMIN_ID='<uuid-admin-test>' \
STAGING_BUYER_ID='<uuid-buyer-test>' \
STAGING_READER_ID='<uuid-reader-test>' \
npm run db:seed:staging
#    Runner menolak jalan bila salah satu UUID kosong, dan menolak
#    STAGING_DATABASE_URL yang mengandung ref production
#    (iwravgwsxmojxtbznori). Idempotent: aman dijalankan ulang
#    (ON CONFLICT DO NOTHING).

# 4. Deploy Edge Functions ke STAGING (dari root repo):
supabase link --project-ref <ref-staging>
supabase functions deploy validate-license admin-licenses
supabase secrets set LICENSE_PEPPER='staging-pepper-dummy-0123456789abcdef' --project-ref <ref-staging>
#    (Fungsi lain — delete-account/chat/push-alert — dari web/supabase/functions
#    bila dibutuhkan; lihat catatan §5.)
```

Isi seed (`web/scripts/seed-staging.sql`): 2 kategori dummy, 3 artikel
dummy (2 published, 1 draft), 3 listing dummy, 7 lisensi dummy
(valid lifetime generator + kasir, expired, revoked, aktif-tapi-
lewat-tanggal, device-limit max_devices=1, monthly). Semua
berlabel `[STAGING-TEST]` / alamat email `*.staging-test.invalid`
agar tidak tertukar dengan data asli. TIDAK ADA data asli, TIDAK ADA
password/kunci asli.

## 4. Deployment staging (Vercel)

1. Di Vercel, buat proyek **terpisah** dari production (atau satu proyek
   dengan dua environment — yang dipilih: proyek terpisah agar env tidak
   tertukar): `itap-belitung-staging`.
2. Hubungkan ke repo yang sama, branch `chore/staging-tests` (saat ini)
   — setelah PR #24 + PR staging ini di-merge ke `replica/itap-satam`,
   ganti ke branch `replica/itap-satam` dengan deployment Preview.
   JANGAN hubungkan staging ke `main`.
3. Environment Variables staging (isi dari §2, nilai dari proyek
   Supabase staging — BUKAN production):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_SITE_URL=https://<staging-domain>`,
   `CRON_SECRET` (= nilai `STAGING_CRON_SECRET`), dan
   `SUPABASE_SERVICE_ROLE_KEY` staging bila dibutuhkan server.
   JANGAN isi `LICENSE_PEPPER` di Vercel — pepper hanya secret
   Edge Function Supabase.
4. Domain: pakai domain Vercel bawaan (`*.vercel.app`) atau subdomain
   `staging.itapbelitung.my.id` (butuh DNS — tindakan pemilik).
   Production tetap `itapbelitung.my.id` dan TIDAK disentuh.
5. **Cron:** Vercel Cron HANYA aktif di production (`vercel.json`
   di branch production). Di proyek staging, cron dimatikan
   (tidak ada `crons` di `vercel.json` staging) ATAU cron staging
   memakai `CRON_SECRET` staging yang berbeda — agar cron staging
   tidak pernah memicu job production. Cron staging diuji manual
   dengan memanggil endpoint + header `Authorization: Bearer
   <STAGING_CRON_SECRET>`.

## 5. Pemisahan staging vs production (matriks)

| Aspek | Production | Staging |
|---|---|---|
| Proyek Supabase | `itap-belitung` (`iwravgwsxmojxtbznori`) | `itap-belitung-staging` (ref baru) |
| Database | Postgres production | Postgres staging (kosong + seed dummy) |
| Storage bucket | `article-images`, `listing-photos` (prod) | nama sama, proyek beda → terpisah |
| Auth users | pengguna asli | 3 akun `*.staging-test.invalid` |
| `LICENSE_PEPPER` | rahasia, Secure Vault | dummy `staging-pepper-dummy-...` |
| `CRON_SECRET` | production | staging (beda nilai) |
| Vercel | proyek production, domain `itapbelitung.my.id` | proyek terpisah, domain staging |
| Lisensi | kode pembeli asli | kode `ITAP-TEST-*` (dummy) |
| Seed | TIDAK PERNAH | `scripts/seed-staging.sql` |
| Data | asli | dummy berlabel `[STAGING-TEST]` |

**Catatan Edge Functions:** PR #24 menaruh `validate-license` +
`admin-licenses` di `supabase/functions/` (root repo), sementara
fungsi lain (`delete-account`, `chat`, `push-alert`, `whatsapp-otp`)
ada di `web/supabase/functions/`. Supabase CLI `link` + `deploy`
hanya memakai SATU direktori `supabase/` per perintah — deploy dari
root repo untuk fungsi lisensi, dan dari `web/` untuk fungsi lainnya,
masing-masing dengan `--project-ref` staging yang sama. Ketidak-
konsistenan lokasi ini sebaiknya dirapikan saat PR #24 di-merge
(satu direktori `supabase/functions/` saja).

## 6. Menjalankan test suite melawan staging

```bash
cd web
# Semua nilai dari .env.staging.local (jangan commit file itu):
set -a; source .env.staging.local; set +a
npm run test:staging        # Playwright black-box vs STAGING_BASE_URL
npm run test:seed-staging   # unit test hash seed (lokal, tanpa staging)
```

Test suite menolak jalan bila `STAGING_BASE_URL` kosong, dan setiap
spec meng-skip dirinya sendiri bila kredensial staging tidak lengkap
(lihat `web/e2e/staging/helpers.ts`). Detail kasus uji:
`web/docs/TEST_PLAN.md`.

## 7. Checklist go-live staging

- [ ] Proyek Supabase staging dibuat (§1 langkah 2–4)
- [ ] Auth staging dikonfigurasi (§1 langkah 5–6)
- [ ] Migrasi 0001–0004 jalan di staging (§3)
- [ ] 3 akun test dibuat + admin jadi `superadmin` (§3)
- [ ] Seed staging jalan, `db:seed:staging` 0 error (§3)
- [ ] Edge Functions deploy ke staging + `LICENSE_PEPPER` dummy (§3)
- [ ] Proyek Vercel staging + env + domain (§4)
- [ ] `npm run test:staging` hijau (lihat TEST_PLAN.md)
- [ ] Verifikasi negatif: staging TIDAK bisa membaca production
      (coba panggil production URL dengan anon key staging → harus gagal)
