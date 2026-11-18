import { NextResponse } from "next/server";
import { reviewInfoSubmission } from "@/lib/data";
import { errorToResponse, requireAdmin } from "@/lib/api";
import { infoReviewSchema, parseJsonBody } from "@/lib/validation";

// POST /api/admin/info-submissions/:id/review — kurasi: setujui/tolak (+ jadi referensi AI). §3.5.
// Mode seed: putusan tersimpan di store in-memory (hilang saat restart).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const parsed = await parseJsonBody(req, infoReviewSchema);
  if ("error" in parsed) return parsed.error;
  try {
    const updated = await reviewInfoSubmission(id, parsed.data.decision, { profile: a.profile });
    if (!updated) return NextResponse.json({ error: "Kiriman tidak ditemukan." }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e) {
    return errorToResponse(e);
  }
}
