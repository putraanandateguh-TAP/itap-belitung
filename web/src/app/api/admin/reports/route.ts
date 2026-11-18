import { NextResponse } from "next/server";
import { listReports } from "@/lib/data";
import { requireAdmin } from "@/lib/api";

// GET /api/admin/reports — daftar laporan + flag. §3.5.
export async function GET() {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return NextResponse.json(await listReports());
}
