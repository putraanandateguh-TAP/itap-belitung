import { NextResponse } from "next/server";
import { listMyThreads } from "@/lib/marketplace";
import { errorToResponse, requireSession } from "@/lib/api";

// GET /api/me/threads — inbox + cuplikan pesan terakhir. §3.7 / F06.
export async function GET() {
  const s = await requireSession();
  if ("error" in s) return s.error;
  try {
    return NextResponse.json(await listMyThreads(s.profile));
  } catch (e) {
    return errorToResponse(e);
  }
}
