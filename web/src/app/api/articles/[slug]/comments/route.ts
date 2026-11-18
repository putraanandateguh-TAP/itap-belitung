import { NextResponse } from "next/server";
import { addComment, listComments } from "@/lib/data";

// GET /api/articles/:slug/comments — komentar yang disetujui. §3.3.
// POST — tulis tanggapan (masuk antrean moderasi, status pending). §3.3.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return NextResponse.json(await listComments(slug));
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "").trim();
  if (text.length < 3) {
    return NextResponse.json({ error: "Tanggapan terlalu pendek" }, { status: 400 });
  }
  const comment = await addComment(slug, String(body.author_name ?? "Pembaca"), text);
  return NextResponse.json(comment, { status: 201 });
}
