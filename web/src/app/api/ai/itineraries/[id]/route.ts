import { NextResponse } from "next/server";

// GET /api/ai/itineraries/:id — detail rencana perjalanan (F12). Fase 3 (M7).
export async function GET() {
  return NextResponse.json({ error: "Fitur rencana perjalanan tersimpan belum tersedia." }, { status: 501 });
}
