import { NextResponse } from "next/server";
import { listAllBlocks } from "@/lib/marketplace";
import { errorToResponse, requireAdmin } from "@/lib/api";

// GET /api/admin/blocks — semua blokir akun di portal (redaksi, S22).
// Mode seed (tanpa DB): daftar kosong yang jujur, bukan 500.
export async function GET() {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  try {
    return NextResponse.json(await listAllBlocks(a.profile));
  } catch (e) {
    return errorToResponse(e);
  }
}
