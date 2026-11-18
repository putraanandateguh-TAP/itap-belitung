// S25 Hapus akun — konfirmasi + daftar data yang ikut terhapus (F16).
// Penghapusan PENUH via DELETE /api/me -> Edge Function service-role:
// profil + kontribusi + komentar + poin + listing + chat + perangkat +
// foto Storage + akun Auth (semua sesi dicabut).
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-client";
import { RequireRole } from "@/components/require-role";
import { Banner, Button, Field, TextInput } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";

function DeleteAccountForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Gate kejujuran (S25): penghapusan penuh butuh Supabase + Edge Function
  // delete-account yang ter-deploy (P1). Bila backend belum dikonfigurasi,
  // tampilkan gate dan nonaktifkan tombol — jangan biarkan pengguna mengetik
  // HAPUS lalu gagal tanpa penjelasan.
  const [configured, setConfigured] = useState<boolean | null>(null);
  const { session } = useSession();

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && typeof d.configured === "boolean") setConfigured(d.configured); })
      .catch(() => undefined);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (confirm.trim().toUpperCase() !== "HAPUS") {
      setError(t("hapus.typeDelete"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/me", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: "HAPUS" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t("hapus.failed"));
      router.push("/?deleted=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("hapus.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl py-10">
      <h1 className="text-xl font-bold text-ink">{t("hapus.title")}</h1>
      {configured === false && (
        <div className="mt-4">
          <Banner tone="warning">
            {t("hapus.notConfigured")}
          </Banner>
        </div>
      )}
      <div className="mt-4">
        <Banner tone="error">
          {t("hapus.warning", { account: session?.email ?? "" })}
        </Banner>
      </div>
      <section aria-labelledby="hapus-apa" className="mt-6 rounded-lg border border-line bg-canvas p-4">
        <h2 id="hapus-apa" className="text-lg font-semibold text-ink">{t("hapus.whatDeleted")}</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-muted">
          <li>{t("hapus.itemProfile")}</li>
          <li>{t("hapus.itemContrib")}</li>
          <li>{t("hapus.itemComments")}</li>
          <li>{t("hapus.itemHistory")}</li>
          <li>{t("hapus.itemMarket")}</li>
          <li>{t("hapus.itemSessions")}</li>
          <li>{t("hapus.itemPhotos")}</li>
        </ul>
      </section>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <Field label={t("hapus.confirmLabel")} id="konfirmasi-hapus" hint={t("hapus.confirmHint")}>
          <TextInput id="konfirmasi-hapus" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="HAPUS" autoComplete="off" error={!!error} />
        </Field>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" variant="danger" size="lg" loading={busy} disabled={configured === false}>{t("hapus.deleteAccount")}</Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => router.push("/pengaturan")}>{t("common.cancel")}</Button>
        </div>
      </form>
    </div>
  );
}

export default function HapusAkunPage() {
  const { t } = useLanguage();
  return (
    <RequireRole roles={["reader", "contributor", "admin_portal", "superadmin"]} title={t("hapus.title")}>
      <DeleteAccountForm />
    </RequireRole>
  );
}
