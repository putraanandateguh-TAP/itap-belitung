// Supabase server client (Route Handler / Server Component).
// Sesi disimpan di cookie http-only oleh @supabase/ssr; middleware
// (src/middleware.ts) me-refresh token kedaluwarsa di setiap request.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options));
          } catch {
            // Dipanggil dari Server Component — set cookie diabaikan di sana,
            // middleware yang me-refresh sesi.
          }
        },
      },
    },
  );
}

/** User Supabase Auth saat ini (null bila belum masuk / belum dikonfigurasi). */
export async function getAuthUser() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
