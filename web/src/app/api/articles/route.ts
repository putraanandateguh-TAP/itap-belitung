import { NextResponse } from "next/server";
import { listArticles } from "@/lib/data";
import type { Channel } from "@/lib/types";

// GET /api/articles — daftar artikel (channel, category, page). Arsitektur §3.2.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const channel = u.searchParams.get("channel") as Channel | null;
  const data = await listArticles({
    channel: channel ?? undefined,
    category: u.searchParams.get("category") ?? undefined,
    page: Number(u.searchParams.get("page") ?? "1") || 1,
  });
  return NextResponse.json(data);
}
