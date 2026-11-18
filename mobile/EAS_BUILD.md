# EAS Build — iTAP Belitung (Android)

Build Android aplikasi iTAP Belitung lewat **Expo EAS Build (cloud)** — tidak
butuh Android SDK / Android Studio di mesin sendiri. Dokumen ini adalah
satu-satunya runbook build; `README.md` hanya merujuk ke sini.

> Status 2026-11-18: konfigurasi EAS **siap**, build **belum pernah jalan**.
> Yang masih kurang hanya akun + kredensial milik Teguh (lihat §1 dan
> "Yang belum bisa" di bawah). Jangan klaim aplikasi "siap rilis" sebelum
> `eas build -p android --profile production` berhasil dan AAB-nya lolos
> uji internal.

## 0. Hasil audit konfigurasi (PR ini)

Aplikasi Expo **sudah ada** di `mobile/` (scaffold M6, SDK 52). Audit PR ini
menemukan dan memperbaiki:

| # | Temuan | Perbaikan di PR ini |
| --- | --- | --- |
| 1 | Profil `development` di `eas.json` memakai `developmentClient: true`, tapi `expo-dev-client` **tidak ada** di `package.json` — build development akan gagal / tanpa dev client | `expo-dev-client@~5.0.20` ditambahkan (versi yang cocok SDK 52, dipilih `expo install`); `bun.lock` ikut diperbarui |
| 2 | `mobile/.gitignore` **tidak** mengecualikan `service-account-key.json` — padahal `README.md` menyuruh menyimpan key Play Console di path itu. Key bisa ikut ter-commit | Ditambahkan: `service-account-key.json`, `credentials.json`, `google-services.json`, `GoogleService-Info.plist`, `*.jks`, `*.keystore` |
| 3 | Profil `production` tidak menaikkan `versionCode` otomatis — upload AAB kedua dengan `versionCode` yang sama **ditolak** Play Console | `autoIncrement: true` di `production.android` (EAS menaikkan `versionCode` tiap build produksi; `version` tetap dinaikkan manual di `app.json`) + `appVersionSource: "local"` di `cli` (supaya EAS tidak bertanya interaktif soal sumber versi saat pertama kali build dengan `autoIncrement`) |
| 3b | Kunci `$schema` di `eas.json` menunjuk URL yang **404** (`.../expo/eas-cli/main/packages/eas-json/schema.json`, terverifikasi 2026-11-18) — hanya petunjuk editor, tapi mati | Baris `$schema` dihapus; validasi dilakukan dengan validator bawaan EAS CLI sendiri (lihat §11) |
| 4 | File `.env` **tidak** ikut ke server EAS, tapi tidak ada petunjuk cara mengisi `EXPO_PUBLIC_*` untuk build cloud — build cloud akan menghasilkan aplikasi "API belum diatur" | Petunjuk `eas env:set` ditambahkan di `.env.example` dan §4 dokumen ini |
| 5 | Belum ada runbook build + signing + checklist Play Store yang lengkap | Dokumen ini (`EAS_BUILD.md`) |

Yang sudah benar dan **tidak** diubah: profil `development` / `preview` (APK)
 / `production` (AAB) di `eas.json`; `cli.version >= 27.0.0` (EAS CLI
terbaru saat ini 27.10.0 — terverifikasi di registry npm); `app.json`
(nama `iTAP Belitung`, slug `itap-belitung`, package `id.itap.belitung`,
`version` 0.1.0 / `versionCode` 1, ikon + splash dari logo resmi iTAP);
aset `assets/icon.png` 1024×1024, `adaptive-icon.png` 1024×1024,
`splash.png` 1242×2436, `favicon.png` 512×512.

Catatan keputusan yang perlu dikonfirmasi pemilik: **package Android
`id.itap.belitung`** (dan bundle ID iOS yang sama) sudah ditulis di
`app.json` oleh scaffold M6. Nama package **tidak bisa diubah** setelah
aplikasi pertama kali terbit di Play Store — pastikan Teguh setuju dengan
nama ini sebelum build production pertama.

## 1. Prasyarat (butuh Teguh)

