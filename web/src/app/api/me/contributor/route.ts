import { NextResponse } from "next/server";
import { getContributorDashboard } from "@/lib/data";

// GET /api/me/contributor — dashboard kontributor. §3.4.
export async function GET() {
  return NextResponse.json(await getContributorDashboard());
}
