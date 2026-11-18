import { NextResponse } from "next/server";
import { searchArticles } from "@/lib/data";
import type { Channel } from "@/lib/types";

// GET /api/search — q, channel, category, sort, from, to. Arsitektur §3.2.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const sort = u.searchParams.get("sort");
  const data = await searchArticles({
    q: u.searchParams.get("q") ?? "",
    channel: (u.searchParams.get("channel") as Channel | null) ?? undefined,
    category: u.searchParams.get("category") ?? undefined,
    sort: sort === "terpopuler" || sort === "banyak-dicari" ? sort : "terbaru",
    from: u.searchParams.get("from") ?? undefined,
    to: u.searchParams.get("to") ?? undefined,
    page: Number(u.searchParams.get("page") ?? "1") || 1,
  });
  return NextResponse.json(data);
}
