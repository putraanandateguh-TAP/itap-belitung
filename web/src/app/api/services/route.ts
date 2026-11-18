import { NextResponse } from "next/server";
import { listServices } from "@/lib/data";

// GET /api/services — jasa iTAP. §3.8.
export async function GET() {
  return NextResponse.json(await listServices());
}
