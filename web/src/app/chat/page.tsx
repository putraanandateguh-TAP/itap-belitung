// S15 (inbox) — Daftar chat / percakapan jual beli (F06).
// Catatan penomoran recon: S15 di recon.md adalah "Daftar chat / inbox",
// S16 ruang chat, S17 tersimpan — task memakai S16 untuk inbox dan S17
// untuk ruang chat; halaman ini tetap memakai route /chat (inbox) dan
// /chat/[id] (ruang) sesuai tugas.
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session-client";
import { ButtonLink, EmptyState, StatusBadge } from "@/components/ui";
import { formatListingPrice, type ThreadSummary } from "@/lib/listings";
import { formatDateTimeWIB, formatRelativeWIB } from "@/lib/format";

export default function ChatInboxPage() {
  const { session, loading: sessionLoading } = useSession();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/me/threads", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Gagal memuat (HTTP ${res.status}).`);
      setThreads(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat percakapan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (session) load(); else if (!sessionLoading) setLoading(false); }, [session, sessionLoading, load]);

  if (sessionLoading || loading) {
    return <div aria-busy="true" className="py-8"><div className="skeleton h-64 w-full" /></div>;
  }
  if (!session) {
    return (
      <div className="py-8">
        <EmptyState title="Masuk dulu untuk membuka chat." desc="Percakapan jual beli hanya tersedia setelah masuk." action={<ButtonLink href="/masuk">Masuk / daftar</ButtonLink>} titleAs="h1" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-xl font-bold text-ink">Chat jual beli</h1>
        <p className="mt-1 text-sm text-muted">Percakapanmu dengan penjual dan pembeli. Nomor penjual tetap tersamar — kesepakatan diatur di dalam chat.</p>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      {threads.length === 0 ? (
        <EmptyState
          title="Belum ada percakapan."
          desc="Mulai chat dari tombol “Mulai chat dengan penjual” di halaman detail penawaran."
          action={<ButtonLink href="/jual-beli">Jelajahi Jual Beli</ButtonLink>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {threads.map((t) => (
            <li key={t.id} className="rounded-lg border border-line bg-canvas">
              <Link href={`/chat/${t.id}`} className="block p-4 focus-visible:outline-2 focus-visible:outline-accent">
                <span className="flex flex-wrap items-start justify-between gap-2">
                  <span className="font-semibold text-ink">{t.listing_title}</span>
                  <StatusBadge status={t.listing_status} />
                </span>
                <span className="mt-1 block text-sm text-muted">
                  {formatListingPrice(t.listing_price_cents)} · {t.is_seller ? "Kamu penjual" : "Kamu pembeli"}
                </span>
                <span className="mt-2 block truncate text-sm text-ink">
                  {t.last_message_text ?? "Belum ada pesan — sapa dulu lawan bicaramu."}
                </span>
                <span className="mt-1 block text-xs text-muted">
                  {t.last_message_at ? formatRelativeWIB(t.last_message_at) : formatDateTimeWIB(t.created_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
