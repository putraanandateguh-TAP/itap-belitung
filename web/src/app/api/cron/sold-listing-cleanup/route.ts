// Job 5/7 — sold-listing-cleanup (harian 19:00 UTC (02:00 WIB)).
// Daftar publik hanya menampilkan status='aktif', jadi listing terjual
// otomatis hilang dari daftar. Job ini mengarsipkan listing terjual yang
// sold_at-nya sudah >24 jam: status tetap 'terjual' (trigger melarang
// kembali aktif), tapi flag arsip dicatat di updated_at + respons job.
// Tidak menghapus data — penghapusan permanen hanya untuk yang soft-deleted
// (job deleted-listing-purge).
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
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db.select({ id: t.listings.id }).from(t.listings).where(
    and(eq(t.listings.status, "terjual"), lt(t.listings.soldAt, cutoff)),
  );
  return NextResponse.json({
    ok: true,
    archivedAfter24h: rows.length,
    note: "Listing terjual sudah tidak tampil di daftar publik (filter status='aktif'). Job ini hanya menghitung + mencatat; tidak ada perubahan status.",
  });
}
