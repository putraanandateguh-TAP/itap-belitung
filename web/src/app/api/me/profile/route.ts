import { NextResponse } from "next/server";
import { errorToResponse, requireSession } from "@/lib/api";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { profilePatchSchema, parseJsonBody } from "@/lib/validation";
import { getAuthUser } from "@/lib/supabase/server";
import { eq } from "drizzle-orm";

// GET /api/me/profile — profil sendiri. §3.1 / F16.
// Whoami: anonim -> 200 + null (bukan 401). Alasannya: useSession() memanggil
// endpoint ini di SETIAP halaman (site-chrome); 401 membuat Chrome mencatat
// console error "Failed to load resource: 401" di setiap kunjungan anonim
// (BUG-002). Klien sudah memperlakukan non-ok sebagai null, jadi 200+null
// tidak mengubah perilaku — hanya menghilangkan error console. PATCH tetap
// butuh sesi (401). Bila user login tapi profil belum ada -> 503 seperti dulu.
export async function GET() {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json(null);
  const s = await requireSession();
  if ("error" in s) return s.error;
  return NextResponse.json(s.profile);
}

export async function PATCH(req: Request) {
  const s = await requireSession();
  if ("error" in s) return s.error;
  const parsed = await parseJsonBody(req, profilePatchSchema);
  if ("error" in parsed) return parsed.error;
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL belum diisi (P1)." }, { status: 503 });
  }
  try {
    const db = getDb();
    const patch: Partial<typeof t.profiles.$inferInsert> = {};
    const d = parsed.data;
    if (d.displayName !== undefined) patch.displayName = d.displayName;
    if (d.languagePref !== undefined) patch.languagePref = d.languagePref;
    if (d.locationName !== undefined) patch.locationName = d.locationName;
    if (d.locationLat !== undefined) patch.locationLat = d.locationLat;
    if (d.locationLng !== undefined) patch.locationLng = d.locationLng;
    if (d.whatsappNumber !== undefined) patch.whatsappNumber = d.whatsappNumber;
    const updated = await db.update(t.profiles).set(patch)
      .where(eq(t.profiles.id, s.profile.id)).returning();
    return NextResponse.json(updated[0] ?? s.profile);
  } catch (e) {
    return errorToResponse(e);
  }
}
