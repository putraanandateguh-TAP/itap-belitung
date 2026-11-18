import { NextResponse } from "next/server";
import { listMessages, sendMessage } from "@/lib/marketplace";
import { checkRateLimit, errorToResponse, requireSession } from "@/lib/api";
import { messageSchema, parseJsonBody } from "@/lib/validation";

// GET /api/threads/:id/messages — pesan dalam thread (peserta saja). §3.7 / F06.
// POST — kirim pesan (nomor penjual tetap tersamar). §3.7 / F06.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  if ("error" in s) return s.error;
  try {
    return NextResponse.json(await listMessages(s.profile, id));
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const limited = checkRateLimit(req, "message-send", 30);
  if (limited) return limited;
  const s = await requireSession();
  if ("error" in s) return s.error;
  const parsed = await parseJsonBody(req, messageSchema);
  if ("error" in parsed) return parsed.error;
  try {
    const msg = await sendMessage(s.profile, id, parsed.data.text);
    return NextResponse.json(msg, { status: 201 });
  } catch (e) {
    return errorToResponse(e);
  }
}
