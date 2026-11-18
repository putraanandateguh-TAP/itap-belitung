import { NextResponse } from "next/server";
import { errorToResponse, requireAdmin } from "@/lib/api";
import { contributorPatchSchema, parseJsonBody } from "@/lib/validation";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";

// PATCH /api/admin/contributors/:id — ubah verifikasi/auto-approve kontributor. §3.5.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const parsed = await parseJsonBody(req, contributorPatchSchema);
  if ("error" in parsed) return parsed.error;
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL belum diisi (P1)." }, { status: 503 });
  }
  try {
    const db = getDb();
    const patch: Partial<typeof t.contributorProfiles.$inferInsert> = {};
    if (parsed.data.verification_status !== undefined) patch.verificationStatus = parsed.data.verification_status;
    if (parsed.data.auto_approve !== undefined) patch.autoApprove = parsed.data.auto_approve;
    const updated = await db.insert(t.contributorProfiles).values({
      userId: id, ...patch,
    }).onConflictDoUpdate({ target: t.contributorProfiles.userId, set: patch }).returning();
    return NextResponse.json(updated[0]);
  } catch (e) {
    return errorToResponse(e);
  }
}
