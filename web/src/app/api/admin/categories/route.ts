import { NextResponse } from "next/server";
import { createCategory, listCategories } from "@/lib/data";
import type { Channel } from "@/lib/types";

// GET /api/admin/categories — daftar kategori. POST — tambah kategori. §3.5.
export async function GET() {
  return NextResponse.json(await listCategories());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body.name_id || !body.channel) {
    return NextResponse.json({ error: "name_id dan channel wajib diisi" }, { status: 400 });
  }
  const cat = await createCategory(body.channel as Channel, String(body.name_id), String(body.name_en ?? ""));
  return NextResponse.json(cat, { status: 201 });
}
