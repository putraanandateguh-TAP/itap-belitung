import { NextResponse } from "next/server";
import { submitContribution } from "@/lib/data";
import { errorToResponse, requireSession } from "@/lib/api";

// POST /api/contributions/:id/submit — kirim ke redaksi. §3.4.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  if ("error" in s) return s.error;
  try {
    const c = await submitContribution(id, { profile: s.profile });
    if (!c) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    return NextResponse.json(c);
  } catch (e) {
    return errorToResponse(e);
  }
}
