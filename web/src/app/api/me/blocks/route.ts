import { NextResponse } from "next/server";
import { listMyBlocks } from "@/lib/marketplace";
import { requireSession } from "@/lib/api";

// GET /api/me/blocks — akun yang saya blokir (S18/S22).
// Mode seed (tanpa DB): daftar kosong yang jujur, bukan 500.
export async function GET() {
  const s = await requireSession();
  if ("error" in s) return s.error;
  return NextResponse.json(await listMyBlocks(s.profile));
}
