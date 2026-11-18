import { NextResponse } from "next/server";
import { checkRateLimit, errorToResponse, requireSession } from "@/lib/api";
import { infoSubmissionSchema, parseJsonBody } from "@/lib/validation";
import { can } from "@/lib/auth";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";

// POST /api/info-submissions — kirim info warga (calon referensi AI). §3.4.
export async function POST(req: Request) {
  const limited = checkRateLimit(req, "info-submit", 5);
  if (limited) return limited;
  const s = await requireSession();
  if ("error" in s) return s.error;
  if (!can(s.profile, "info.submit")) {
    return NextResponse.json({ error: "Kirim info butuh email terverifikasi." }, { status: 403 });
  }
  const parsed = await parseJsonBody(req, infoSubmissionSchema);
  if ("error" in parsed) return parsed.error;
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL belum diisi (P1)." }, { status: 503 });
  }
  try {
    const db = getDb();
    const inserted = await db.insert(t.infoSubmissions).values({
      userId: s.profile.id, text: parsed.data.text, status: "pending",
    }).returning();
    return NextResponse.json(inserted[0], { status: 201 });
  } catch (e) {
    return errorToResponse(e);
  }
}
