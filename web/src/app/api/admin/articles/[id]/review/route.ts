import { NextResponse } from "next/server";
import { reviewArticle } from "@/lib/data";
import { errorToResponse, requireAdmin } from "@/lib/api";
import { parseJsonBody, reviewSchema } from "@/lib/validation";

// POST /api/admin/articles/:id/review — terbitkan/turunkan/kembalikan + catatan. §3.5.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const parsed = await parseJsonBody(req, reviewSchema);
  if ("error" in parsed) return parsed.error;
  try {
    await reviewArticle(id, parsed.data.decision, parsed.data.note, { profile: a.profile });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorToResponse(e);
  }
}
