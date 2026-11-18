# iTAP Belitung — Portal Web (Fase M0–M2)

Portal web iTAP Belitung — rebuild clean-room dari recon Satam Belitung
(`~/workspace/itap-belitung-app/replica/`). Next.js App Router + TypeScript +
Tailwind v4. Token desain dari `replica/design/tokens.json`.

## Status: BACKEND KODE SELESAI, BELUM LIVE (replica-backend 2026-11-18)

**Kode backend sudah ada** (`replica/backend.md`): Drizzle + Supabase Auth,
migrasi `drizzle/0001–0003.sql`, data layer DB-backed (`src/lib/data.ts`),
78 route API, 5 cron job, Edge Function hapus akun, seed script. Auth demo
(localStorage + OTP `123456`) sudah DIHAPUS sepenuhnya.

**Tapi belum pernah jalan di database live** — proyek Supabase BARU (P1)
belum dibuat (hanya Teguh yang bisa membuatnya). Selama `DATABASE_URL`
belum diisi, situs memakai fallback seed sementara (`src/lib/data-seed.ts` +
`src/lib/store.ts`, in-memory) agar tetap bisa dilihat; matikan dengan
`ITAP_ALLOW_SEED_FALLBACK=false` setelah P1 + seed.

Prasyarat yang BELUM ada (arsitektur §0): proyek Supabase BARU (P1),
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
