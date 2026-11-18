import { NextResponse } from "next/server";
import { listModerationWords } from "@/lib/data";

// GET /api/admin/moderation-words — kamus kata (superadmin). §3.5.
export async function GET() {
  return NextResponse.json(await listModerationWords());
}
