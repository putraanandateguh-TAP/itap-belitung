// Konfigurasi runtime — semua dari env EXPO_PUBLIC_*. TIDAK ADA URL produksi
// yang di-hardcode di sini maupun di layar mana pun.
//
// PENTING (web): babel-preset-expo hanya meng-inline akses LITERAL
// `process.env.EXPO_PUBLIC_*` saat build. Akses dinamis `process.env[name]`
// TIDAK di-inline — di bundle web `process.env` kosong dan API_URL selalu
// "". Karena itu setiap variabel dibaca dengan akses literal di sini;
// fallback `extra` (app.json) dipertahankan untuk native.
import Constants from "expo-constants";

function fromExtra(name: string): string {
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  return (extra?.[name] ?? "").trim();
}

/** Alamat dasar API web (Next.js), tanpa trailing slash. Kosong = belum diatur. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? fromExtra("EXPO_PUBLIC_API_URL"))
  .trim()
  .replace(/\/$/, "");

export const SUPABASE_URL = (
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? fromExtra("EXPO_PUBLIC_SUPABASE_URL")
).trim();
export const SUPABASE_ANON_KEY = (
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? fromExtra("EXPO_PUBLIC_SUPABASE_ANON_KEY")
).trim();

export const isApiConfigured = API_URL.length > 0;
export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
