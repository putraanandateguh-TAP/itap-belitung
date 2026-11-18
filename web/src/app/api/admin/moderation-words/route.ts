import { NextResponse } from "next/server";
import { listModerationWords } from "@/lib/data";
import { errorToResponse, requireAdmin } from "@/lib/api";
import { isSuperadmin } from "@/lib/auth";
import { moderationWordSchema, parseJsonBody } from "@/lib/validation";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";

// GET /api/admin/moderation-words — kamus kata (superadmin). §3.5.
// POST — tambah kata (sensor/tahan). §3.5.
export async function GET() {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return NextResponse.json(await listModerationWords());
}

export async function POST(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  if (!isSuperadmin(a.profile)) {
    return NextResponse.json({ error: "Kamus kata hanya superadmin." }, { status: 403 });
  }
  const parsed = await parseJsonBody(req, moderationWordSchema);
  if ("error" in parsed) return parsed.error;
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL belum diisi (P1)." }, { status: 503 });
  }
  try {
    const db = getDb();
    const inserted = await db.insert(t.moderationWords).values({
      word: parsed.data.word.toLowerCase(), action: parsed.data.action, createdBy: a.profile.id,
    }).returning();
    return NextResponse.json(inserted[0], { status: 201 });
  } catch (e) {
    return errorToResponse(e);
  }
}
