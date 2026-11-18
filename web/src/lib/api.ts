// Helper bersama Route Handler: konteks auth + jawaban error standar.
// Semua route memakai ini agar otorisasi + format error konsisten.
import { NextResponse } from "next/server";
import { getCurrentProfile, type SessionProfile } from "./auth";
import { getAuthUser } from "./supabase/server";
import { rateLimit, rateLimitKey, rateLimitResponse } from "./rate-limit";

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** Profil login saat ini, atau null. */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  return getCurrentProfile();
}

/**
 * Wajib login. Kembalikan {profile} atau Response 401/503.
 * 503 = Supabase belum dikonfigurasi (P1) — bukan salah user.
 */
export async function requireSession(): Promise<
  { profile: SessionProfile } | { error: NextResponse }
> {
  const authUser = await getAuthUser();
  if (!authUser) return { error: jsonError("Masuk dulu untuk melanjutkan.", 401) };
  const profile = await getCurrentProfile();
  if (!profile) {
    return {
      error: jsonError(
        "Profil belum tersedia — backend Supabase (P1) belum dikonfigurasi atau profil belum dibuat.",
        503,
      ),
    };
  }
  return { profile };
}

/** Rate limit untuk satu aksi; kembalikan Response 429 bila kena batas. */
export function checkRateLimit(req: Request, action: string, limit = 5): Response | null {
  const r = rateLimit(rateLimitKey(req, action), limit);
  return r.ok ? null : rateLimitResponse(r.retryAfterSec);
}

/** Wajib peran admin portal / superadmin. */
export async function requireAdmin(): Promise<
  { profile: SessionProfile } | { error: NextResponse }
> {
  const s = await requireSession();
  if ("error" in s) return s;
  const { isAdmin } = await import("./auth");
  if (!isAdmin(s.profile)) return { error: jsonError("Hanya redaksi (admin portal / superadmin).", 403) };
  return s;
}

/** Petakan Error dari data layer (prefix UNAUTHORIZED/FORBIDDEN/NOT_FOUND/CONFLICT) ke status HTTP. */
export function errorToResponse(e: unknown): NextResponse {
  const msg = e instanceof Error ? e.message : "Terjadi kesalahan.";
  const match = /^(UNAUTHORIZED|FORBIDDEN|NOT_FOUND|CONFLICT):\s*/.exec(msg);
  if (!match) {
    console.error("API error:", msg);
    return jsonError("Terjadi kesalahan di server. Coba lagi nanti.", 500);
  }
  const status = match[1] === "UNAUTHORIZED" ? 401
    : match[1] === "FORBIDDEN" ? 403
    : match[1] === "NOT_FOUND" ? 404 : 409;
  return jsonError(msg.slice(match[0].length), status);
}
