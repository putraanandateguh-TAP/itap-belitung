import { NextResponse } from "next/server";
import { addListingPhotos } from "@/lib/marketplace";
import { errorToResponse, requireSession } from "@/lib/api";
import { parseJsonBody } from "@/lib/validation";
import { z } from "zod";

// POST /api/listings/:id/photos — catat foto yang sudah diunggah ke Storage
// bucket `listing-photos` (kompresi + buang EXIF dilakukan di client, F05).
// Body: { paths: ["<user_id>/<uuid>.jpg", ...] } (maks 5 total per listing).
const schema = z.object({
  paths: z.array(z.string().trim().min(1).max(200)).min(1).max(5),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  if ("error" in s) return s.error;
  const parsed = await parseJsonBody(req, schema);
  if ("error" in parsed) return parsed.error;
  try {
    await addListingPhotos(s.profile, id, parsed.data.paths);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorToResponse(e);
  }
}
