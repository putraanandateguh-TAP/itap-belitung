import { NextResponse } from "next/server";

// GET/POST /api/ai/itineraries — rencana perjalanan AI tersimpan (F12). Fase 3 (M7).
export async function GET() {
  return NextResponse.json({ error: "Fitur rencana perjalanan tersimpan belum tersedia." }, { status: 501 });
}
export async function POST() {
  return NextResponse.json({ error: "Fitur rencana perjalanan tersimpan belum tersedia." }, { status: 501 });
}
