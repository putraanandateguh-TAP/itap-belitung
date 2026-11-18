import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/api";
import { emailOtpVerifySchema, parseJsonBody } from "@/lib/validation";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";

// POST /api/auth/email-otp/verify — verifikasi kode email -> sesi. §3.1.
// Setelah verifikasi, buat baris profiles bila belum ada (id = auth.users.id).
export async function POST(req: Request) {
  const limited = checkRateLimit(req, "auth-email-otp-verify", 10);
  if (limited) return limited;
  const parsed = await parseJsonBody(req, emailOtpVerifySchema);
  if ("error" in parsed) return parsed.error;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi (P1)." }, { status: 503 });
  }
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: "email",
  });
  if (error || !data.user) {
    return NextResponse.json({ error: "Kode tidak cocok atau sudah kedaluwarsa." }, { status: 400 });
  }
  if (isDbConfigured()) {
    try {
      const db = getDb();
      await db.insert(t.profiles).values({
        id: data.user.id,
        email: data.user.email ?? parsed.data.email,
        displayName: (data.user.user_metadata?.display_name as string | undefined) ?? null,
      }).onConflictDoNothing();
    } catch (e) {
      // SEC-01: jangan telan error pembuatan profil — log agar kegagalan
      // terlihat; profil dibuat ulang saat login berikutnya.
      console.error("auth/email-otp/verify: gagal membuat profil", e);
    }
  }
  return NextResponse.json({ ok: true, userId: data.user.id });
}