| # | Prasyarat | Status |
| --- | --- | --- |
| 1 | Akun Expo gratis (daftar di https://expo.dev/signup, pakai email Teguh putraanandateguh@gmail.com) | belum ada |
| 2 | Akun Google Play Console (P6 di `replica/architecture.md` — biaya pendaftaran sekali USD 25; belum dikonfirmasi apakah Teguh sudah punya) | belum dikonfirmasi |
| 3 | Node 20+ dan EAS CLI (lihat §2) | EAS CLI 27.10.0 sudah ter-install di VM ini (`/usr/bin/eas`) |
| 4 | Nilai `EXPO_PUBLIC_*` (URL API web + Supabase proyek baru P1) | Supabase baru sudah ada; nilai diisi saat build (lihat §4) |

Biaya: akun Expo gratis sudah cukup untuk build uji internal (ada kuota
build bulanan gratis — angka pastinya lihat halaman harga Expo saat daftar).
Tidak ada biaya dari EAS untuk build pertama ini. Satu-satunya biaya wajib
adalah pendaftaran Play Console (USD 25, sekali).

## 2. Install EAS CLI

```sh
npm install -g eas-cli        # atau: bun add -g eas-cli
eas --version                 # harus >= 27.0.0 (eas.json mensyaratkan itu)
```

Verifikasi di VM ini 2026-11-18: `eas-cli/27.10.0 linux-x64 node-v24.22.1`.

## 3. Login + hubungkan proyek (sekali saja)

```sh
cd site/mobile
eas login                     # masuk dengan akun Expo Teguh
eas init                      # membuat proyek di expo.dev dan mengisi
                              # extra.eas.projectId di app.json secara otomatis
```

`extra.eas.projectId` di `app.json` saat ini **kosong** (`""`) — inilah yang
membuat `eas build` / `eas config` belum bisa jalan. Jangan isi manual
dengan nilai karangan; isi lewat `eas init` setelah login. Bila proyek Expo
sudah pernah dibuat, hubungkan dengan `eas init --id <project-id>`.

> `eas config` (validasi config lokal) di eas-cli 27 **butuh login** — tanpa
> login perintah itu gagal dengan pesan `An Expo user account is required
> to proceed`. Jadi validasi penuh baru bisa dilakukan setelah langkah ini.

## 4. Environment variables untuk build cloud (wajib)

`EXPO_PUBLIC_*` di-inline ke bundle **saat build**. File `.env` lokal
tidak ikut terkirim ke server EAS, jadi build cloud tanpa langkah ini
menghasilkan aplikasi yang menampilkan "API belum diatur".

Isi sekali saja (tersimpan di akun Expo, bukan di repo):

```sh
cd site/mobile
eas env:set production --name EXPO_PUBLIC_API_URL --value https://itapbelitung.my.id --visibility secret
eas env:set production --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref-proyek>.supabase.co --visibility secret
eas env:set production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon-key> --visibility secret
```

Ulangi dengan `preview` (bukan `production`) bila build preview butuh nilai
berbeda, mis. URL staging. Periksa yang sudah tersimpan dengan
`eas env:list`. Yang boleh masuk sini hanya nilai **publik** (URL + anon
key). **Jangan pernah** mengisi `service_role` key Supabase atau secret
lainnya — `EXPO_PUBLIC_*` ikut masuk bundle aplikasi dan bisa dibaca siapa
pun yang membongkar APK.

## 5. Build

```sh
cd site/mobile
# APK untuk uji internal (profil preview — instal langsung di ponsel)
eas build -p android --profile preview

# Development build (butuh expo-dev-client — sudah ditambahkan PR ini).
# Dipakai bersama `npx expo start --dev-client` untuk pengembangan.
eas build -p android --profile development

# AAB untuk Play Store (profil production)
eas build -p android --profile production
```

Build berjalan di cloud Expo (beberapa menit untuk build pertama). Log dan
status bisa dipantau di dashboard https://expo.dev (masuk dengan akun yang
sama) atau dengan `eas build:list`. Unduh artefak dari dashboard, atau:

```sh
eas build:download --platform android --profile preview --latest
```

Opsi berguna: `--non-interactive` (untuk CI), `--clear-cache` (bila build
gagal karena cache), `--message "pesan build"` (catatan build).

## 6. Signing (kunci upload Android)

**Jalur utama (direkomendasikan): EAS managed credentials.** Saat build
production pertama, EAS membuatkan **upload keystore** dan menyimpannya di
akun Expo. Tidak ada file kunci di mesin atau repo. Cadangkan kredensial
secara berkala:

```sh
eas credentials -p android    # lihat / unduh cadangan keystore
```

**Kunci upload bersifat permanen untuk aplikasi ini.** Play Store mengikat
aplikasi ke kunci upload pertama; menggantinya butuh proses reset lewat
Play Console dan dukungan Google. Karena itu: jangan hapus proyek Expo,
jangan kehilangan akses akun Expo, dan simpan cadangan keystore di tempat
aman (bukan di repo).

**Jalur alternatif: keystore lokal.** Bila Teguh sudah punya keystore
sendiri (mis. dari aplikasi Android sebelumnya):

