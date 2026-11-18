import { NextResponse } from "next/server";
import { getThread } from "@/lib/marketplace";
import { errorToResponse, requireSession } from "@/lib/api";

// GET /api/threads/:id — satu thread + ringkasan barangnya (peserta saja). §3.7 / F06.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  if ("error" in s) return s.error;
  try {
    const thread = await getThread(s.profile, id);
    if (!thread) return NextResponse.json({ error: "Percakapan tidak ditemukan" }, { status: 404 });
    return NextResponse.json(thread);
  } catch (e) {
    return errorToResponse(e);
  }
}
