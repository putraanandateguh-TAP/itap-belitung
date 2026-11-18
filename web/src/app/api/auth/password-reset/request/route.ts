import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/site-url";
import { createSupabaseServer } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/api";
import { parseJsonBody, passwordResetRequestSchema } from "@/lib/validation";

// POST /api/auth/password-reset/request — minta link reset (Supabase Auth;
// token sekali pakai, kedaluwarsa mengikuti pengaturan Auth, default 1 jam).
// Selalu jawab ok agar tidak membocorkan apakah email terdaftar. §3.1 / F17.
export async function POST(req: Request) {
  const limited = checkRateLimit(req, "auth-password-reset", 5);
  if (limited) return limited;
  const parsed = await parseJsonBody(req, passwordResetRequestSchema);
  if ("error" in parsed) return parsed.error;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi (P1)." }, { status: 503 });
  }
  const supabase = await createSupabaseServer();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/masuk?reset=1`,
  });
  return NextResponse.json({ ok: true, message: "Bila email terdaftar, tautan reset sudah dikirim." });
}
