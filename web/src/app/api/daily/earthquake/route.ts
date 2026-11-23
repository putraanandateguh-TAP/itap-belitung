import { NextResponse } from "next/server";
import { getDailySnapshot } from "@/lib/daily";

// GET /api/daily/earthquake — dari cache daily_info_snapshots (diisi cron).
// Tanpa cache: 503 + pesan jujur "belum tersedia", BUKAN fetch per request.
export async function GET() {
  const snap = await getDailySnapshot("earthquake");
  if (!snap) {
    return NextResponse.json(
      { error: "Data belum tersedia saat ini. Coba lagi nanti." },
      { status: 503 },
    );
  }
  return NextResponse.json({ ...snap, note: snap.stale ? "Data terakhir diperbarui " + snap.as_of + " (mungkin sudah usang)." : undefined });
}
