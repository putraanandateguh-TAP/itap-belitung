import { NextResponse } from "next/server";
import { listArticles } from "@/lib/data";
import type { Channel } from "@/lib/types";
import { paginationSchema } from "@/lib/validation";

// GET /api/articles — daftar artikel (channel, category, page). Arsitektur §3.2.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const page = paginationSchema.safeParse({
    page: u.searchParams.get("page") ?? "1",
    perPage: u.searchParams.get("perPage") ?? "9",
  });
  const channel = u.searchParams.get("channel") as Channel | null;
  const data = await listArticles({
    channel: channel ?? undefined,
    category: u.searchParams.get("category") ?? undefined,
    page: page.success ? page.data.page : 1,
    perPage: page.success ? page.data.perPage : 9,
  });
  return NextResponse.json(data);
}
