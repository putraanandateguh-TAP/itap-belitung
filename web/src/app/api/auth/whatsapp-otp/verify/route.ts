import { NextResponse } from "next/server";
import { checkRateLimit, requireSession } from "@/lib/api";

// POST /api/auth/whatsapp-otp/verify — verifikasi OTP WhatsApp.
// STATUS: 503 selama P2 belum ada. Setelah P2, verifikasi membandingkan
// hash kode dengan tabel whatsapp_otps (lihat supabase/functions/whatsapp-otp).
export async function POST(req: Request) {
  const limited = checkRateLimit(req, "auth-wa-otp-verify", 5);
  if (limited) return limited;
  const s = await requireSession();
  if ("error" in s) return s.error;
  return NextResponse.json(
    { error: "Verifikasi WhatsApp belum tersedia — butuh akun Meta WhatsApp Business + template OTP yang disetujui (P2)." },
    { status: 503 },
  );
}
