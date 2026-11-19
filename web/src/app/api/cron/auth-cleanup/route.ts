// Job 7/7 — auth-cleanup (harian 21:00 UTC (04:00 WIB)).
// Supabase Auth mengelola token reset/sesi sendiri; yang bisa dibersihkan
// dari sisi aplikasi: baris devices dengan token FCM yang tidak pernah
// dipakai (di sini: tidak ada pemakaian tercatat — FCM butuh P4) dan
// snapshot info harian yang lebih tua dari 30 hari (hemat penyimpanan).
// Token reset kedaluwarsa + sesi yang dicabut sudah ditangani Supabase Auth
// (reset kata sandi mencabut semua sesi — lihat /api/auth/password-reset).
import { NextResponse } from "next/server";
import { cronAuth } from "@/lib/cron-auth";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { lt, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = cronAuth(req);
  if (denied) return denied;
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL belum diisi (P1)." }, { status: 503 });
  }
  const db = getDb();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const old = await db.select({ id: t.dailyInfoSnapshots.id }).from(t.dailyInfoSnapshots)
    .where(lt(t.dailyInfoSnapshots.asOfDate, cutoff.toISOString().slice(0, 10)));
  for (const row of old) {
    await db.delete(t.dailyInfoSnapshots).where(eq(t.dailyInfoSnapshots.id, row.id));
  }
  return NextResponse.json({
    ok: true,
    oldSnapshotsRemoved: old.length,
    note: "Token reset/sesi dikelola Supabase Auth (dicabut saat reset kata sandi).",
  });
}
