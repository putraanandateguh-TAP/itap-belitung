import { NextResponse } from "next/server";
import { moderateComment } from "@/lib/data";
import { errorToResponse, requireAdmin } from "@/lib/api";
import { commentReviewSchema, parseJsonBody } from "@/lib/validation";

// POST /api/admin/comments/:id/review — setujui/tolak komentar tertunda (S22).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const parsed = await parseJsonBody(req, commentReviewSchema);
  if ("error" in parsed) return parsed.error;
  try {
    await moderateComment(id, parsed.data.decision, { profile: a.profile });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorToResponse(e);
  }
}
