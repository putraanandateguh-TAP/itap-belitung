import { NextResponse } from "next/server";
import { markListingSold } from "@/lib/marketplace";
import { errorToResponse, requireSession } from "@/lib/api";

// POST /api/listings/:id/mark-sold — tandai terjual (status -> terjual). §3.6 / F07.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  if ("error" in s) return s.error;
  try {
    return NextResponse.json(await markListingSold(s.profile, id));
  } catch (e) {
    return errorToResponse(e);
  }
}
