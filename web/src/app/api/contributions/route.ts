import { NextResponse } from "next/server";
import { createContribution, listContributions } from "@/lib/data";
import { checkRateLimit, errorToResponse, requireSession } from "@/lib/api";
import { contributionSchema, parseJsonBody } from "@/lib/validation";

// GET /api/contributions — kiriman sendiri. POST — buat draft. §3.4.
export async function GET() {
  const s = await requireSession();
  if ("error" in s) return s.error;
  try {
    return NextResponse.json(await listContributions({ profile: s.profile }));
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function POST(req: Request) {
  const limited = checkRateLimit(req, "contribution-create", 10);
  if (limited) return limited;
  const s = await requireSession();
  if ("error" in s) return s.error;
  const parsed = await parseJsonBody(req, contributionSchema);
  if ("error" in parsed) return parsed.error;
  try {
    const draft = await createContribution(parsed.data, { profile: s.profile });
    return NextResponse.json(draft, { status: 201 });
  } catch (e) {
    return errorToResponse(e);
  }
}
