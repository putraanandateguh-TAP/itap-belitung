import { NextResponse } from "next/server";
import { reviewArticle } from "@/lib/data";

// POST /api/admin/articles/:id/review — terbitkan/turunkan/kembalikan + catatan. §3.5.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const decision = body.decision;
  if (!["publish", "unpublish", "return"].includes(decision)) {
    return NextResponse.json({ error: "decision harus publish|unpublish|return" }, { status: 400 });
  }
  await reviewArticle(id, decision, String(body.note ?? ""));
  return NextResponse.json({ ok: true });
}
