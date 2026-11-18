import { NextResponse } from "next/server";
import { checkRateLimit, errorToResponse, requireSession } from "@/lib/api";
import { infoSubmissionSchema, parseJsonBody } from "@/lib/validation";
import { createInfoSubmission } from "@/lib/data";

// POST /api/info-submissions — kirim info warga (calon referensi AI). §3.4.
// Mode seed: tersimpan di store in-memory (muncul di antrean kurasi /redaksi
// selama sesi berjalan, hilang saat restart).
export async function POST(req: Request) {
  const limited = checkRateLimit(req, "info-submit", 5);
  if (limited) return limited;
  const s = await requireSession();
  if ("error" in s) return s.error;
  const parsed = await parseJsonBody(req, infoSubmissionSchema);
  if ("error" in parsed) return parsed.error;
  try {
    const row = await createInfoSubmission(parsed.data.text, { profile: s.profile });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return errorToResponse(e);
  }
}
