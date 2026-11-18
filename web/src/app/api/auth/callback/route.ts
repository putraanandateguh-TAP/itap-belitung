import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";

// GET /api/auth/callback — tukar `code` OAuth (Google) jadi sesi cookie,
// lalu buat baris profiles bila belum ada. Dipakai Google OAuth + link reset.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  // Open-redirect guard (workstream D): `next` wajib path relatif di situs
  // ini. Tanpa guard, `?next=//evil.com` lolos lewat `new URL(next, origin)`
  // dan mengarahkan pengguna yang baru login ke situs luar (phishing).
  const rawNext = url.searchParams.get("next") ?? "/pengaturan";
  const next = /^\/[^/\\]/.test(rawNext) || rawNext === "/" ? rawNext : "/pengaturan";
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
    } catch { /* profil dibuat saat login berikutnya */ }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
