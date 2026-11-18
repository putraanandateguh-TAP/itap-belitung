import { NextResponse } from "next/server";
import { blockUser } from "@/lib/marketplace";
import { errorToResponse, requireSession } from "@/lib/api";

// POST /api/users/:id/block — blokir akun. §3.6 / F08.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  if ("error" in s) return s.error;
  try {
    await blockUser(s.profile, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorToResponse(e);
  }
}
