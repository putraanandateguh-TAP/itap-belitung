import { NextResponse } from "next/server";
import { getRelated } from "@/lib/data";

// GET /api/articles/:slug/related — rekomendasi terkait & lintas kanal. §3.2.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return NextResponse.json(await getRelated(slug));
}
