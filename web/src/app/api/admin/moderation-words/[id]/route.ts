import { NextResponse } from "next/server";
import { errorToResponse, requireAdmin } from "@/lib/api";
import { isSuperadmin } from "@/lib/auth";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// DELETE /api/admin/moderation-words/:id — hapus kata (superadmin). §3.5.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  if (!isSuperadmin(a.profile)) {
    return NextResponse.json({ error: "Kamus kata hanya superadmin." }, { status: 403 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL belum diisi (P1)." }, { status: 503 });
  }
  try {
    const db = getDb();
    await db.delete(t.moderationWords).where(eq(t.moderationWords.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorToResponse(e);
  }
}