```sh
# 1. Buat keystore baru (bila belum ada) — simpan password di password
#    manager, JANGAN di repo, JANGAN di chat.
keytool -genkeypair -v -keystore itap-upload.keystore \
  -alias itap-upload -keyalg RSA -keysize 2048 -validity 10000

# 2. Unggah ke EAS (interaktif — pilih "Upload a keystore"):
eas credentials -p android

# 3. Simpan file .keystore + password DI LUAR repo (mis. brankas / password
#    manager). .gitignore sudah mengecualikan *.jks dan *.keystore, tapi
#    jangan pernah meletakkannya di dalam folder repo.
```

Perintah `eas build` tidak akan mengubah kredensial yang sudah ada kecuali
diminta eksplisit (`eas credentials` atau `--clear-cache` tidak menyentuh
kredensial; `eas build --freeze-credentials` mencegah perubahan kredensial
dalam mode non-interaktif).

## 7. Rilis ke Play Store — checklist

Urutan yang disarankan: **Internal testing dulu**, baru Production.

### 7.1 Sekali saja (setup aplikasi di Play Console)

- [ ] Buat aplikasi di Play Console: nama **iTAP Belitung**, bahasa default
      Indonesia, kategori (mis. Berita & Majalah), alamat email kontak.
- [ ] Unggah **ikon aplikasi 512×512 PNG** (pakai `assets/icon.png` —
      sudah 1024×1024 dari logo resmi; turunkan ke 512×512 bila perlu).
- [ ] Unggah **feature graphic 1024×500** (belum ada — buat dari logo
      resmi iTAP, jangan generate AI tanpa persetujuan Teguh).
- [ ] Isi **deskripsi singkat** (≤80 karakter) dan **deskripsi lengkap**
      (≤4000 karakter) — Bahasa Indonesia.
- [ ] Unggah **screenshot ponsel minimal 2** (maks 8), 16:9 atau 9:16;
      tambah screenshot tablet 7" / 10" bila tersedia.
- [ ] Isi **privacy policy URL** — wajib. Pakai halaman `/privasi` di
      itapbelitung.my.id (pastikan isinya sudah menyebut pemrosesan data
      oleh Supabase / Vercel / Meta / Google — lihat catatan P1 di
      `replica/deploy.md`).
- [ ] Isi **kuesioner content rating** (IARC) dan **form Data safety**:
      nyatakan data yang dikumpulkan aplikasi (akun, foto listing,
      lokasi teks, token push) dengan jujur.
- [ ] Isi **target audience** (aplikasi bukan untuk anak-anak) dan
      deklarasi terkait.
- [ ] Siapkan **akun demo / kredensial login** untuk reviewer Google bila
      fitur login menghalangi peninjauan (login aplikasi memakai
      email + password; sediakan akun uji dan cantumkan di "App access").

### 7.2 Setiap rilis

- [ ] Naikkan `version` di `app.json` (mis. `0.1.0` → `0.2.0`) — manual.
      `android.versionCode` naik otomatis lewat `autoIncrement` di
      `eas.json` (profil production); jangan menurunkannya.
- [ ] Jalankan `eas build -p android --profile production` → dapatkan
      file `.aab`. Target SDK bawaan template SDK 52 adalah API 35
      (Android 15); perhatikan peringatan target API di Play Console saat
      upload.
- [ ] Uji AAB/APK hasil build di minimal 1 ponsel fisik (instal APK
      preview dulu; AAB tidak bisa dipasang langsung — uji lewat track
      Internal testing).
- [ ] Unggah `.aab` ke Play Console → track **Internal testing** →
      uji → promosikan ke **Production** (atau Closed testing dulu bila
      mau lebih hati-hati).
- [ ] (Opsional, bila sudah ada service-account key — lihat §8) submit
      otomatis lewat EAS Submit.

### 7.3 Yang TIDAK perlu disiapkan sekarang

- **Permissions tambahan: tidak ada.** Aplikasi saat ini tidak memakai
  kamera, galeri, lokasi GPS, atau mikrofon — foto listing belum bisa
  diunggah dari aplikasi (lihat `ListingFormScreen.tsx`), lokasi diisi
  sebagai teks, dan push notification masih stub (P4). Yang dipakai
  hanya permission default Android (internet). Bila nanti ditambah
  `expo-image-picker` / kamera, tambahkan plugin + permission
  (`READ_MEDIA_IMAGES`, `CAMERA`) di `app.json` saat itu — jangan
  menambahkan permission "buat jaga-jaga", Play Console mempertanyakan
  permission sensitif.
- **iOS:** `app.json` sudah berisi `bundleIdentifier` yang sama, tapi
  build iOS di luar scope (butuh Apple Developer Program USD 99/tahun
  + mesin macOS / EAS). Jangan jalankan `eas build -p ios` tanpa
  keputusan Teguh.

## 8. Submit otomatis (opsional — butuh service-account key)

Jalur utama saat ini adalah **upload manual AAB** di Play Console (§7).
Bila nanti mau submit otomatis:

