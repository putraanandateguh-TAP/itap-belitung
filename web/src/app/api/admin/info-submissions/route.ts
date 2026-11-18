import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

// GET /api/admin/info-submissions — kiriman info warga untuk kurasi. §3.5.
export async function GET(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL belum diisi (P1)." }, { status: 503 });
  }
  const u = new URL(req.url);
  const status = u.searchParams.get("status");
  const db = getDb();
  const rows = await db.select().from(t.infoSubmissions)
    .where(status ? eq(t.infoSubmissions.status, status as (typeof t.infoSubmissions.$inferSelect)["status"]) : undefined)
    .orderBy(desc(t.infoSubmissions.createdAt));
  return NextResponse.json(rows);
}
