# iTAP Belitung — Portal Web (Fase M0–M2)

Portal web iTAP Belitung — rebuild clean-room dari recon Satam Belitung
(`~/workspace/itap-belitung-app/replica/`). Next.js App Router + TypeScript +
Tailwind v4. Token desain dari `replica/design/tokens.json`.

## Status: DEMO — data layer masih PALSU

**Belum ada backend.** Semua baca dari `src/lib/seed-data.ts` (digenerate dari
data ASLI situs statis lama — lihat generator di `/tmp/gen-seed.mjs`), semua
tulis ke `src/lib/store.ts` (in-memory, hilang saat server restart).
Tanda tangan fungsi di `src/lib/data.ts` SAMA seperti API di
`replica/architecture.md` §3, supaya `replica-backend` nanti tinggal mengganti
implementasi tanpa mengubah layar.

Prasyarat backend yang BELUM ada (arsitektur §0): proyek Supabase BARU (P1),
Resend (P5), Meta WhatsApp Business (P2), Gemini (P3), Firebase (P4).
`.env.example` berisi NAMA variabel saja — tanpa nilai.

## Yang TIDAK dibawa dari situs lama

- **Sistem lisensi client-side TIDAK dibawa** (temuan audit K1: salt +
  algoritma di repo publik — cacat kritis). Produk digital di sini hanya
  katalog tampil + tombol beli via WhatsApp. Tidak ada kolom kode akses,
  tidak ada validasi lisensi sama sekali.
- Tidak ada kode, HTML, CSS, JS, SVG, gambar, atau copy Satam. Semua baris
  ditulis baru dari recon + spek. Foto artikel memakai placeholder jujur
  ("foto menyusul dari arsip iTAP") sampai foto asli dipasang.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # verifikasi produksi
```

Deploy Vercel: Root Directory = `web` (repo root masih situs statis lama
sampai cutover, arsitektur P7). Tidak ada `vercel.json` di repo lama.

## Layar (M0–M2)

- M0: scaffold + token + primitif (`src/components/ui.tsx`) + seed + API palsu.
- M1 (S01–S06): beranda, kanal (`/kanal/[channel]` — berita/kuliner/wisata/
  sejarah/budaya/legenda), detail artikel, pencarian + filter, SEO (SSR,
  canonical, sitemap, robots).
- M2: masuk/verifikasi (S10/S11, demo), pengaturan (S18), hapus akun (S25,
  sebagian), dashboard kontributor (S19), editor bilingual (S20), redaksi
  (S21), komentar + moderasi dasar (F10), poin kontribusi, plus konten iTAP:
  harga pangan, kurs/IHSG/emas, lowongan, produk digital (katalog), jasa,
  menu Kedai. Privasi + ketentuan (S23/S24) sebagai teks statis baru.

Akun demo (halaman `/masuk`): Pembaca, Kontributor, Redaksi/Admin.
Kode verifikasi demo S11: `123456` (ditampilkan di halaman, demo saja).

## Berikutnya (BUKAN fase ini)

M3–M4 marketplace + moderasi penuh, M5 hub info harian, M6 Android,
M7 AI + Penerjemah. Lihat `replica/build-log.md`.
