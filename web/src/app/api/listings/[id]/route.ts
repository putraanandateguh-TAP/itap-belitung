import { NextResponse } from "next/server";
import { getListing, softDeleteListing, updateListing } from "@/lib/marketplace";
import { errorToResponse, getSessionProfile, requireSession } from "@/lib/api";
import { listingPatchSchema, parseJsonBody } from "@/lib/validation";

// GET /api/listings/:id — detail; publik = ringkasan, terverifikasi = penuh + kontak. §3.6.
// PATCH — edit penawaran sendiri. DELETE — hapus (soft delete). §3.6 / F05/F07.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const profile = await getSessionProfile().catch(() => null);
    const listing = await getListing(id, profile);
    if (!listing) return NextResponse.json({ error: "Penawaran tidak ditemukan" }, { status: 404 });
    return NextResponse.json(listing);
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  if ("error" in s) return s.error;
  const parsed = await parseJsonBody(req, listingPatchSchema);
  if ("error" in parsed) return parsed.error;
  try {
    return NextResponse.json(await updateListing(s.profile, id, parsed.data));
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  if ("error" in s) return s.error;
  try {
    await softDeleteListing(s.profile, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorToResponse(e);
  }
}
