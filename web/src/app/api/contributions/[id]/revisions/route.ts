import { NextResponse } from "next/server";
import { getContribution, listContributionRevisions } from "@/lib/data";
import { errorToResponse, requireSession } from "@/lib/api";

// GET /api/contributions/:id/revisions — riwayat revisi (pemilik + redaksi). §3.4.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  if ("error" in s) return s.error;
  try {
    await getContribution(id, { profile: s.profile }); // cek akses dulu
    return NextResponse.json(await listContributionRevisions(id));
  } catch (e) {
    return errorToResponse(e);
  }
}
