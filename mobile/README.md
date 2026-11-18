# iTAP Belitung — Aplikasi Android (Expo, fase M6)

Aplikasi Android portal iTAP Belitung, dibangun clean-room dari
`replica/recon.md` (layar aplikasi S27–S44) dan `replica/architecture.md` §5
M6. Branding dan konten iTAP sendiri; tidak ada kode, logo, copy, atau aset
Satam.

## Yang sudah ada

- Navigasi bawah persisten 5 tab (Beranda, Kanal, Jual Beli, Chat, Akun)
  dengan riwayat layar per tab (stack terpisah per tab).
- Beranda aplikasi (S27): sapaan WIB, kartu cuaca + salat, menu 16 layanan.
- Kanal + detail artikel + bagikan (S42), pencarian (S06 versi aplikasi).
- Marketplace: daftar, detail (publik/privat), pasang, penawaranku,
  tersimpan, lapor/blokir (S07–S09, S13, S14, S17, S26).
- Chat: inbox + ruang chat berkartu barang, Realtime bila tersedia,
  fallback polling (S15–S16).
- Akun: login/daftar, verifikasi email + WhatsApp, aturan marketplace,
  pengaturan, hapus akun (S10–S12, S18, S25, S44).
- Hub info harian: cuaca, salat, pesawat & kapal, harga pangan, BBM, gempa,
  nomor darurat (S28–S30, S32, S33, S38, S40); budaya (S34–S35); kreator
  (S36); notifikasi (S43).
- AI iTAP (S41) + Penerjemah 9 bahasa (S37): UI lengkap, API menjawab 501
  sampai P3 — layar menampilkan jujur "belum tersedia", tidak mengarang
  jawaban. Riwayat penerjemah disimpan lokal di perangkat (maks 20).
- Semua layar degrade jujur bila API belum terjangkau: empty state / pesan
  error, bukan data palsu.

## Menjalankan di mesin developer

Prasyarat: Node 20+, npm, Expo CLI (`npx expo` — ikut terpasang bersama
`expo`), dan **Android SDK** (via Android Studio) untuk emulator/perangkat,
atau aplikasi **Expo Go** di ponsel.

```sh
cd site/mobile
cp .env.example .env        # isi EXPO_PUBLIC_API_URL + Supabase (P1)
npm install                  # atau: bun install (lihat catatan di bawah)
npx expo start              # lalu pindai QR dengan Expo Go, atau tekan `a`
npx tsc --noEmit            # typecheck
```

Catatan: di VM Muse ini `npm install` GAGAL (registry bisa dijangkau, tapi npm
sebagai root selalu `EPERM chown` pada file bin — sandbox memblokir syscall
`chown` sepenuhnya). `bun install` berhasil (795 paket) dan `npx tsc --noEmit`
bersih per 2026-11-18. Di mesin developer biasa, `npm install` semestinya
jalan normal; bila menemui hal yang sama, pakai `bun install`.
Pengecualian: `npm install -g eas-cli` di VM ini BERHASIL per 2026-11-18
(eas-cli 27.10.0, `/usr/bin/eas`) — EPERM chown tidak muncul untuk paket
global ini. Bila di mesin lain gagal, alternatif: `bun add -g eas-cli`, atau
sebagai devDependency lokal (`bun add -d eas-cli`, lalu `bunx eas ...`).

## Build Android via EAS Build (cloud Expo) — runbook

**Tidak butuh Android SDK di mesin sendiri.** Build berjalan di cloud Expo
(`eas build`), jadi mesin Teguh / VM ini cukup punya Node + EAS CLI saja.
Runbook lengkap (build, environment variables, signing, checklist Play
Store, troubleshooting): **`EAS_BUILD.md`** di folder ini.

Status per 2026-11-18:

- EAS CLI **ter-install** di VM ini: `eas-cli/27.10.0` (`npm install -g eas-cli`).
- `eas.json` **sudah ada** (profil `development` / `preview` / `production`).
- `extra.eas.projectId` di `app.json` **masih kosong** — belum ada akun Expo.
- `eas whoami` → `Not logged in`; `eas init` berhenti di autentikasi:
  `An Expo user account is required to proceed. Either log in with eas login
  or set the EXPO_TOKEN environment variable ...` — tidak ada akun dibuat,
  tidak ada login dilakukan.

Langkah tersisa (butuh Teguh — akun + Play Console):

1. **Daftar akun Expo gratis** di https://expo.dev/signup — pakai email
   Teguh (putraanandateguh@gmail.com). Akun gratis sudah cukup untuk EAS
   Build (ada kuota build bulanan gratis).
2. **Login di mesin yang menjalankan build:**
   ```sh
   cd site/mobile
   eas login
   ```
3. **Hubungkan proyek ke akun Expo** (mengisi `extra.eas.projectId` di
   `app.json` secara otomatis):
   ```sh
   eas init
   ```
