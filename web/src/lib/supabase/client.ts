// Supabase clients.
// - browser: dipakai komponen client (login Google, OTP, sign out).
// - server: dipakai Route Handler / Server Component; sesi dibaca dari
//   cookie http-only (bukan localStorage — auth demo lama dihapus).
// - admin: service-role, HANYA di server, HANYA untuk operasi yang memang
//   harus bypass RLS (hapus akun, job cron). Jangan pernah impor di client.
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Admin client (service role) dipindah ke ./admin.ts (server-only) supaya
// tidak mungkin ikut ter-bundle ke browser.
