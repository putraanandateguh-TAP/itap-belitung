// Supabase client — HANYA untuk Auth (+ Realtime di layar chat).
// Data bisnis dibaca lewat route API Next.js (src/lib/api.ts), bukan
// langsung dari tabel. Tanpa URL/anon key (P1 belum ada), client tidak
// dibuat dan layar auth menampilkan pesan yang jujur.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : (null as unknown as SupabaseClient);

export function assertSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase belum dikonfigurasi (P1). Isi EXPO_PUBLIC_SUPABASE_URL dan EXPO_PUBLIC_SUPABASE_ANON_KEY di .env.",
    );
  }
}
