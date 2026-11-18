import { NextResponse } from "next/server";
import { submitContribution } from "@/lib/data";

// POST /api/contributions/:id/submit — kirim ke redaksi. §3.4.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await submitContribution(id);
  if (!c) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  return NextResponse.json(c);
}
