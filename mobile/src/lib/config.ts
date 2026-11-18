// Konfigurasi runtime — semua dari env EXPO_PUBLIC_*. TIDAK ADA URL produksi
// yang di-hardcode di sini maupun di layar mana pun.
import Constants from "expo-constants";

function env(name: string): string {
  const fromProcess = (process.env as Record<string, string | undefined>)[name];
  const fromExtra =
    (Constants.expoConfig?.extra as Record<string, string | undefined> | undefined)?.[name];
  return (fromProcess ?? fromExtra ?? "").trim();
}

/** Alamat dasar API web (Next.js), tanpa trailing slash. Kosong = belum diatur. */
export const API_URL = env("EXPO_PUBLIC_API_URL").replace(/\/$/, "");

export const SUPABASE_URL = env("EXPO_PUBLIC_SUPABASE_URL");
export const SUPABASE_ANON_KEY = env("EXPO_PUBLIC_SUPABASE_ANON_KEY");

export const isApiConfigured = API_URL.length > 0;
export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
