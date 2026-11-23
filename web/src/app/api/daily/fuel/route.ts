import { NextResponse } from "next/server";
import bbm from "@/data/bbm.json";

// GET /api/daily/fuel — harga BBM Pertamina Babel dari data kurasi
// src/data/bbm.json (lihat halaman /info-harian/bbm).
export async function GET() {
  return NextResponse.json({ scope_key: "belitung", ...bbm });
}
