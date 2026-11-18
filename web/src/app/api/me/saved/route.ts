import { NextResponse } from "next/server";
import { listSaved } from "@/lib/marketplace";
import { errorToResponse, requireSession } from "@/lib/api";

// GET /api/me/saved — tersimpan/disukai. §3.6 / F06.
export async function GET() {
  const s = await requireSession();
  if ("error" in s) return s.error;
  try {
    return NextResponse.json(await listSaved(s.profile));
  } catch (e) {
    return errorToResponse(e);
  }
}
