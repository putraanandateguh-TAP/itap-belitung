import { NextResponse } from "next/server";
import { addModerationWord, listModerationWords } from "@/lib/data";
import { errorToResponse, requireAdmin } from "@/lib/api";
import { isSuperadmin } from "@/lib/auth";
import { moderationWordSchema, parseJsonBody } from "@/lib/validation";

// GET /api/admin/moderation-words — kamus kata (superadmin). §3.5.
// POST — tambah kata (sensor/tahan). §3.5.
// Mode seed: tambah kata tersimpan di store in-memory (hilang saat restart)
// supaya UI CRUD bisa dipakai sebelum DB live; bukan klaim data tersimpan.
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
  try {
    const word = await addModerationWord(parsed.data.word, parsed.data.action, { profile: a.profile });
    return NextResponse.json(word, { status: 201 });
  } catch (e) {
    return errorToResponse(e);
  }
}
