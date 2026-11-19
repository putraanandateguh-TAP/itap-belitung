// Server helper: panggil Edge Function lisensi dengan JWT pengguna.
// Service-role key TIDAK PERNAH dipakai di Next.js — otorisasi penuh
// terjadi di Edge Function (JWT + peran dari profiles.role).
// Fail-closed: Supabase belum dikonfigurasi / Edge Function error
// -> { ok:false } atau 503, BUKAN entitlement.
import { createSupabaseServer } from "@/lib/supabase/server";

export interface LicenseFunctionResult {
  status: number;
  body: Record<string, unknown>;
}

export async function callLicenseFunction(
  fn: "validate-license" | "admin-licenses",
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<LicenseFunctionResult | { error: string; status: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return { error: "Supabase belum dikonfigurasi.", status: 503 };
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { error: "Sesi tidak valid. Masuk dulu.", status: 401 };
  }
  const path = fn === "validate-license" && init.method === "GET"
    ? `${url}/functions/v1/validate-license?action=entitlement`
    : `${url}/functions/v1/${fn}`;
  let res: Response;
  try {
    // Batas waktu 8 detik: tanpa timeout, Edge Function yang cold-start /
    // menggantung membuat /api/license/entitlement (dan "Memeriksa lisensi…"
    // di /produk) menggantung tanpa batas (bug 19 Nov 2026).
    res = await fetch(path, {
      method: init.method,
      signal: AbortSignal.timeout(8_000),
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        "Content-Type": "application/json",
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    return { error: "Layanan lisensi tidak dapat dihubungi.", status: 502 };
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, body };
}

/** Pesan error aman untuk user dari jawaban Edge Function. */
export function licenseReasonMessage(reason: unknown): string {
  switch (reason) {
    case "invalid": return "Kode tidak valid.";
    case "revoked": return "Kode ini sudah dicabut.";
    case "expired": return "Kode ini sudah habis masa berlakunya.";
    case "device_limit": return "Kode ini sudah dipakai di jumlah perangkat maksimum.";
    case "rate_limited": return "Terlalu banyak percobaan. Coba lagi nanti.";
    default: return "Validasi lisensi gagal. Coba lagi nanti.";
  }
}
