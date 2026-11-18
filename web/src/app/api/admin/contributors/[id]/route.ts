import { NextResponse } from "next/server";
import { errorToResponse, requireAdmin } from "@/lib/api";
import { contributorPatchSchema, parseJsonBody } from "@/lib/validation";
import { updateContributor } from "@/lib/data";

// PATCH /api/admin/contributors/:id — ubah verifikasi/auto-approve kontributor. §3.5.
// Mode seed: tersimpan di store in-memory (hilang saat restart).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const parsed = await parseJsonBody(req, contributorPatchSchema);
  if ("error" in parsed) return parsed.error;
  try {
    const updated = await updateContributor(id, parsed.data, { profile: a.profile });
    if (!updated) return NextResponse.json({ error: "Kontributor tidak ditemukan." }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e) {
    return errorToResponse(e);
  }
}
