import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

// GET /api/admin/listings — semua listing untuk moderasi. §3.5 / F08.
// Mode seed (tanpa DB): daftar kosong yang jujur — belum ada listing seed.
export async function GET(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  if (!isDbConfigured()) {
    return NextResponse.json([]);
  }
  const u = new URL(req.url);
  const status = u.searchParams.get("status");
  const db = getDb();
  const rows = await db.select().from(t.listings)
    .where(status ? eq(t.listings.status, status as (typeof t.listings.$inferSelect)["status"]) : undefined)
    .orderBy(desc(t.listings.createdAt));
  return NextResponse.json(rows);
}
