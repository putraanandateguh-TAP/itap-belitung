// S26 — Modal lapor / blokir (reusable).
// Dipakai dari detail listing (/jual-beli/[id]), ruang chat (/chat/[id]),
// dan detail artikel (target_type "comment"/"account" bila ada).
// Lapor -> POST /api/listings/:id/report (listing) atau /api/admin/reports
// tidak tersedia untuk publik; untuk target non-listing pemanggil memakai
// prop onReport sendiri. Blokir -> POST /api/users/:id/block.
// Semua teks ditulis baru untuk iTAP; tanpa copy Satam.
"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./ui";

export const REPORT_REASONS = [
  "Barang tidak sesuai deskripsi",
  "Harga menyesatkan",
  "Penipuan atau mencurigakan",
  "Barang terlarang",
  "Konten tidak pantas atau menyinggung",
  "Lainnya",
] as const;

export function ReportBlockModal({
  targetType,
  targetId,
  targetLabel,
  blockedUserId,
  blockedUserLabel,
  /** A4 (M8): alasan awal — dipakai tombol "Laporkan penipuan" 1 ketuk. */
  initialReason,
  onClose,
  onDone,
}: {
  /** Jenis target laporan: listing | account | comment. */
  targetType: "listing" | "account" | "comment";
  targetId: string;
  /** Nama yang tampil di judul modal, mis. judul penawaran. */
  targetLabel: string;
  /** Bila diisi, tampilkan juga bagian blokir akun ini. */
  blockedUserId?: string;
  blockedUserLabel?: string;
  initialReason?: (typeof REPORT_REASONS)[number];
  onClose: () => void;
  onDone?: (msg: string) => void;
}) {
  const [reason, setReason] = useState<string>(initialReason ?? REPORT_REASONS[0]);
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState<"report" | "block" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submitReport() {
    setBusy("report");
    setError(null);
    try {
      const url = targetType === "listing"
        ? `/api/listings/${targetId}/report`
        : "/api/admin/reports";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targetType === "listing"
          ? { reason: detail.trim() ? `${reason} — ${detail.trim()}` : reason }
          : { target_type: targetType, target_id: targetId, reason: detail.trim() ? `${reason} — ${detail.trim()}` : reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Laporan gagal (HTTP ${res.status}).`);
      }
      onDone?.("Laporan terkirim. Redaksi akan meninjaunya.");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Laporan gagal terkirim.");
    } finally {
      setBusy(null);
    }
  }

  async function submitBlock() {
    if (!blockedUserId) return;
    setBusy("block");
    setError(null);
    try {
      const res = await fetch(`/api/users/${blockedUserId}/block`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Blokir gagal (HTTP ${res.status}).`);
      }
      onDone?.("Akun diblokir. Kamu tidak akan lagi melihat penawarannya di chat ini.");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Blokir gagal.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="report-title" className="w-full max-w-md rounded-lg bg-canvas p-5 shadow-pop">
        <div className="flex items-start justify-between gap-3">
          <h2 id="report-title" className="text-lg font-bold text-ink">Laporkan atau blokir</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-md px-2 py-1 text-xl text-muted hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">
          Target: <span className="font-semibold text-ink">{targetLabel}</span>. Laporan ditinjau redaksi;
          identitas pelapor tidak ditampilkan ke pihak yang dilaporkan.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="report-reason" className="text-sm font-semibold text-ink">Alasan laporan</label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-10 w-full rounded-md border border-line-input bg-canvas px-3 text-base text-ink focus:border-accent focus:outline-2 focus:outline-accent"
            >
              {REPORT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="report-detail" className="text-sm font-semibold text-ink">Penjelasan (opsional)</label>
            <textarea
              id="report-detail"
              rows={3}
              maxLength={1000}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Ceritakan singkat apa yang kamu temukan."
              className="w-full rounded-md border border-line-input bg-canvas px-3 py-2 text-base text-ink placeholder:text-muted focus:border-accent focus:outline-2 focus:outline-accent"
            />
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button variant="danger" loading={busy === "report"} onClick={submitReport}>
            Kirim laporan
          </Button>
        </div>

        {blockedUserId && (
          <div className="mt-5 border-t border-line pt-4">
            <h3 className="text-sm font-semibold text-ink">Blokir akun</h3>
            <p className="mt-1 text-sm text-muted">
              Blokir {blockedUserLabel ?? "akun ini"} agar ia tidak bisa lagi menghubungimu lewat chat.
              Blokir bisa dibuka lagi oleh redaksi bila diperlukan.
            </p>
            <Button variant="secondary" loading={busy === "block"} onClick={submitBlock} className="mt-3">
              Blokir akun ini
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
