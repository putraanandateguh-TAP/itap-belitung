import { NextResponse } from "next/server";
import { reviewReport } from "@/lib/data";

// POST /api/admin/reports/:id/action — sembunyikan/buka blokir/nonaktifkan/tolak. §3.5.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (!["hidden", "dismissed", "reviewed"].includes(body.action)) {
    return NextResponse.json({ error: "action harus hidden|dismissed|reviewed" }, { status: 400 });
  }
  await reviewReport(id, body.action);
  return NextResponse.json({ ok: true });
}
