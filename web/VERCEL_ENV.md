# Environment Variables — Vercel (itap-belitung-web)

> Dokumen ini HANYA berisi NAMA variabel + dari mana nilainya didapat.
> TIDAK ADA nilai secret di sini. Nilai ada di `site/web/.env.local`
> (gitignored) atau di dashboard penyedia masing-masing.

## Yang wajib diisi (Production + Preview)

| Variabel | Sifat | Nilai dari |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Publik (terlihat di client) | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publik (terlihat di client) | `.env.local` |
| `NEXT_PUBLIC_SITE_URL` | Publik | `https://itapbelitung.my.id` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Rahasia — server saja** | `.env.local` |
| `DATABASE_URL` | **Rahasia — server saja** | `.env.local` (session pooler, port 5432) |
| `CRON_SECRET` | **Rahasia — server saja** | `.env.local` (melindungi 5 endpoint cron) |
| `RESEND_API_KEY` | **Rahasia — server saja** | Dashboard Resend (saat ini KOSONG — email OTP mengembalikan 503 sampai diisi) |

## Opsional

| Variabel | Sifat | Catatan |
|---|---|---|
| `RESEND_FROM` | Server saja | Bila kosong, kode memakai default `iTAP Belitung <noreply@itapbelitung.my.id>` |
| `ITAP_ALLOW_SEED_FALLBACK` | Dev saja | **JANGAN diisi di Production/Preview.** Bila `true`, aplikasi menyajikan data seed/palsu, bukan database live. |

## Bukan variabel Vercel

| Variabel | Alasan |
|---|---|
| `SUPABASE_DB_PASSWORD` | Hanya untuk CLI/migrasi, bukan runtime aplikasi |
| `SEED_AUTHOR_ID` | Hanya saat menjalankan seed (sudah selesai; admin `aa71ba6b-f5ad-4782-b0f8-5190fa04797d`) |

## Pemisahan Development / Preview / Production

- **Production:** `NEXT_PUBLIC_SITE_URL=https://itapbelitung.my.id`, nilai asli semua secret.
- **Preview:** nilai yang sama dengan Production, KECUALI `NEXT_PUBLIC_SITE_URL` tetap `https://itapbelitung.my.id` (preview memakai domain yang sama untuk callback auth).
- **Development (lokal):** `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, nilai dari `.env.local`.

## Yang masih butuh Teguh (1 langkah)

Otorisasi ulang scope tim Vercel — konektor Muse saat ini tidak bisa
membaca proyek (`list_projects` 403, tim `teguh-ananda-putra`):

1. Buka pengaturan konektor Vercel di Muse (atau tautan sambung Vercel yang sama seperti saat pertama menghubungkan).
2. Pilih tim **`teguh-ananda-putra`**.
3. Izinkan akses ke **semua proyek** (atau minimal proyek web itap-belitung).
4. Kabari Muse — setelah itu Muse bisa memeriksa proyek, mengisi env di atas, dan memverifikasi preview.

Sampai langkah ini selesai, tidak ada yang bisa diubah di Vercel dari Muse.
Jangan pernah menempel nilai secret di chat — isi langsung di dashboard Vercel
(Settings → Environment Variables) atau biarkan Muse mengisinya setelah
otorisasi selesai.
