import { NextResponse } from "next/server";
import { createCategory, listCategories } from "@/lib/data";
import { errorToResponse, requireAdmin } from "@/lib/api";
import { categorySchema, parseJsonBody } from "@/lib/validation";

// GET /api/admin/categories — daftar kategori. POST — tambah kategori. §3.5.
export async function GET() {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return NextResponse.json(await listCategories());
}

export async function POST(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const parsed = await parseJsonBody(req, categorySchema);
  if ("error" in parsed) return parsed.error;
  try {
    const cat = await createCategory(parsed.data.channel, parsed.data.name_id, parsed.data.name_en, { profile: a.profile });
    return NextResponse.json(cat, { status: 201 });
  } catch (e) {
    return errorToResponse(e);
  }
}
