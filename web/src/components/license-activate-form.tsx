// Form aktivasi kode lisensi (client). Kode dikirim ke server untuk
// divalidasi — TIDAK ADA pemeriksaan hash di client, TIDAK ADA flag
// localStorage yang ditulis di sini. Bila aktivasi berhasil, panggil
// onActivated() agar halaman me-refresh entitlement dari server.
"use client";

import { useState } from "react";
import { activateLicense } from "@/lib/license";

export function LicenseActivateForm({ onActivated }: { onActivated?: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const r = await activateLicense(code.trim());
    setBusy(false);
    if (r.ok) {
      setCode("");
      setMsg({
        ok: true,
        text: `Lisensi ${r.product ?? ""} ${r.plan ?? ""} aktif${r.expires_at ? ` sampai ${r.expires_at.slice(0, 10)}` : " (lifetime)"}.` +
          (r.legacy ? " Kode ini kode lama — hubungi admin untuk kode baru (re-issue)." : ""),
      });
      onActivated?.();
    } else {
      setMsg({ ok: false, text: r.message || "Kode tidak valid." });
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-lg border border-line bg-canvas p-4 shadow-card">
      <label htmlFor="license-code" className="text-sm font-semibold text-ink">
        Aktivasi lisensi FULL
      </label>
      <p className="text-sm text-muted">
        Sudah beli produk digital iTAP? Masukkan kode lisensi — kode divalidasi di server, bukan di perangkat ini.
      </p>
      <div className="flex gap-2">
        <input
          id="license-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ITAP-XXXX-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          className="h-10 min-w-0 flex-1 rounded-md border border-line bg-canvas px-3 text-sm text-ink"
        />
        <button
          type="submit"
          disabled={busy || code.trim().length < 8}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-dark disabled:opacity-50"
        >
          {busy ? "Memeriksa…" : "Aktifkan"}
        </button>
      </div>
      {msg && (
        <p role="status" className={`text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}
