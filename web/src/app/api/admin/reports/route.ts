import { NextResponse } from "next/server";
import { listReports } from "@/lib/data";

// GET /api/admin/reports — daftar laporan + flag. §3.5.
export async function GET() {
  return NextResponse.json(await listReports());
}
