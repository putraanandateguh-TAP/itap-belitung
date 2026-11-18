import { NextResponse } from "next/server";
import { restoreListing } from "@/lib/marketplace";
import { errorToResponse, requireSession } from "@/lib/api";

// POST /api/listings/:id/restore — pulihkan yang terhapus (<=14 hari). §3.6 / F07.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  if ("error" in s) return s.error;
  try {
    return NextResponse.json(await restoreListing(s.profile, id));
  } catch (e) {
    return errorToResponse(e);
  }
}
