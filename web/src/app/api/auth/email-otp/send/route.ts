import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/api";
import { emailOtpSendSchema, parseJsonBody } from "@/lib/validation";

// POST /api/auth/email-otp/send — kirim kode verifikasi email (Supabase Auth OTP, SMTP Resend P5). §3.1.
export async function POST(req: Request) {
  const limited = checkRateLimit(req, "auth-email-otp", 5);
  if (limited) return limited;
  const parsed = await parseJsonBody(req, emailOtpSendSchema);
  if ("error" in parsed) return parsed.error;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi (P1)." }, { status: 503 });
  }
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithOtp({ email: parsed.data.email });
  if (error) {
    return NextResponse.json({ error: "Tidak bisa mengirim kode. Coba lagi nanti." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, message: "Kode 6 digit dikirim ke emailmu." });
}
