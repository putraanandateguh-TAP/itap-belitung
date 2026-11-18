import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { checkRateLimit, requireSession } from "@/lib/api";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { createSupabaseServer } from "@/lib/supabase/server";

// POST /api/auth/whatsapp-otp/send — kirim OTP WhatsApp via Edge Function.
// STATUS: 503 selama P2 belum ada (akun Meta WhatsApp Business + template
// OTP disetujui) — Edge Function mengembalikan 503 bila env Meta belum
// diisi, dan route ini meneruskan status itu apa adanya (fail-closed).
// Route ini TIDAK PERNAH mengirim `code`: OTP dibuat server-side di dalam
// Edge Function (SEC-06). `to` diambil dari profiles.whatsapp_number
// pemanggil sendiri — Edge Function memverifikasi ulang kecocokannya
// (nomor orang lain -> 403) dan menegakkan rate limit 3/jam. §3.1 / F04.
export async function POST(req: Request) {
  const limited = checkRateLimit(req, "auth-wa-otp", 3);
  if (limited) return limited;
  const s = await requireSession();
  if ("error" in s) return s.error;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !isDbConfigured()) {
    return NextResponse.json(
      { error: "Verifikasi WhatsApp belum tersedia — backend Supabase (P1) belum dikonfigurasi." },
      { status: 503 },
    );
  }
  // Nomor tujuan = nomor di profil pemanggil sendiri (bukan dari body —
  // body dari client tidak dipercaya untuk urusan ini).
  let whatsappNumber: string | null;
  try {
    const db = getDb();
    const rows = await db.select({ whatsappNumber: t.profiles.whatsappNumber })
      .from(t.profiles).where(eq(t.profiles.id, s.profile.id)).limit(1);
    whatsappNumber = rows[0]?.whatsappNumber ?? null;
  } catch {
    return NextResponse.json(
      { error: "Verifikasi WhatsApp belum tersedia — tabel whatsapp_otps belum dibuat (migrasi 0009)." },
      { status: 503 },
    );
  }
  if (!whatsappNumber) {
    return NextResponse.json(
      { error: "Nomor WhatsApp belum diisi di profil — isi dulu sebelum minta kode." },
      { status: 400 },
    );
  }
  try {
    const supabase = await createSupabaseServer();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }
    const res = await fetch(`${url}/functions/v1/whatsapp-otp`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: whatsappNumber }),
    });
    const payload: unknown = await res.json().catch(() => null);
    const message = (payload as { error?: string } | null)?.error;
    if (!res.ok) {
      return NextResponse.json(
        { error: message ?? "Pengiriman OTP WhatsApp gagal. Coba lagi nanti." },
        { status: res.status },
      );
    }
    return NextResponse.json({ ok: true, message: "Kode 6 digit dikirim ke WhatsApp kamu (berlaku 5 menit)." });
  } catch {
    return NextResponse.json(
      { error: "Pengiriman OTP WhatsApp gagal. Coba lagi nanti." },
      { status: 502 },
    );
  }
}
