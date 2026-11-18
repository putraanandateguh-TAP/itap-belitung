// GET /api/license/entitlement — entitlement FULL pengguna saat ini.
// Wajib login. Diteruskan ke Edge Function validate-license
// (?action=entitlement) dengan JWT pengguna — BUKAN service-role key.
// Fail-closed: error apa pun -> { entitled: false } (bukan 500 yang
// bisa disalahartikan client sebagai "coba lagi sebagai FULL").
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { callLicenseFunction } from "@/lib/license/server";

export async function GET() {
  const s = await requireSession();
  if ("error" in s) return s.error;
  const r = await callLicenseFunction("validate-license", { method: "GET" });
  if ("error" in r) {
    return NextResponse.json({ entitled: false, products: [], error: r.error }, { status: r.status });
  }
  if (r.status !== 200) {
    return NextResponse.json({ entitled: false, products: [] }, { status: r.status });
  }
  return NextResponse.json({
    entitled: r.body.entitled === true,
    products: Array.isArray(r.body.products) ? r.body.products : [],
    plan: r.body.plan ?? null,
    expires_at: r.body.expires_at ?? null,
  });
}
