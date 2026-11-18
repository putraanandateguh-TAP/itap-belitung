import { NextResponse } from "next/server";
import { createThread } from "@/lib/marketplace";
import { checkRateLimit, errorToResponse, requireSession } from "@/lib/api";
import { parseJsonBody, threadSchema } from "@/lib/validation";

// POST /api/threads — buat thread dari listing (1 per pembeli; tolak bila listing tidak aktif). §3.7 / F06.
export async function POST(req: Request) {
  const limited = checkRateLimit(req, "thread-create", 10);
  if (limited) return limited;
  const s = await requireSession();
  if ("error" in s) return s.error;
  const parsed = await parseJsonBody(req, threadSchema);
  if ("error" in parsed) return parsed.error;
  try {
    const thread = await createThread(s.profile, parsed.data.listing_id);
    return NextResponse.json(thread, { status: 201 });
  } catch (e) {
    return errorToResponse(e);
  }
}
