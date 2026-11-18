import { NextResponse } from "next/server";
import { checkRateLimit, requireSession } from "@/lib/api";

// POST /api/auth/whatsapp-otp/send — kirim OTP WhatsApp via Meta API.
// STATUS: 503 selama P2 belum ada (akun Meta WhatsApp Business + template
// OTP disetujui). Setelah P2, route ini memanggil Edge Function
// whatsapp-otp dengan JWT pengguna. §3.1 / F04.
export async function POST(req: Request) {
  const limited = checkRateLimit(req, "auth-wa-otp", 3);
  if (limited) return limited;
  const s = await requireSession();
  if ("error" in s) return s.error;
  return NextResponse.json(
    { error: "Verifikasi WhatsApp belum tersedia — butuh akun Meta WhatsApp Business + template OTP yang disetujui (P2)." },
    { status: 503 },
  );
}
