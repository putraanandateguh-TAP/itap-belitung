import { NextResponse } from "next/server";
import { listMyListings } from "@/lib/marketplace";
import { errorToResponse, requireSession } from "@/lib/api";

// GET /api/me/listings — penawaranku + badge status. §3.6 / F07.
export async function GET() {
  const s = await requireSession();
  if ("error" in s) return s.error;
  try {
    return NextResponse.json(await listMyListings(s.profile));
  } catch (e) {
    return errorToResponse(e);
  }
}
