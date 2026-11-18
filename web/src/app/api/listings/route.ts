import { NextResponse } from "next/server";
import { createListing, listListings } from "@/lib/marketplace";
import { checkRateLimit, errorToResponse, getSessionProfile, requireSession } from "@/lib/api";
import { listingSchema, parseJsonBody } from "@/lib/validation";

// GET /api/listings — daftar penawaran publik (ringkasan). §3.6 / F03.
// POST — pasang penawaran (login terverifikasi + aturan disetujui). §3.6 / F05.
export async function GET(req: Request) {
  const u = new URL(req.url);
  try {
    const items = await listListings({
      q: u.searchParams.get("q") ?? undefined,
      page: Number(u.searchParams.get("page") ?? "1") || 1,
      perPage: 20,
    });
    return NextResponse.json(items);
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function POST(req: Request) {
  const limited = checkRateLimit(req, "listing-create", 5);
  if (limited) return limited;
  const s = await requireSession();
  if ("error" in s) return s.error;
  const parsed = await parseJsonBody(req, listingSchema);
  if ("error" in parsed) return parsed.error;
  try {
    const listing = await createListing(s.profile, parsed.data);
    return NextResponse.json(listing, { status: 201 });
  } catch (e) {
    return errorToResponse(e);
  }
}
