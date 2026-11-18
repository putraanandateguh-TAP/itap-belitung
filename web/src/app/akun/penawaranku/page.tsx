// S14 — Penawaranku (F07): kelola listing sendiri + konfirmasi ketersediaan.
// Aksi: konfirmasi masih dijual, tandai terjual, pulihkan (≤14 hari setelah
// dihapus), hapus (soft delete). Terjual tidak bisa kembali aktif (trigger DB).
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session-client";
import { Banner, Button, ButtonLink, EmptyState, StatusBadge } from "@/components/ui";
import { formatListingPrice, type MarketplaceListing } from "@/lib/listings";
import { formatDateWIB } from "@/lib/format";

type Action = "confirm" | "mark-sold" | "restore" | "delete";

export default function PenawarankuPage() {
  const { session, loading: sessionLoading } = useSession();
  const [items, setItems] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/me/listings", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Gagal memuat (HTTP ${res.status}).`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat penawaranku.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (session) load(); else if (!sessionLoading) setLoading(false); }, [session, sessionLoading, load]);

  async function act(id: string, action: Action, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(`${action}:${id}`);
    setNotice(null);
    try {
      const url = action === "delete" ? `/api/listings/${id}` : `/api/listings/${id}/${action}`;
      const res = await fetch(url, { method: action === "delete" ? "DELETE" : "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Aksi gagal (HTTP ${res.status}).`);
      setNotice(
        action === "confirm" ? "Ketersediaan dikonfirmasi — penawaran tetap aktif."
        : action === "mark-sold" ? "Penawaran ditandai terjual."
        : action === "restore" ? "Penawaran dipulihkan dan aktif kembali."
        : "Penawaran dihapus. Masih bisa dipulihkan sampai 14 hari.",
      );
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Aksi gagal.");
    } finally {
      setBusy(null);
    }
  }

  if (sessionLoading || loading) {
    return <div aria-busy="true" className="py-8"><div className="skeleton h-64 w-full" /></div>;
  }
  if (!session) {
    return (
      <div className="py-8">
        <EmptyState title="Masuk dulu untuk melihat penawaranmu." desc="Penawaranku hanya tersedia setelah masuk." action={<ButtonLink href="/masuk">Masuk / daftar</ButtonLink>} titleAs="h1" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Penawaranku</h1>
          <p className="mt-1 text-sm text-muted">Kelola penawaran yang kamu pasang dan konfirmasi ketersediaannya secara berkala.</p>
        </div>
        <ButtonLink href="/jual-beli/pasang">Pasang penawaran baru</ButtonLink>
      </div>

      <Banner tone="info">
        Penawaran yang tidak dikonfirmasi ketersediaannya secara berkala bisa dinonaktifkan otomatis.
        Barang terjual hilang dari daftar publik setelah 24 jam dan tidak bisa diaktifkan lagi.
      </Banner>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="text-sm text-muted">{notice}</p>}

      {items.length === 0 ? (
        <EmptyState
          title="Belum ada penawaran."
          desc="Kamu belum memasang penawaran apa pun. Pasang penawaran pertamamu untuk warga Belitung."
          action={<ButtonLink href="/jual-beli/pasang">Pasang penawaran</ButtonLink>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((l) => (
            <li key={l.id} className="rounded-lg border border-line bg-canvas p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/jual-beli/${l.id}`} className="text-base font-semibold text-ink hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                    {l.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {formatListingPrice(l.price_cents)} · {l.location_name ?? "Tanpa lokasi"} · dipasang {formatDateWIB(l.created_at)}
                  </p>
                </div>
                <StatusBadge status={l.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {l.status === "aktif" && (
                  <>
                    <Button size="sm" loading={busy === `confirm:${l.id}`} onClick={() => act(l.id, "confirm")}>Konfirmasi masih dijual</Button>
                    <Button size="sm" variant="secondary" loading={busy === `mark-sold:${l.id}`} onClick={() => act(l.id, "mark-sold", "Tandai penawaran ini terjual? Penawaran terjual tidak bisa diaktifkan lagi.")}>Tandai terjual</Button>
                  </>
                )}
                {l.status === "dihapus" && (
                  <Button size="sm" loading={busy === `restore:${l.id}`} onClick={() => act(l.id, "restore")}>Pulihkan (maks 14 hari)</Button>
                )}
                {(l.status === "aktif" || l.status === "dinonaktifkan") && (
                  <Button size="sm" variant="danger" loading={busy === `delete:${l.id}`} onClick={() => act(l.id, "delete", "Hapus penawaran ini? Masih bisa dipulihkan sampai 14 hari.")}>Hapus</Button>
                )}
                <ButtonLink href={`/jual-beli/${l.id}`} variant="ghost" size="sm">Lihat</ButtonLink>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
