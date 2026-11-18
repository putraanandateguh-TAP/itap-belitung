import { NextResponse } from "next/server";
import { listCategories } from "@/lib/data";
import type { Channel } from "@/lib/types";

// GET /api/categories?channel=wisata — kategori per kanal. §3.2.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const channel = u.searchParams.get("channel") as Channel | null;
  return NextResponse.json(await listCategories(channel ?? undefined));
}
