import { NextResponse } from "next/server";
import { deleteModerationWord, updateModerationWord } from "@/lib/data";
import { errorToResponse, requireAdmin } from "@/lib/api";
import { isSuperadmin, type SessionProfile } from "@/lib/auth";
import { moderationWordSchema, parseJsonBody } from "@/lib/validation";

function forbid(profile: SessionProfile) {
  if (!isSuperadmin(profile)) {
    return NextResponse.json({ error: "Kamus kata hanya superadmin." }, { status: 403 });
  }
  return null;
}

// PATCH /api/admin/moderation-words/:id — ubah kata/aksi (superadmin). §3.5.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const denied = forbid(a.profile);
  if (denied) return denied;
  const parsed = await parseJsonBody(req, moderationWordSchema.partial());
  if ("error" in parsed) return parsed.error;
  try {
    const updated = await updateModerationWord(id, parsed.data, { profile: a.profile });
    if (!updated) return NextResponse.json({ error: "Kata tidak ditemukan." }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e) {
    return errorToResponse(e);
  }
}

// DELETE /api/admin/moderation-words/:id — hapus kata (superadmin). §3.5.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const denied = forbid(a.profile);
  if (denied) return denied;
  try {
    await deleteModerationWord(id, { profile: a.profile });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorToResponse(e);
  }
}
