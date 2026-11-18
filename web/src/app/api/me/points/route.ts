import { NextResponse } from "next/server";
import { listPoints } from "@/lib/data";

// GET /api/me/points — riwayat poin. §3.4.
export async function GET() {
  return NextResponse.json(await listPoints());
}
