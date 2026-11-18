import { NextResponse } from "next/server";
import { errorToResponse, requireSession } from "@/lib/api";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST /api/auth/marketplace-rules/accept — catat persetujuan aturan marketplace. §3.1 / F04.
export async function POST() {
  const s = await requireSession();
  if ("error" in s) return s.error;
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL belum diisi (P1)." }, { status: 503 });
  }
  try {
    const db = getDb();
    await db.update(t.profiles)
      .set({ marketplaceRulesAcceptedAt: new Date() })
      .where(eq(t.profiles.id, s.profile.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorToResponse(e);
  }
}
