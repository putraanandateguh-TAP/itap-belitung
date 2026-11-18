import { NextResponse } from "next/server";
import { errorToResponse, requireSession } from "@/lib/api";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

// DELETE /api/devices/:id — hapus token perangkat (pemilik saja). §3.1.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  if ("error" in s) return s.error;
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL belum diisi (P1)." }, { status: 503 });
  }
  try {
    const db = getDb();
    await db.delete(t.devices).where(and(eq(t.devices.id, id), eq(t.devices.userId, s.profile.id)));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorToResponse(e);
  }
}
