import { NextResponse } from "next/server";
import { moderateListing } from "@/lib/marketplace";
import { errorToResponse, requireAdmin } from "@/lib/api";
import { adminListingActionSchema, parseJsonBody } from "@/lib/validation";

// POST /api/admin/listings/:id/action — nonaktifkan / aktifkan lagi penawaran (S22).
// Dipakai antrean moderasi + membuka listing yang ditahan kamus kata.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const parsed = await parseJsonBody(req, adminListingActionSchema);
  if ("error" in parsed) return parsed.error;
  try {
    const listing = await moderateListing(a.profile, id, parsed.data.action);
    return NextResponse.json(listing);
  } catch (e) {
    return errorToResponse(e);
  }
}
