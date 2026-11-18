import { NextResponse } from "next/server";

// POST /api/ai/feedback — 👍/👎 per jawaban AI (F12). Fase 3 (M7).
export async function POST() {
  return NextResponse.json({ error: "AI iTAP belum tersedia — Fase 3 (M7)." }, { status: 501 });
}
