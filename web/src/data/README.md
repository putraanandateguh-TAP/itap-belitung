# Data lowongan (`loker.json`)

File ini memakai skema tim Career (`meta` + `lowongan[]`) dari
`/workspace/itap-konten-web/career/loker.json`. Halaman `/lowongan` dan
`GET /api/jobs` membacanya langsung (bukan tabel `job_listings` di
Supabase), supaya refresh cukup mengganti JSON.

## Cara refresh

1. Head of Career memperbarui `/workspace/itap-konten-web/career/loker.json`.
2. Salin ke file ini: `web/src/data/loker.json`.
3. Commit dan push ke `main`. Vercel akan men-deploy ulang
   https://itapbelitung.my.id/lowongan.

Lowongan dengan `batas_lamaran` yang sudah lewat (menurut tanggal WIB)
disembunyikan saat halaman diminta, jadi tidak perlu dihapus dulu dari JSON.

## Otomatis lewat GitHub Actions (sejak 23 Nov 2026)

`.github/workflows/update-data.yml` memperbarui file di folder ini tanpa asisten:

- `loker.json`: `scripts/update_loker_web.py` (JobStreet API, NyamanKerje Beltim, Glints, Loker.id). Entri kurasi lama tetap dipertahankan, entri kedaluwarsa dibuang.
- `harga-pangan.json`: `scripts/update_harga.py` (PIHPS Bank Indonesia, pasar Tanjung Pandan, dengan harga hari data sebelumnya; cadangan Panel Harga Bapanas).
- `keuangan.json`: salinan `data/keuangan.json` (kurs BCA, IHSG, emas Antam), Senin–Jumat 3x sehari.

Commit ke `main` otomatis memicu deploy Vercel.
