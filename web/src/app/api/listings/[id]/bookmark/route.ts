import { NextResponse } from "next/server";
import { removeBookmark, setBookmark } from "@/lib/marketplace";
import { errorToResponse, requireSession } from "@/lib/api";
import { bookmarkSchema, parseJsonBody } from "@/lib/validation";

// POST /api/listings/:id/bookmark — simpan/sukai. DELETE — batal simpan/suka. §3.6 / F06.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  if ("error" in s) return s.error;
  const parsed = await parseJsonBody(req, bookmarkSchema);
  if ("error" in parsed) return parsed.error;
  try {
    await setBookmark(s.profile, id, parsed.data.type);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  if ("error" in s) return s.error;
  const parsed = await parseJsonBody(req, bookmarkSchema);
  if ("error" in parsed) return parsed.error;
  try {
    await removeBookmark(s.profile, id, parsed.data.type);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorToResponse(e);
  }
}
