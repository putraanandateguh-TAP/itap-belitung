import { NextResponse } from "next/server";
import { getContributorDashboard } from "@/lib/data";
import { errorToResponse, requireSession } from "@/lib/api";

// GET /api/me/contributor — dashboard kontributor. §3.4.
export async function GET() {
  const s = await requireSession();
  if ("error" in s) return s.error;
  try {
    return NextResponse.json(await getContributorDashboard({ profile: s.profile }));
  } catch (e) {
    return errorToResponse(e);
  }
}
