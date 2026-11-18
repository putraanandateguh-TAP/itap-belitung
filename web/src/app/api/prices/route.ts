import { NextResponse } from "next/server";
import { getDailyPrices } from "@/lib/data";

// GET /api/prices — harga pangan harian iTAP. §3.8.
export async function GET() {
  return NextResponse.json(await getDailyPrices());
}
