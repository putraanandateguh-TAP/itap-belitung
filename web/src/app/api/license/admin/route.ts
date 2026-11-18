// POST /api/license/admin — manajemen lisensi (admin portal / superadmin).
// Body diteruskan apa adanya ke Edge Function admin-licenses dengan JWT
// pengguna; peran dicek DUA kali: requireAdmin() di sini (profiles.role
// dari DB) dan di Edge Function. Respons `create` berisi kode plaintext
// SEKALI — admin wajib menyampaikannya ke pembeli lewat jalur aman dan
// tidak menyimpannya di repo/log.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api";
import { callLicenseFunction } from "@/lib/license/server";

export async function POST(req: Request) {
  const s = await requireAdmin();
  if ("error" in s) return s.error;
  const body: unknown = await req.json().catch(() => null);
  const r = await callLicenseFunction("admin-licenses", { method: "POST", body });
  if ("error" in r) {
    return NextResponse.json({ ok: false, error: r.error }, { status: r.status });
  }
  return NextResponse.json(r.body, { status: r.status });
}
