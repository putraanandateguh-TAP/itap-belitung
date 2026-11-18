import { NextResponse } from "next/server";
import { getContribution, updateContribution } from "@/lib/data";
import { errorToResponse, requireSession } from "@/lib/api";
import { contributionPatchSchema, parseJsonBody } from "@/lib/validation";

// GET /api/contributions/:id — baca draft/kiriman sendiri. §3.4.
// PATCH — ubah draft (terkunci saat review, kecuali auto-approve). §3.4.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  if ("error" in s) return s.error;
  try {
    const c = await getContribution(id, { profile: s.profile });
    if (!c) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    return NextResponse.json(c);
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  if ("error" in s) return s.error;
  const parsed = await parseJsonBody(req, contributionPatchSchema);
  if ("error" in parsed) return parsed.error;
  try {
    const c = await updateContribution(id, parsed.data, { profile: s.profile });
    if (!c) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    return NextResponse.json(c);
  } catch (e) {
    return errorToResponse(e);
  }
}
