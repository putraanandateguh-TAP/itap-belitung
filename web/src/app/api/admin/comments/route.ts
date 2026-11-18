import { NextResponse } from "next/server";
import { listPendingComments } from "@/lib/data";
import { requireAdmin } from "@/lib/api";

// GET /api/admin/comments — komentar tertunda untuk antrean moderasi (S22).
export async function GET() {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return NextResponse.json(await listPendingComments());
}