4. **Build APK uji internal:**
   ```sh
   eas build -p android --profile preview
   ```
   Hasil: file APK yang bisa dipasang langsung di ponsel untuk uji internal.
   Profil `development` (`eas build -p android --profile development`)
   menghasilkan development build untuk Expo Go / dev client.
5. **Build AAB rilis Play Store:**
   ```sh
   eas build -p android --profile production
   ```
   Hasil: file `.aab`. Naikkan `version` / `android.versionCode` di
   `app.json` tiap rilis baru (saat ini `0.1.0` / `1`).
6. **Rilis ke Play Store — upload manual (jalur utama saat ini):**
   buka [Google Play Console](https://play.google.com/console) (akun P6 —
   belum dikonfirmasi apakah Teguh sudah punya; bila belum, daftar dulu,
   biaya pendaftaran sekali USD 25), buat aplikasi "iTAP Belitung", lalu
   unggah file `.aab` ke track Internal testing / Production.
   Alternatif bila nanti ada service-account key Google Play: simpan file
   JSON-nya sebagai `site/mobile/service-account-key.json` (JANGAN commit —
   file rahasia), lalu `eas submit -p android --profile production`.
   `eas.json` sudah berisi `submit.production.android` dengan
   `serviceAccountKeyPath: ./service-account-key.json` dan `track: internal`,
   tapi file key-nya **belum ada**, jadi `eas submit` akan gagal sampai key
   itu dibuat di Play Console (Setup → API access → service account).

Catatan: build pertama di cloud memakan waktu beberapa menit; log build bisa
dilihat di dashboard https://expo.dev (masuk dengan akun yang sama).

Untuk pengembangan lokal, jalankan web dulu (`cd ../web && npm run dev`),
lalu isi `EXPO_PUBLIC_API_URL` dengan alamat LAN laptop
(mis. `http://192.168.1.10:3000`) — `localhost` dari ponsel menunjuk ke
ponsel itu sendiri, bukan laptop.

## Yang BELUM bisa (butuh Teguh / akun / mesin lain)

- **Build APK/AAB & submit Play Store — BELUM (menunggu akun Expo + Play
  Console).** Konfigurasi EAS sudah siap: EAS CLI 27.10.0 ter-install,
  `eas.json` ada (profil `development`/`preview`/`production`), `app.json`
  masih menunggu `extra.eas.projectId` dari `eas init` setelah login.
  Lihat runbook "Build Android via EAS Build (cloud Expo)" di atas. Jangan
  klaim aplikasi "siap rilis" sebelum `eas build --profile production`
  berhasil.
- **Ikon & splash — SELESAI 2026-11-18 (logo resmi).** `assets/icon.png`
  (1024×1024, logo di atas navy #0A1931), `assets/adaptive-icon.png`
  (1024×1024 transparan, logo ~70% lebar, zona aman), `assets/splash.png`
  (1242×2436, logo di tengah atas navy), `assets/favicon.png` (512×512,
  logo di atas navy) — semuanya dibuat dari logo resmi iTAP
  (`web/public/images/logo-itap-belitung.png`, "iTAP Belitung — Since
  2024", emas/putih transparan) dengan Python PIL, tanpa generate AI.
  Perlakuan sama seperti favicon web. Bila logo resmi berubah, buat ulang
  keempat aset dari sumber yang sama.
- **Push notification (FCM, P4):** belum ada proyek Firebase. Fungsi
  `registerDeviceToken()` di `src/lib/devices.ts` sudah siap memanggil
  `POST /api/devices`, tapi tidak ada token yang bisa didaftarkan sampai
  Firebase + `expo-notifications` dikonfigurasi. Layar Notifikasi
  menampilkan status ini dengan jujur.
- **AI iTAP + Penerjemah (P3):** route `/api/ai/*` dan `/api/translate`
  menjawab 501 sampai ada proyek Google Cloud + kunci Gemini milik Teguh.
- **Verifikasi WhatsApp (P2):** route OTP WhatsApp menjawab 503 sampai ada
  akun Meta WhatsApp Business + template OTP yang disetujui. Marketplace
  tetap bisa dipakai dengan verifikasi email saja (Fase 1).
- **CCTV (S31) & Statistik (S39):** isi tidak teramati di recon — layar
  berupa placeholder jujur, diputuskan di M5.
- **Kompresi + buang EXIF foto** sebelum upload listing (F05): batas server
  1 MB sudah ada; kompresi di client belum ditulis.
- **Google Sign-In di aplikasi:** memakai Supabase OAuth; butuh redirect
  URI + konfigurasi Google Cloud (P3/P5). Bila belum dikonfigurasi, tombol
  Google menampilkan error yang jujur.

## Catatan keamanan

- Token sesi Supabase disimpan di AsyncStorage (standar React Native).
  Peningkatan berikut: pindah ke `expo-secure-store` (sudah didaftarkan
  sebagai plugin di `app.json`, belum dipakai sebagai storage adapter).
- `EXPO_PUBLIC_*` ikut masuk bundle aplikasi — hanya isi nilai publik
  (URL + anon key). Jangan pernah isi service_role key di sini.
