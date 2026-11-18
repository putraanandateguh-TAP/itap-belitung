import { NextResponse } from "next/server";
import { getCultureStory } from "@/lib/daily";

// GET /api/culture/:slug — detail cerita budaya (lirik, sumber). §3.2 / F15.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = await getCultureStory(slug);
  if (!story) return NextResponse.json({ error: "Cerita tidak ditemukan" }, { status: 404 });
  return NextResponse.json(story);
}
