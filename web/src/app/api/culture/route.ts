import { NextResponse } from "next/server";
import { listCulture } from "@/lib/daily";

// GET /api/culture — daftar cerita budaya + kategori. §3.2 / F15 (M5).
export async function GET(req: Request) {
  const u = new URL(req.url);
  return NextResponse.json(await listCulture(u.searchParams.get("category") ?? undefined));
}
