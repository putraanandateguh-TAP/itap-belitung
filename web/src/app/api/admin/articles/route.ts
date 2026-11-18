import { NextResponse } from "next/server";
import { listAdminArticles } from "@/lib/data";

// GET /api/admin/articles — tabel konten (semua status). §3.5.
export async function GET(req: Request) {
  const u = new URL(req.url);
  return NextResponse.json(await listAdminArticles(u.searchParams.get("status") ?? undefined));
}
