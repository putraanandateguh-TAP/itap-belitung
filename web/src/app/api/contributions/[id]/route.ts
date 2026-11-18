import { NextResponse } from "next/server";
import { getContribution, updateContribution } from "@/lib/data";

// GET /api/contributions/:id — baca draft/kiriman sendiri. §3.4.
// PATCH — ubah draft (terkunci saat review, kecuali auto-approve). §3.4.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getContribution(id);
  if (!c) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  return NextResponse.json(c);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const c = await updateContribution(id, body);
  if (!c) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  if (c.status === "review") {
    return NextResponse.json({ error: "Kiriman terkunci saat ditinjau redaksi", contribution: c }, { status: 409 });
  }
  return NextResponse.json(c);
}
