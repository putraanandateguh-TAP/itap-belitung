// Kirim Info Warga — formulir kiriman informasi untuk dikurasi redaksi
// (calon referensi AI iTAP). POST /api/info-submissions; butuh masuk +
// email terverifikasi (dicek server). Antrean kurasi ada di /redaksi
// (tab "Info warga").
"use client";

import { useState } from "react";
import { RequireRole } from "@/components/require-role";
import { useSession } from "@/lib/session-client";
import { Banner, Button, Field, TextArea } from "@/components/ui";

const MAX_LEN = 5000;
const MIN_LEN = 10;

function KirimInfoForm() {
  const { session } = useSession();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const emailVerified = session?.emailVerified === true;
  const tooShort = text.trim().length > 0 && text.trim().length < MIN_LEN;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < MIN_LEN) {
      setError(`Informasi minimal ${MIN_LEN} karakter.`);
      return;
    }
    setSaving(true);
    setError("");
    setSent(false);
    try {
      const res = await fetch("/api/info-submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Kiriman gagal dikirim. Coba lagi.");
        return;
      }
      setText("");
      setSent(true);
    } catch {
      setError("Kiriman gagal dikirim. Periksa koneksimu lalu coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-xl font-bold text-ink">Kirim Info Warga</h1>
        <p className="mt-1 text-sm text-muted">
          Punya info terbaru soal Belitung — jadwal kapal berubah, jalan ditutup, acara desa, harga di
          pasar? Kirim ke redaksi. Kiriman yang disetujui jadi referensi AI iTAP dan dibaca warga lain.
        </p>
      </div>

      {!emailVerified && (
        <Banner tone="warning">
          Emailmu belum terverifikasi — kiriman butuh email terverifikasi (dicek server saat mengirim).
          Verifikasi email dulu lewat tautan yang dikirim ke emailmu.
        </Banner>
      )}
      {sent && (
        <Banner tone="success">
          Kirimanmu masuk antrean kurasi redaksi. Bila disetujui, info ini jadi referensi AI iTAP.
        </Banner>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <form onSubmit={submit} className="flex flex-col gap-4 rounded-lg border border-line bg-canvas p-4">
        <Field
          label="Informasi yang ingin dibagikan"
          id="info-teks"
          hint="Tulis yang spesifik: apa, di mana, kapan. Contoh: “Jadwal kapal feri Tanjung Pandan – Pulau Leebong berubah: berangkat 08.00 dan 14.00 setiap hari.”"
          error={tooShort ? `Informasi minimal ${MIN_LEN} karakter.` : undefined}
        >
          <TextArea
            id="info-teks"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tulis informasinya di sini…"
            maxLength={MAX_LEN}
            aria-describedby="info-teks-hint"
            error={tooShort}
          />
        </Field>
        <p className="text-xs text-muted" aria-live="polite">
          {text.trim().length} / {MAX_LEN} karakter · minimal {MIN_LEN} karakter
        </p>
        <div>
          <Button type="submit" loading={saving} disabled={!emailVerified}>
            Kirim ke redaksi
          </Button>
        </div>
        <p className="text-xs text-muted">
          Kiriman dimoderasi: kata yang ditahan kamus redaksi tidak langsung tampil; redaksi
          meninjau semua kiriman sebelum disetujui atau ditolak.
        </p>
      </form>
    </div>
  );
}

export default function KirimInfoPage() {
  return (
    <RequireRole roles={["reader", "contributor", "admin_portal", "superadmin"]} title="Kirim Info Warga">
      <KirimInfoForm />
    </RequireRole>
  );
}
