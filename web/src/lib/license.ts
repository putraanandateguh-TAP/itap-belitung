// Client lisensi — SATU-SATUNYA sumber status FULL di frontend.
// Prinsip (perbaikan K1): TIDAK ADA localStorage/sessionStorage untuk
// status FULL. Entitlement diambil dari /api/license/entitlement
// (server-validated) dan disimpan HANYA di memori (React state).
// Error jaringan / 401 / 503 = tidak berhak (fail-closed, entitled:false).
// Kode lisensi tidak pernah disimpan di client setelah dikirim.

export interface Entitlement {
  entitled: boolean;
  products: string[];
  plan: string | null;
  expires_at: string | null;
}

export const NO_ENTITLEMENT: Entitlement = {
  entitled: false,
  products: [],
  plan: null,
  expires_at: null,
};

export async function fetchEntitlement(): Promise<Entitlement> {
  try {
    // Batas waktu 10 detik: tanpa timeout, Edge Function yang cold-start /
    // menggantung membuat "Memeriksa lisensi…" tampil selamanya (bug 19 Nov
    // 2026). Gagal / timeout = fail-closed (NO_ENTITLEMENT).
    const res = await fetch("/api/license/entitlement", {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return NO_ENTITLEMENT;
    const j = (await res.json()) as Partial<Entitlement>;
    return {
      entitled: j.entitled === true,
      products: Array.isArray(j.products) ? (j.products as string[]) : [],
      plan: typeof j.plan === "string" ? j.plan : null,
      expires_at: typeof j.expires_at === "string" ? j.expires_at : null,
    };
  } catch {
    return NO_ENTITLEMENT;
  }
}

export interface ActivateResult {
  ok: boolean;
  product?: string;
  plan?: string;
  expires_at?: string | null;
  legacy?: boolean;
  message?: string;
}

export async function activateLicense(code: string): Promise<ActivateResult> {
  try {
    const res = await fetch("/api/license/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, action: "activate" }),
    });
    const j = (await res.json().catch(() => ({}))) as ActivateResult & { reason?: string };
    if (!res.ok) return { ok: false, message: j.message || "Validasi lisensi gagal. Coba lagi nanti." };
    return j;
  } catch {
    return { ok: false, message: "Tidak dapat menghubungi server lisensi." };
  }
}