1. Di Play Console: Setup → API access → buat service account → unduh
   file JSON key → beri akses ke aplikasi iTAP Belitung.
2. Simpan file JSON itu sebagai `site/mobile/service-account-key.json`
   (**JANGAN commit** — sudah dikecualikan `.gitignore`).
3. Jalankan:

```sh
eas submit -p android --profile production
```

`eas.json` sudah berisi `submit.production.android` dengan
`serviceAccountKeyPath: ./service-account-key.json` dan `track: internal`.
Tanpa file key itu, `eas submit` gagal — itu normal, bukan bug.

## 9. Yang belum dikonfigurasi (bukan bagian PR ini)

| Item | Yang kurang | Dampak |
| --- | --- | --- |
| OTA update (EAS Update) | `expo-updates` belum terpasang; `updates.url` butuh `projectId` (§3) | Aplikasi tidak bisa di-update tanpa build baru. Pasang setelah `eas init`. |
| Push notification / FCM (P4) | Belum ada proyek Firebase; `expo-notifications` belum terpasang; `google-services.json` belum ada | `registerDeviceToken()` di `src/lib/devices.ts` masih stub; layar Notifikasi menampilkan status ini dengan jujur. |
| Google Sign-In di aplikasi | Butuh konfigurasi Google Cloud (P3) + redirect URI | Tombol Google menampilkan error jujur bila belum dikonfigurasi. |
| AI iTAP + Penerjemah (P3) | Proyek Google Cloud + kunci Gemini | Route `/api/ai/*` dan `/api/translate` menjawab 501. |
| Verifikasi WhatsApp (P2) | Akun Meta WhatsApp Business + template OTP | Route OTP WhatsApp menjawab 503; marketplace tetap jalan dengan verifikasi email. |

## 10. Troubleshooting

| Gejala | Penyebab umum | Perbaikan |
| --- | --- | --- |
| `An Expo user account is required to proceed` | Belum login / `projectId` kosong | `eas login`, lalu `eas init` (§3) |
| `eas build` gagal: `expo-dev-client is not installed` | (Sudah diperbaiki PR ini) dependensi hilang | `npx expo install expo-dev-client`, commit `package.json` + `bun.lock` |
| Aplikasi build menampilkan "API belum diatur" | `EXPO_PUBLIC_*` kosong di build cloud | Isi lewat `eas env:set` (§4); build ulang |
| Play Console menolak AAB: "version code already used" | `versionCode` tidak naik | Pastikan `autoIncrement: true` di profil production (sudah ada); bila build dilakukan di luar EAS, naikkan manual di `app.json` |
| `eas submit` gagal: file key tidak ditemukan | `service-account-key.json` belum ada | Buat key di Play Console (§8) atau upload manual (§7) |
| Build gagal karena cache | Cache EAS usang | `eas build -p android --profile <nama> --clear-cache` |
| `npm install` gagal di VM ini (`EPERM chown`) | Sandbox VM memblokir syscall `chown` untuk npm sebagai root | Pakai `bun install` (teruji: 796 paket). Di mesin developer biasa, `npm install` normal. |

## 11. Validasi yang sudah dilakukan (2026-11-18, tanpa login Expo)

- `eas.json` **VALID** menurut validator bawaan EAS CLI sendiri
  (`@expo/eas-json` 27.10.0, skema Joi yang sama dipakai `eas build`) —
  termasuk `autoIncrement` dan `appVersionSource`.
- `eas.json`, `app.json`, `package.json` lolos parse JSON.
- `npx expo config --type public` (tanpa login) me-resolve `app.json`
  dengan benar: SDK 52.0.0, package `id.itap.belitung`, `versionCode` 1.
- `npx tsc --noEmit` bersih (exit 0) setelah `expo-dev-client` ditambahkan.
- `eas-cli` terbaru di registry npm = 27.10.0 → syarat `cli.version
  >= 27.0.0` terpenuhi.
- **Tidak bisa divalidasi dari VM ini:** `eas config` butuh login
  (`An Expo user account is required to proceed`); `eas build` butuh
  akun Expo + `projectId` (lihat §3). Keduanya menunggu Teguh.

## Referensi

- `eas.json` — profil build + submit (file yang sama di folder ini).
- `app.json` — identitas aplikasi, ikon, splash, package `id.itap.belitung`.
- `.env.example` — variabel `EXPO_PUBLIC_*` yang dibutuhkan aplikasi.
- `replica/architecture.md` §1, §5 M6 — stack Expo + prasyarat P1–P7.
- `replica/recon.md` — layar aplikasi S27–S44 (sumber scaffold M6).
- Expo docs: https://docs.expo.dev/build/introduction/ ,
  https://docs.expo.dev/submit/android/ ,
  https://docs.expo.dev/versions/latest/config/app/
