import { NextResponse } from "next/server";
import { searchArticles } from "@/lib/data";
import type { Channel } from "@/lib/types";
import { z } from "zod";

// GET /api/search — q, channel, category, sort, from, to. Arsitektur §3.2.
const querySchema = z.object({
  q: z.string().max(200).default(""),
  channel: z.enum(["berita", "kuliner", "wisata", "sejarah", "budaya", "legenda"]).optional(),
  category: z.string().max(100).optional(),
  sort: z.enum(["terbaru", "terpopuler", "banyak-dicari"]).default("terbaru"),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});

export async function GET(req: Request) {
  const u = new URL(req.url);
  const parsed = querySchema.safeParse({
    q: u.searchParams.get("q") ?? "",
    channel: u.searchParams.get("channel") ?? undefined,
    category: u.searchParams.get("category") ?? undefined,
    sort: u.searchParams.get("sort") ?? "terbaru",
    from: u.searchParams.get("from") ?? undefined,
    to: u.searchParams.get("to") ?? undefined,
    page: u.searchParams.get("page") ?? "1",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parameter pencarian tidak valid." }, { status: 400 });
  }
  const d = parsed.data;
  const data = await searchArticles({
    q: d.q,
    channel: d.channel as Channel | undefined,
    category: d.category,
    sort: d.sort,
    from: d.from,
    to: d.to,
    page: d.page,
  });
  return NextResponse.json(data);
}
