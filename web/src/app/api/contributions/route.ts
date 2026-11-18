import { NextResponse } from "next/server";
import { createContribution, listContributions } from "@/lib/data";

// GET /api/contributions — kiriman sendiri. POST — buat draft. §3.4.
export async function GET() {
  return NextResponse.json(await listContributions());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const draft = await createContribution(body);
  return NextResponse.json(draft, { status: 201 });
}
