import { NextResponse } from "next/server";
import { addComment, listComments } from "@/lib/data";
import { checkRateLimit, errorToResponse, requireSession } from "@/lib/api";
import { commentSchema, parseJsonBody } from "@/lib/validation";

// GET /api/articles/:slug/comments — komentar yang disetujui. §3.3.
// POST — tulis tanggapan (masuk antrean moderasi, status pending). §3.3.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return NextResponse.json(await listComments(slug));
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const limited = checkRateLimit(req, "comment", 10);
  if (limited) return limited;
  const s = await requireSession();
  if ("error" in s) return s.error;
  const parsed = await parseJsonBody(req, commentSchema);
  if ("error" in parsed) return parsed.error;
  try {
    const comment = await addComment(slug, "", parsed.data.text, { profile: s.profile });
    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    return errorToResponse(e);
  }
}
