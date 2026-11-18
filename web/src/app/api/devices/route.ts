import { NextResponse } from "next/server";
import { errorToResponse, requireSession } from "@/lib/api";
import { deviceSchema, parseJsonBody } from "@/lib/validation";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";

// POST /api/devices — daftarkan token FCM perangkat. §3.1 (notifikasi, P4).
export async function POST(req: Request) {
  const s = await requireSession();
  if ("error" in s) return s.error;
  const parsed = await parseJsonBody(req, deviceSchema);
  if ("error" in parsed) return parsed.error;
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL belum diisi (P1)." }, { status: 503 });
  }
  try {
    const db = getDb();
    const inserted = await db.insert(t.devices).values({
      userId: s.profile.id, fcmToken: parsed.data.fcm_token, platform: parsed.data.platform,
    }).onConflictDoNothing().returning();
    return NextResponse.json(inserted[0] ?? { ok: true }, { status: 201 });
  } catch (e) {
    return errorToResponse(e);
  }
}
