// Job 6/7 — deleted-listing-purge (harian 20:00 UTC (03:00 WIB)).
// Hapus permanen listing soft-deleted >14 hari (+ fotonya di Storage).
// Foto dihapus dulu via Supabase Storage (service role), baru baris listing
// (cascade menghapus listing_photos, threads, messages, bookmarks).
import { NextResponse } from "next/server";
import { cronAuth } from "@/lib/cron-auth";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { and, eq, lt } from "drizzle-orm";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = cronAuth(req);
  if (denied) return denied;
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL belum diisi (P1)." }, { status: 503 });
  }
  const db = getDb();
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const stale = await db.select().from(t.listings).where(
    and(eq(t.listings.status, "dihapus"), lt(t.listings.deletedAt, cutoff)),
  );
  let photosRemoved = 0;
  if (stale.length > 0) {
    const admin = createSupabaseAdmin();
    const ids = stale.map((s) => s.id);
    const photos = await db.select().from(t.listingPhotos);
    const paths = photos.filter((p) => ids.includes(p.listingId)).map((p) => p.storagePath);
    if (paths.length > 0) {
      const { data } = await admin.storage.from("listing-photos").remove(paths);
      photosRemoved = data?.length ?? 0;
    }
    for (const s of stale) {
      await db.delete(t.listings).where(eq(t.listings.id, s.id));
    }
  }
  return NextResponse.json({ ok: true, purged: stale.length, photosRemoved });
}
