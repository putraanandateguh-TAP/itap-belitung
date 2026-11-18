# Audit sistem lisensi lama — situs main (branch `main`, situs statis lama)

Tanggal audit: 2026-11-18. Auditor: Workstream B. Metode: baca langsung
file di `main` (`git show main:<path>` / `git grep`). Semua temuan bisa
diverifikasi ulang dari repo — tidak ada klaim tanpa path file.

## Ringkasan

Sistem lisensi FULL situs lama **sepenuhnya client-side**: tidak ada satu
pun pemeriksaan server. Siapa pun yang bisa membuka DevTools atau membaca
repo publik bisa mengaktifkan FULL gratis, mencetak kode baru, dan
membuka halaman "khusus owner". Temuan ini sama dengan K1 di audit
website (salt + algoritma di repo publik, status FULL hanya flag
localStorage, 21 hash SHA-256 tanpa salt).

## Temuan konkret

### A1 — 21 hash kode Generator tanpa salt, di repo publik (KRITIS)
- **File:** `generator/lock.js:1` (`const HASH=[...]` — 21 hash SHA-256,
  diverifikasi dengan `grep -o` = 21 entri).
- **Mekanisme:** `itapCheckCode()` (`generator/lock.js:5`) menghitung
  `SHA-256(kode)` di browser dan membandingkan dengan daftar.
- **Dampak:** kode bersifat rahasia-hanya-lewat-kegelapan. Hash tanpa
  salt + kode pendek (format akses produk) = brute-force murah; siapa
  pun yang menemukan satu kode bisa membagikannya ke semua orang, dan
  pemilik tidak bisa mencabut satu kode tanpa mengganti daftar untuk
  semua pembeli. Tidak ada expiry, tidak ada pencabutan, tidak ada audit.

### A2 — Salt + algoritma pembuatan kode Kasir hardcode di client (KRITIS)
- **File:** `kasir/lock.js:6` — konstanta `KSALT` (nilai salt hardcode,
  lihat langsung di file; nilai tidak dikutip di dokumen ini).
- **Mekanisme:** `kSig()` / `kMake()` (`kasir/lock.js:8-9`) membuat kode
  `KSR-<plan>-<YYYYMMDD>-<8 hex>` sepenuhnya di browser; `itapCheckCode()`
  (`kasir/lock.js:10-14`) memverifikasi tanda tangan yang sama di browser.
- **Dampak:** siapa pun bisa mencetak kode Kasir valid untuk plan dan
  tanggal apa pun, tanpa membayar. Expiry (`kExp`, `kasir/lock.js:7,16`)
  dicek dari tanggal perangkat — ubah jam perangkat, expiry hilang.

### A3 — Status FULL hanya flag localStorage (KRITIS)
- **File:** `generator/lock.js:5` (`localStorage.setItem('itap_full','1')`),
  `kasir/lock.js:11,14` (`itap_kasir_full`, `itap_kasir_owner`,
  `itap_kasir_exp`, `itap_kasir_plan`).
- **Gate:** `generator/index.html:77` (`let FULL=localStorage.getItem("itap_full")==="1"`),
  `generator/studio.js:3`, `kasir/app.js:9` (`const FULL=()=>kasirFull()`),
  `kasir/lock.js:16-17` (`kasirFull()`/`kasirExpired()`).
- **Dampak:** satu baris di console — `localStorage.setItem('itap_full','1')`
  — membuka semua batas Generator (scene, gaya, AI). Untuk Kasir:
  `localStorage.setItem('itap_kasir_full','1')` + `'itap_kasir_owner','1'`
  membuka semua batas + halaman owner. Tidak ada pemeriksaan ulang apa pun.

### A4 — Halaman "khusus owner" Buat Kode hanya dicek flag localStorage (KRITIS)
- **File:** `kasir/buatkode.html:9,11` — `if(localStorage.itap_kasir_owner==='1')`
  menampilkan form; `gen()` menolak bila flag bukan `'1'`.
- **Dampak:** gabungkan A3 + A4: siapa pun bisa menjadi "owner" dan
  mencetak kode pembeli (A2) dari browser sendiri.

