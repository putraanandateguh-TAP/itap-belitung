import { NextResponse } from "next/server";

// GET /api/ai/itineraries/:id — detail rencana perjalanan (F12). Fase 3 (M7).
export async function GET() {
  return NextResponse.json({ error: "AI iTAP belum tersedia — Fase 3 (M7)." }, { status: 501 });
}
