import { NextResponse } from "next/server";
import { createListing, listListings, type ListingSort } from "@/lib/marketplace";
import { checkRateLimit, errorToResponse, getSessionProfile, requireSession } from "@/lib/api";
import { listingSchema, parseJsonBody } from "@/lib/validation";
import { isListingCategory } from "@/lib/listings";

// GET /api/listings — daftar penawaran publik (ringkasan) + pagination.
// §3.6 / F03. Query: q, category, sort (terbaru|termurah|termahal|terpopuler), page.
// Mengembalikan Paginated<ListingPublic> { items, page, per_page, total, total_pages }.
// Tanpa DATABASE_URL (P1): total 0 yang jujur, bukan 500 (BUG-001).
export async function GET(req: Request) {
  const u = new URL(req.url);
  const sortParam = u.searchParams.get("sort") ?? "terbaru";
  const sort: ListingSort = ["terbaru", "termurah", "termahal", "terpopuler"].includes(sortParam)
    ? (sortParam as ListingSort)
    : "terbaru";
  const categoryParam = u.searchParams.get("category") ?? "";
  try {
    const result = await listListings({
      q: u.searchParams.get("q") ?? undefined,
      category: isListingCategory(categoryParam) ? categoryParam : undefined,
      sort,
      page: Number(u.searchParams.get("page") ?? "1") || 1,
      perPage: 20,
    });
    return NextResponse.json(result);
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
