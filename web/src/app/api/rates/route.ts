import { NextResponse } from "next/server";
import { getMarketRates } from "@/lib/data";

// GET /api/rates — kurs/IHSG/emas. §3.8.
export async function GET() {
  return NextResponse.json(await getMarketRates());
}
