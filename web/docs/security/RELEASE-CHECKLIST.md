# Checklist keamanan sebelum rilis (Supabase + Vercel)

Dibuat setelah audit 23 Nov 2026 (kasus CVE-2025-48757: tabel tanpa RLS + anon key = database bocor).

1. **RLS wajib** — setiap tabel baru di schema `public` langsung `enable row level security`.
   Cek: Supabase → Advisors → Security harus bersih dari `rls_disabled_in_public` / `security_definer_view`.
2. **Policy minimal** — anon hanya SELECT untuk data yang memang publik (artikel terbit, loker, harga, menu).
   Tulis/ubah/hapus hanya lewat route server (Drizzle/service role) atau pemilik (`auth.uid()`).
3. **Grant eksplisit** — tabel baru tidak otomatis bisa dibaca anon; beri `grant select ... to anon` hanya bila perlu.
4. **View** — selalu `with (security_invoker = true)`.
5. **Fungsi SECURITY DEFINER** — `set search_path`, `revoke execute ... from public, anon` kecuali memang publik.
6. **Kunci** — hanya `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SITE_URL` yang boleh `NEXT_PUBLIC_`.
   Service role, DATABASE_URL, CRON_SECRET, RESEND, Gemini, ElevenLabs, VAPID private → server saja.
   Modul yang memakai secret: `import "server-only"` (lihat `src/lib/supabase/admin.ts`).
7. **Scan sebelum push** — `gitleaks git .` + cek bundle: `rg -l "SERVICE_ROLE|sb_secret_" .next/static` harus kosong.
8. **Storage** — bucket publik cukup lewat URL publik; jangan buat policy SELECT luas (bisa di-list).
9. **Tes sebagai penyerang** — pakai anon key dari bundle live: SELECT/INSERT/UPDATE/DELETE tiap tabel harus sesuai harapan.
10. **Build lulus** (`npm run build`) dan halaman utama, /lowongan, /artikel, /jual-beli dicek setelah deploy.
