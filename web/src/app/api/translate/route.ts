import { NextResponse } from "next/server";

// POST /api/translate — penerjemah 9 bahasa (F13). Fase 3 (M7), butuh
// Gemini (P3) sebagai fallback kamus lokal. Belum diimplementasikan.
export async function POST() {
  return NextResponse.json({ error: "Penerjemah belum tersedia — Fase 3 (M7), butuh kunci Gemini (P3)." }, { status: 501 });
}
