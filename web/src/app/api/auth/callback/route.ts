import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";

// GET /api/auth/callback — tukar `code` OAuth (Google) jadi sesi cookie,
// lalu buat baris profiles bila belum ada. Dipakai Google OAuth + link reset.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  // Open-redirect guard (port PR #28): `next` wajib path relatif di situs ini.
  // Tanpa guard, `?next=//evil.com` atau `/\\evil.com` lolos lewat
  // `new URL(next, origin)` dan membawa pengguna yang baru login ke situs luar.
  const rawNext = url.searchParams.get("next") ?? "/pengaturan";
  const next = rawNext === "/" || /^\/[^/\\]/.test(rawNext) ? rawNext : "/pengaturan";
  if (!code) return NextResponse.redirect(new URL("/masuk?error=no-code", url.origin));
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(new URL("/masuk?error=oauth-gagal", url.origin));
  }
  if (isDbConfigured()) {
    try {
      const db = getDb();
      await db.insert(t.profiles).values({
        id: data.user.id,
        email: data.user.email ?? "",
        displayName: (data.user.user_metadata?.full_name as string | undefined)
          ?? (data.user.user_metadata?.display_name as string | undefined) ?? null,
      }).onConflictDoNothing();
    } catch (e) {
      // SEC-01: jangan telan error pembuatan profil — log agar kegagalan
      // terlihat; profil dibuat ulang saat login berikutnya. Tanpa log ini,
      // jendela eskalasi SEC-01 (profil belum ada) tidak terdeteksi.
      console.error("auth/callback: gagal membuat profil", e);
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
