import { NextResponse } from "next/server";
import { listContributionRevisions } from "@/lib/data";

// GET /api/contributions/:id/revisions — riwayat revisi. §3.4.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await listContributionRevisions(id));
}
