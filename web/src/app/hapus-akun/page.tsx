// S25 Hapus akun — konfirmasi + daftar data yang ikut terhapus (F16).
// Penghapusan PENUH via DELETE /api/me -> Edge Function service-role:
// profil + kontribusi + komentar + poin + listing + chat + perangkat +
// foto Storage + akun Auth (semua sesi dicabut).
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-client";
import { RequireRole } from "@/components/require-role";
import { Banner, Button, Field, TextInput } from "@/components/ui";

function DeleteAccountForm() {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { session } = useSession();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (confirm.trim().toUpperCase() !== "HAPUS") {
      setError("Ketik HAPUS (huruf besar) untuk mengonfirmasi.");
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
      if (!res.ok) throw new Error(data.error ?? "Penghapusan akun gagal.");
      router.push("/?deleted=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Penghapusan akun gagal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl py-10">
      <h1 className="text-xl font-bold text-ink">Hapus akun</h1>
      <div className="mt-4">
        <Banner tone="error">
          Tindakan ini tidak bisa dibatalkan. Akun <strong>{session?.email}</strong> dan semua data terkait akan dihapus.
        </Banner>
      </div>
      <section aria-labelledby="hapus-apa" className="mt-6 rounded-lg border border-line bg-canvas p-4">
        <h2 id="hapus-apa" className="text-lg font-semibold text-ink">Yang ikut terhapus</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-muted">
          <li>Profil, peran, dan titik lokasi</li>
          <li>Kontribusi, draf, dan kiriman (termasuk yang sudah terbit atas namamu)</li>
          <li>Tanggapan (komentar) dan poin kontribusi</li>
          <li>Riwayat revisi artikel</li>
          <li>Penawaran marketplace, percakapan, bookmark (Fase 2)</li>
          <li>Sesi login dan registrasi push di perangkat</li>
          <li>Foto yang kamu unggah di Storage</li>
        </ul>
      </section>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <Field label="Ketik HAPUS untuk mengonfirmasi" id="konfirmasi-hapus" hint="Tulis HAPUS dengan huruf besar.">
          <TextInput id="konfirmasi-hapus" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="HAPUS" autoComplete="off" error={!!error} />
        </Field>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" variant="danger" size="lg" loading={busy}>Hapus akun saya</Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => router.push("/pengaturan")}>Batalkan</Button>
        </div>
      </form>
    </div>
  );
}

export default function HapusAkunPage() {
  return (
    <RequireRole roles={["reader", "contributor", "admin_portal", "superadmin"]} title="Hapus akun">
      <DeleteAccountForm />
    </RequireRole>
  );
}
