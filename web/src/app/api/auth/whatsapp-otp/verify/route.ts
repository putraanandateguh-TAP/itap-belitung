import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { checkRateLimit, requireSession } from "@/lib/api";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { parseJsonBody, whatsappOtpVerifySchema } from "@/lib/validation";

// POST /api/auth/whatsapp-otp/verify — verifikasi OTP WhatsApp.
// Membandingkan hash kode yang diketik pengguna dengan hash di tabel
// whatsapp_otps (Drizzle server-side via DATABASE_URL — tabel ini RLS
// deny-by-default, hanya service_role yang bisa membacanya; route ini
// berjalan server-side sehingga memakai koneksi langsung, bukan RLS).
// Aturan: kode terbaru yang belum terverifikasi milik pemanggil; cek expiry
// 5 menit; maks 5 percobaan salah lalu kode dihanguskan (baris dihapus);
// bila cocok -> profiles.whatsapp_verified_at diisi + OTP ditandai
// verified (verified_at, single-use). Bila tabel belum ada (migrasi 0009
// belum diterapkan) -> 503 yang jujur, bukan 500. §3.1 / F04 / SEC-06.
const MAX_ATTEMPTS = 5;

function isMissingTable(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  const code = (e as { code?: string })?.code;
  return code === "42P01" || msg.includes("does not exist") || msg.includes("whatsapp_otps");
}

export async function POST(req: Request) {
  const limited = checkRateLimit(req, "auth-wa-otp-verify", 5);
  if (limited) return limited;
  const s = await requireSession();
  if ("error" in s) return s.error;
  const parsed = await parseJsonBody(req, whatsappOtpVerifySchema);
  if ("error" in parsed) return parsed.error;
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "Verifikasi WhatsApp belum tersedia — backend Supabase (P1) belum dikonfigurasi." },
      { status: 503 },
    );
  }
  const db = getDb();
  try {
    // Kode aktif terbaru milik pemanggil yang belum terverifikasi.
    const rows = await db.select().from(t.whatsappOtps)
      .where(and(
        eq(t.whatsappOtps.userId, s.profile.id),
        isNull(t.whatsappOtps.verifiedAt),
      ))
      .orderBy(desc(t.whatsappOtps.createdAt))
      .limit(1);
    const otp = rows[0];
    if (!otp) {
      return NextResponse.json(
        { error: "Tidak ada kode aktif. Minta kode baru dulu." },
        { status: 400 },
      );
    }
    if (otp.expiresAt.getTime() < Date.now()) {
      await db.delete(t.whatsappOtps).where(eq(t.whatsappOtps.id, otp.id));
      return NextResponse.json(
        { error: "Kode sudah kedaluwarsa. Minta kode baru." },
        { status: 400 },
      );
    }
    if (otp.attempts >= MAX_ATTEMPTS) {
      await db.delete(t.whatsappOtps).where(eq(t.whatsappOtps.id, otp.id));
      return NextResponse.json(
        { error: "Terlalu banyak percobaan salah — kode hangus. Minta kode baru." },
        { status: 400 },
      );
    }
    const inputHash = createHash("sha256").update(parsed.data.code).digest();
    const storedHash = Buffer.from(otp.codeHash, "hex");
    const match = storedHash.length === inputHash.length
      && timingSafeEqual(storedHash, inputHash);
    if (!match) {
      const attempts = otp.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await db.delete(t.whatsappOtps).where(eq(t.whatsappOtps.id, otp.id));
        return NextResponse.json(
          { error: "Kode tidak cocok. Terlalu banyak percobaan salah — kode hangus, minta kode baru." },
          { status: 400 },
        );
      }
      await db.update(t.whatsappOtps)
        .set({ attempts })
        .where(eq(t.whatsappOtps.id, otp.id));
      return NextResponse.json({ error: "Kode tidak cocok." }, { status: 400 });
    }
    // Cocok: tandai nomor terverifikasi + hanguskan OTP (single-use).
    await db.update(t.profiles)
      .set({ whatsappVerifiedAt: new Date() })
      .where(eq(t.profiles.id, s.profile.id));
    await db.update(t.whatsappOtps)
      .set({ verifiedAt: new Date() })
      .where(eq(t.whatsappOtps.id, otp.id));
    return NextResponse.json({ ok: true, message: "Nomor WhatsApp terverifikasi." });
  } catch (e) {
    if (isMissingTable(e)) {
      return NextResponse.json(
        { error: "Verifikasi WhatsApp belum tersedia — tabel whatsapp_otps belum dibuat (migrasi 0009)." },
        { status: 503 },
      );
    }
    console.error("whatsapp-otp verify gagal:", e);
    return NextResponse.json(
      { error: "Verifikasi gagal. Coba lagi nanti." },
      { status: 500 },
    );
  }
}
