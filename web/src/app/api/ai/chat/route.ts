import { NextResponse } from "next/server";

// POST /api/ai/chat — AI iTAP (F12). FASE 3 (M7), butuh Gemini API key (P3)
// + konten terkurasi. Belum diimplementasikan — 501, bukan jawaban palsu.
export async function POST() {
  return NextResponse.json(
    { error: "AI iTAP belum tersedia — Fase 3 (M7), butuh kunci Gemini milik Teguh (P3)." },
    { status: 501 },
  );
}
