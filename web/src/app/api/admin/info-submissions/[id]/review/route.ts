import { NextResponse } from "next/server";
import { errorToResponse, requireAdmin } from "@/lib/api";
import { infoReviewSchema, parseJsonBody } from "@/lib/validation";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST /api/admin/info-submissions/:id/review — kurasi: setujui/tolak (+ jadi referensi AI). §3.5.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const parsed = await parseJsonBody(req, infoReviewSchema);
  if ("error" in parsed) return parsed.error;
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL belum diisi (P1)." }, { status: 503 });
  }
  try {
    const db = getDb();
    const updated = await db.update(t.infoSubmissions).set({
      status: parsed.data.decision,
      curatedForAi: parsed.data.decision === "approved",
    }).where(eq(t.infoSubmissions.id, id)).returning();
    if (!updated[0]) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    return NextResponse.json(updated[0]);
  } catch (e) {
    return errorToResponse(e);
  }
}
