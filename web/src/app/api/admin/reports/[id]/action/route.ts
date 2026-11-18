import { NextResponse } from "next/server";
import { reviewReport } from "@/lib/data";
import { errorToResponse, requireAdmin } from "@/lib/api";
import { parseJsonBody, reportActionSchema } from "@/lib/validation";

// POST /api/admin/reports/:id/action — sembunyikan/buka blokir/nonaktifkan/tolak. §3.5.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const parsed = await parseJsonBody(req, reportActionSchema);
  if ("error" in parsed) return parsed.error;
  try {
    await reviewReport(id, parsed.data.action, { profile: a.profile });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorToResponse(e);
  }
}
