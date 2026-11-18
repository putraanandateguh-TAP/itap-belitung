import { NextResponse } from "next/server";
import { listPoints } from "@/lib/data";
import { errorToResponse, requireSession } from "@/lib/api";

// GET /api/me/points — riwayat poin. §3.4.
export async function GET() {
  const s = await requireSession();
  if ("error" in s) return s.error;
  try {
    return NextResponse.json(await listPoints(undefined, { profile: s.profile }));
  } catch (e) {
    return errorToResponse(e);
  }
}
