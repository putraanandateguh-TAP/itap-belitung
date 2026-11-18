import { NextResponse } from "next/server";
import { createReport } from "@/lib/marketplace";
import { errorToResponse, requireSession } from "@/lib/api";
import { parseJsonBody } from "@/lib/validation";
import { z } from "zod";

// POST /api/listings/:id/report — laporkan penawaran. §3.6 / F08.
const schema = z.object({ reason: z.string().trim().min(3).max(1000) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  if ("error" in s) return s.error;
  const parsed = await parseJsonBody(req, schema);
  if ("error" in parsed) return parsed.error;
  try {
    const report = await createReport(s.profile, { target_type: "listing", target_id: id, reason: parsed.data.reason });
    return NextResponse.json(report, { status: 201 });
  } catch (e) {
    return errorToResponse(e);
  }
}
