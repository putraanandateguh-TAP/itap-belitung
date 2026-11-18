import { NextResponse } from "next/server";
import { getArticle } from "@/lib/data";

// GET /api/articles/:slug — detail artikel. Arsitektur §3.2.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });
  return NextResponse.json(article);
}
