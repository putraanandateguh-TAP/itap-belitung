// Detail rencana perjalanan tersimpan (S41, F12).
// Login-gated; GET /api/ai/itineraries/:id masih 501 sampai P3.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ButtonLink, EmptyState } from "@/components/ui";
import type { AiItinerary } from "@/lib/ai";

export function ItineraryDetail({ id }: { id: string }) {
  const [data, setData] = useState<AiItinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/ai/itineraries/${encodeURIComponent(id)}`)
      .then(async (r) => {
        if (r.status === 501) {
          setUnavailable(true);
          return;
        }
        if (r.status === 404) {
          setNotFound(true);
          return;
        }
        if (!r.ok) {
          setUnavailable(true);
          return;
        }
        setData((await r.json()) as AiItinerary);
      })
      .catch(() => setUnavailable(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div aria-busy="true" className="py-8">
        <div className="skeleton h-8 w-2/3" />
        <div className="skeleton mt-4 h-48 w-full" />
      </div>
    );
  }

  if (unavailable) {
    return (
      <div className="flex flex-col gap-4 py-8">
        <Link href="/ai" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
          <ArrowLeft className="size-4" aria-hidden="true" /> Kembali ke AI iTAP
        </Link>
        <EmptyState
          title="Rencana perjalanan belum bisa ditampilkan."
          desc="AI iTAP belum tersedia — butuh kunci Gemini (Fase 3, P3). Rencana tersimpan baru bisa dibuka setelah kunci itu ada."
          action={<ButtonLink href="/ai">Kembali ke AI iTAP</ButtonLink>}
        />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="flex flex-col gap-4 py-8">
        <Link href="/ai" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
          <ArrowLeft className="size-4" aria-hidden="true" /> Kembali ke AI iTAP
        </Link>
        <EmptyState
          title="Rencana tidak ditemukan."
          desc="Mungkin sudah dihapus, atau tautannya salah."
          action={<ButtonLink href="/ai">Lihat rencana tersimpan</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <Link href="/ai" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
          <ArrowLeft className="size-4" aria-hidden="true" /> Kembali ke AI iTAP
        </Link>
        <h1 className="mt-3 text-xl font-bold text-ink">{data.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {data.days.length} hari · dibuat{" "}
          {new Date(data.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
      <ol className="flex flex-col gap-4">
        {data.days.map((d) => (
          <li key={d.day} className="rounded-lg border border-line bg-canvas p-4 shadow-card">
            <h2 className="font-semibold text-ink">
              Hari {d.day} — {d.title}
            </h2>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-ink">
              {d.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
