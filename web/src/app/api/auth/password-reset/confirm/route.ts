import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/api";
import { parseJsonBody, passwordResetConfirmSchema } from "@/lib/validation";

// POST /api/auth/password-reset/confirm — kata sandi baru + cabut sesi lama.
// Supabase Auth: updateUser + signOut({ scope: "others" }) mencabut semua
// sesi lain (web & Android). §3.1 / F17.
export async function POST(req: Request) {
  const limited = checkRateLimit(req, "auth-password-reset-confirm", 5);
  if (limited) return limited;
  const parsed = await parseJsonBody(req, passwordResetConfirmSchema);
  if ("error" in parsed) return parsed.error;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi (P1)." }, { status: 503 });
  }
  const supabase = await createSupabaseServer();
  // Token reset dikirim sebagai code di URL callback Supabase; client
  // menukarnya jadi sesi dulu (exchangeCodeForSession), lalu memanggil
  // route ini dengan sesi aktif.
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return NextResponse.json({ error: "Token reset tidak valid atau sudah kedaluwarsa." }, { status: 400 });
  }
  await supabase.auth.signOut({ scope: "others" });
  return NextResponse.json({ ok: true, message: "Kata sandi diubah. Sesi lama di perangkat lain sudah dicabut." });
}
