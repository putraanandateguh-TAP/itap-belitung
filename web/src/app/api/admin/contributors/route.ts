import { NextResponse } from "next/server";
import { listAdminContributors } from "@/lib/data";

// GET /api/admin/contributors — kelola kontributor + auto-approve. §3.5.
export async function GET() {
  return NextResponse.json(await listAdminContributors());
}