### A5 — Kode lewat URL + API key pengguna di localStorage (TINGGI)
- **File:** `kasir/app.js:95` — `?kode=` di URL langsung menjalankan
  `itapCheckCode(k)` lalu membersihkan URL; tautan berisi kode bisa
  dibagikan/disadap (riwayat browser, log server, referer). Pesan di
  `kasir/buatkode.html:13` bahkan menyarankan membuka tautan berisi kode.
- **File:** `generator/index.html:94`, `generator/studio.js:45,148`,
  `kasir/app.js:90-91` — Gemini API key pengguna disimpan plaintext di
  localStorage (`itap_key`, `itap_kasir_key`) dan dikirim dari browser
  (`kasir/app.js` `gemini()` memanggil API Google dengan `?key=`).
  Bukan lisensi, tapi memperluas permukaan: key bisa dicuri lewat XSS
  apa pun di halaman yang sama.

### A6 — Entitlement akun dibaca client lalu ditulis ke localStorage (TINGGI)
- **File:** `akun/akun.js:64` — `S.sb.from('entitlements').select('*')`
  dibaca dari browser; `openApp()` (`akun/akun.js:324-331`) memeriksa
  `S.ents` lalu **menulis** `localStorage.setItem('itap_kasir_full','1')`
  / `itap_full` dan mengarahkan ke aplikasi.
- **File:** `supabase/itap-akun.sql:140-151` — RLS `entitlements` memang
  membatasi baca ke pemilik/admin dan tulis ke admin (`public.is_admin()`),
  jadi tabelnya sendiri tidak seburuk lock.js. Tapi keputusan akhir tetap
  client-side: setelah flag ditulis, aplikasi (A3) tidak pernah memeriksa
  ulang entitlement ke server. Token/flag yang sudah tertulis tetap
  berlaku meski entitlement dicabut.
- **Catatan:** tidak ada Edge Function / API validasi lisensi di `main`
  (`git ls-tree main` — fungsi yang ada: `chat`, `delete-account`,
  `push-alert`; tidak ada yang menyentuh lisensi).

### A7 — Tidak ada rate limit, audit, atau pencabutan (SEDANG)
- Tidak ada batas percobaan kode di mana pun; tidak ada log siapa
  memakai kode apa; tidak ada cara mencabut satu pembeli tanpa merilis
  ulang file lock.js untuk semua pengguna. Kode bersifat permanen dan
  tidak terlacak.

## Peta file (main)

| File | Peran dalam sistem lama |
|---|---|
| `generator/lock.js` | 21 hash + `itapCheckCode` Generator |
| `generator/index.html` | Gate FULL Generator + form kode |
| `generator/studio.html` / `studio.js` | Gate FULL Story Studio |
| `generator/index.v1/v2/v3.bak.html` | Salinan lama dengan pola yang sama (hash inline) |
| `kasir/lock.js` | Salt + `kMake`/`kSig` + flag Kasir |
| `kasir/app.js` | Gate FULL Kasir, `?kode=`, batas FREE |
| `kasir/buatkode.html` | Cetak kode pembeli ("owner") |
| `kasir/app.html` | Form kode FULL Kasir |
| `akun/akun.js` | Baca `entitlements` -> tulis flag localStorage |
| `supabase/itap-akun.sql` | Tabel `entitlements` + RLS (bagian yang sudah benar) |

## Yang TIDAK ditemukan (batas audit)
- Plaintext 21 kode lama tidak ada di repo (hanya hash) — tidak bisa
  dipulihkan tanpa brute-force; migrasi legacy memakai hash apa adanya.
- Tidak ada bukti eksploitasi aktif (tidak ada log server yang diperiksa);
  temuan ini soal kerentanan desain, bukan insiden.

## Perbaikan
Lihat `web/docs/LICENSE.md` — semua temuan A1–A7 ditutup oleh desain
server-side di branch `feat/license-server-side` (kecuali A5 bagian
Gemini API key pengguna, yang di luar cakupan lisensi dan dicatat
sebagai risiko tersisa).
