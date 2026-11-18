// Supabase clients.
// - browser: dipakai komponen client (login Google, OTP, sign out).
// - server: dipakai Route Handler / Server Component; sesi dibaca dari
//   cookie http-only (bukan localStorage — auth demo lama dihapus).
// - admin: service-role, HANYA di server, HANYA untuk operasi yang memang
//   harus bypass RLS (hapus akun, job cron). Jangan pernah impor di client.
import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/** Admin client (service role). Melempar bila key belum diisi (P1). */
export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase belum dikonfigurasi (P1) — NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
