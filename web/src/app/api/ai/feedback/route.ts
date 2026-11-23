import { NextResponse } from "next/server";

// POST /api/ai/feedback — 👍/👎 per jawaban AI (F12). Fase 3 (M7).
export async function POST() {
  return NextResponse.json({ error: "Penyimpanan umpan balik belum tersedia." }, { status: 501 });
}
