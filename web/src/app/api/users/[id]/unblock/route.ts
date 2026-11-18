import { NextResponse } from "next/server";
import { unblockUser } from "@/lib/marketplace";
import { errorToResponse, requireSession } from "@/lib/api";

// POST /api/users/:id/unblock — buka blokir akun (F08).
// Boleh oleh pemblokir sendiri atau redaksi (admin).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  if ("error" in s) return s.error;
  try {
    await unblockUser(s.profile, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorToResponse(e);
  }
}
