// Riwayat revisi artikel (pemilik + redaksi) + diff antar versi.
// Dipakai dashboard kontributor (kiriman sendiri) dan tab Konten redaksi.
// Data dari GET /api/contributions/:id/revisions — berisi snapshot isi
// per revisi; diff hanya dihitung bila DUA snapshot tersedia. Revisi lama
// yang tercatat sebelum snapshot disimpan menampilkan catatan saja (jujur,
// bukan diff karangan).
"use client";

import { useEffect, useState } from "react";
import { diffLines } from "@/lib/diff";
import { formatDateWIB } from "@/lib/format";
import type { ContributionRevision } from "@/lib/types";
import { Button } from "./ui";

function DiffView({ older, newer }: { older: { title_id: string; body_id: string }; newer: { title_id: string; body_id: string } }) {
  const lines = diffLines(older.body_id, newer.body_id);
  const titleChanged = older.title_id !== newer.title_id;
  return (
    <div className="mt-3 rounded-lg border border-line bg-surface p-3">
      {titleChanged && (
        <p className="text-sm text-ink">
          <span className="font-semibold">Judul berubah:</span>{" "}
          <span className="text-danger line-through">{older.title_id}</span> →{" "}
          <span className="font-semibold text-success">{newer.title_id}</span>
        </p>
      )}
      <ul aria-label="Perbandingan isi antar versi" className="mt-2 flex flex-col gap-0.5 text-sm">
        {lines.map((l, i) => (
          <li
            key={i}
            className={
              l.type === "add"
                ? "rounded bg-success-soft px-2 py-0.5 text-success"
                : l.type === "del"
                  ? "rounded bg-danger-soft px-2 py-0.5 text-danger line-through"
                  : "px-2 py-0.5 text-muted"
            }
          >
            <span aria-hidden="true" className="mr-2 font-mono">{l.type === "add" ? "+" : l.type === "del" ? "−" : " "}</span>
            {l.text || " "}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">Hijau (+) = ditambahkan, merah (−) = dihapus, abu-abu = tidak berubah.</p>
    </div>
  );
}

export function RevisionHistory({ contributionId, title }: { contributionId: string; title?: string }) {
  const [revisions, setRevisions] = useState<ContributionRevision[] | null>(null);
  const [error, setError] = useState("");
  const [openDiff, setOpenDiff] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/contributions/${contributionId}/revisions`)
      .then(async (r) => {
        if (!alive) return;
        if (r.status === 401) { setError("Masuk dulu untuk melihat riwayat revisi."); return; }
        if (!r.ok) { setError("Riwayat revisi gagal dimuat."); return; }
        setRevisions((await r.json()) as ContributionRevision[]);
      })
      .catch(() => { if (alive) setError("Riwayat revisi gagal dimuat."); });
    return () => { alive = false; };
  }, [contributionId]);

  if (error) {
    return <p role="alert" className="text-sm text-danger">{error}</p>;
  }
  if (revisions === null) {
    return (
      <div aria-busy="true" className="py-2">
        <div className="skeleton h-16 w-full" />
      </div>
    );
  }
  if (revisions.length === 0) {
    return <p className="text-sm text-muted">Belum ada riwayat revisi{title ? ` untuk “${title}”` : ""}.</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {revisions.map((rev, i) => {
        const older = revisions[i + 1];
        const canDiff = Boolean(rev.snapshot && older?.snapshot);
        return (
          <li key={`${rev.at}-${i}`} className="rounded-lg border border-line bg-canvas px-4 py-3">
            <p className="text-sm text-ink">
              <span className="font-semibold">{rev.changes}</span>
            </p>
            <p className="mt-1 text-xs text-muted">
              {rev.by} · {formatDateWIB(rev.at)}
              {!rev.snapshot && " · tanpa snapshot isi (revisi lama)"}
            </p>
            {older && (
              <div className="mt-2">
                {canDiff ? (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setOpenDiff(openDiff === i ? null : i)}
                      aria-expanded={openDiff === i}
                    >
                      {openDiff === i ? "Sembunyikan perubahan" : "Lihat perubahan dari versi sebelumnya"}
                    </Button>
                    {openDiff === i && rev.snapshot && older.snapshot && (
                      <DiffView older={older.snapshot} newer={rev.snapshot} />
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted">Tidak ada snapshot isi untuk membandingkan versi ini dengan sebelumnya.</p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
