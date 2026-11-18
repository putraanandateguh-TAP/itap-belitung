import { NextResponse } from "next/server";
import { EMERGENCY_NUMBERS } from "@/lib/daily";

// GET /api/daily/emergency — nomor darurat + rumah sakit Belitung. §3.8 / F14.
export async function GET() {
  return NextResponse.json(EMERGENCY_NUMBERS);
}
