// Status lisensi + aktivasi di halaman Produk Digital (client).
// Menampilkan entitlement dari SERVER (hook useLicense). Bila belum
// login, /api/license/entitlement mengembalikan entitled:false dan
// form mengarahkan pengguna untuk masuk dulu.
"use client";

import { useLicense } from "@/hooks/use-license";
import { LicenseActivateForm } from "@/components/license-activate-form";

export function LicenseSection() {
  const { entitled, products, plan, expires_at, loading, refresh } = useLicense();

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-line bg-canvas p-4 shadow-card">
        <h2 className="text-base font-semibold text-ink">Status lisensi saya</h2>
        {loading ? (
          <p className="mt-1 text-sm text-muted">Memeriksa lisensi…</p>
        ) : entitled ? (
          <p className="mt-1 text-sm text-muted">
            FULL aktif — produk: {products.join(", ") || "—"}
            {plan ? ` · paket ${plan}` : ""}
            {expires_at ? ` · sampai ${expires_at.slice(0, 10)}` : " · lifetime"}.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted">
            Belum ada lisensi FULL aktif di akun ini. Masuk dulu, lalu aktifkan kode lisensi di bawah.
            (Bila belum beli, pesan lewat WhatsApp admin pada kartu produk.)
          </p>
        )}
      </div>
      <LicenseActivateForm onActivated={refresh} />
    </div>
  );
}
