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
