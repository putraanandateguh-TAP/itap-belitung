import { NextResponse } from "next/server";
import { errorToResponse, requireAdmin } from "@/lib/api";
import { categorySchema, parseJsonBody } from "@/lib/validation";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// PATCH /api/admin/categories/:id — ubah kategori. §3.5.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const parsed = await parseJsonBody(req, categorySchema.partial());
  if ("error" in parsed) return parsed.error;
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL belum diisi (P1)." }, { status: 503 });
  }
  try {
    const db = getDb();
    const updated = await db.update(t.categories).set({
      ...(parsed.data.name_id !== undefined ? { nameId: parsed.data.name_id } : {}),
      ...(parsed.data.name_en !== undefined ? { nameEn: parsed.data.name_en } : {}),
      ...(parsed.data.channel !== undefined ? { channel: parsed.data.channel } : {}),
    }).where(eq(t.categories.id, id)).returning();
    if (!updated[0]) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    return NextResponse.json(updated[0]);
  } catch (e) {
    return errorToResponse(e);
  }
}
