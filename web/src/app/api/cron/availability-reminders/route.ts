// Job 2/5 — availability-reminders (harian 09:00 WIB).
// Listing aktif yang last_confirmed_at-nya sudah >7 hari dianggap perlu
// diingatkan. Job ini TIDAK mengirim push sendiri (FCM butuh P4): ia
// mengembalikan daftar penjual yang perlu diingatkan; pengiriman push
// diaktifkan setelah proyek Firebase (P4) ada. Sampai saat itu, pengingat
// tampil sebagai badge di /me/listings (last_confirmed_at lama).
import { NextResponse } from "next/server";
import { cronAuth } from "@/lib/cron-auth";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { and, eq, lt } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = cronAuth(req);
  if (denied) return denied;
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL belum diisi (P1)." }, { status: 503 });
  }
  const db = getDb();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stale = await db.select({ id: t.listings.id, sellerId: t.listings.sellerId })
    .from(t.listings)
    .where(and(eq(t.listings.status, "aktif"), lt(t.listings.lastConfirmedAt, cutoff)));
  return NextResponse.json({
    ok: true,
    due: stale.length,
    note: "Push FCM belum aktif (P4). Daftar di atas perlu diingatkan saat FCM tersedia; badge 'perlu konfirmasi' tampil di halaman penawaranku.",
    sellerIds: [...new Set(stale.map((s) => s.sellerId))],
  });
}
