import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/site-url";
import { createSupabaseServer } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/api";
import { parseJsonBody, signupSchema } from "@/lib/validation";

// POST /api/auth/signup — daftar email + password (Supabase Auth). §3.1.
// Supabase mengirim email verifikasi via SMTP Resend (P5). Profil dibuat
// setelah verifikasi (lihat /api/auth/email-otp/verify + trigger profil).
export async function POST(req: Request) {
  const limited = checkRateLimit(req, "auth-signup", 5);
  if (limited) return limited;
  const parsed = await parseJsonBody(req, signupSchema);
  if ("error" in parsed) return parsed.error;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi (P1)." }, { status: 503 });
  }
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${siteUrl()}/verifikasi`,
    },
  });
  if (error) {
    return NextResponse.json({ error: "Pendaftaran gagal. Email mungkin sudah terdaftar." }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    userId: data.user?.id ?? null,
    needsVerification: !data.session,
    message: "Cek emailmu untuk kode verifikasi (dikirim via Resend SMTP, P5).",
  });
}
