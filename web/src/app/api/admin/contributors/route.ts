import { NextResponse } from "next/server";
import { listAdminContributors } from "@/lib/data";
import { requireAdmin } from "@/lib/api";

// GET /api/admin/contributors — kelola kontributor + auto-approve. §3.5.
export async function GET() {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return NextResponse.json(await listAdminContributors());
}
