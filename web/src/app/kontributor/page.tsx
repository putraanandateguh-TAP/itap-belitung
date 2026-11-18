// S19 Dashboard kontributor — status kiriman, statistik baca, riwayat poin.
// Data dari /api/me/contributor + /api/me/points (fake, §3.4).
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, FileText, PenLine, Star } from "lucide-react";
import { RequireRole } from "@/components/require-role";
import { Badge, ButtonLink, EmptyState, StatusBadge } from "@/components/ui";
import type { Contribution, ContributionPoint, ContributorDashboard } from "@/lib/types";

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <article className="rounded-lg border border-line bg-canvas p-4 shadow-card">
      <p className="flex items-center gap-2 text-xs font-medium text-muted">{icon}{label}</p>
      <p className="mt-1 text-xl font-bold text-ink" aria-label={`${label}: ${value}`}>{value}</p>
    </article>
  );
}

function DashboardContent() {
  const [data, setData] = useState<ContributorDashboard | null>(null);
  const [points, setPoints] = useState<ContributionPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/me/contributor").then((r) => r.json()),
      fetch("/api/me/points").then((r) => r.json()),
    ])
      .then(([d, p]) => { setData(d); setPoints(p); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div aria-busy="true" className="py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24 w-full" />)}
        </div>
        <div className="skeleton mt-6 h-64 w-full" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="py-8">
        <EmptyState title="Dashboard gagal dimuat." desc="Coba muat ulang halaman." action={<ButtonLink href="/kontributor">Muat ulang</ButtonLink>} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Dashboard kontributor</h1>
          <p className="mt-1 text-sm text-muted">Status kiriman, aktivitas baca, dan poin kontribusimu.</p>
        </div>
        <ButtonLink href="/kontributor/tulis"><PenLine className="size-4" aria-hidden="true" /> Tulis cerita baru</ButtonLink>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Eye className="size-4 text-accent" aria-hidden="true" />} label="Total bacaan" value={data.total_views.toLocaleString("id-ID")} />
        <StatCard icon={<FileText className="size-4 text-accent" aria-hidden="true" />} label="Kiriman disetujui" value={data.approved_count} />
        <StatCard icon={<FileText className="size-4 text-accent" aria-hidden="true" />} label="Menunggu tinjauan" value={data.pending_count} />
        <StatCard icon={<Star className="size-4 text-accent" aria-hidden="true" />} label="Poin kontribusi" value={data.points_total} />
      </div>

      <section aria-labelledby="kiriman-title">
        <h2 id="kiriman-title" className="text-lg font-semibold text-ink">Kiriman saya</h2>
        {data.submissions.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="Belum ada kiriman." desc="Tulis cerita pertamamu tentang Belitung — redaksi akan meninjaunya." action={<ButtonLink href="/kontributor/tulis">Mulai menulis</ButtonLink>} />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-canvas">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-xs uppercase text-muted">
                  <th scope="col" className="px-4 py-3">Judul</th>
                  <th scope="col" className="px-4 py-3">Kanal</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Dibaca</th>
                  <th scope="col" className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.submissions.map((s: Contribution) => (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-semibold text-ink">{s.title_id}</td>
                    <td className="px-4 py-3 text-muted">{s.channel}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-muted">{s.views.toLocaleString("id-ID")}</td>
                    <td className="px-4 py-3">
                      <Link href={`/kontributor/tulis/${s.id}`} className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                        {s.status === "review" ? "Lihat" : "Ubah"}
                      </Link>
                      {s.note_from_editor && <p className="mt-1 text-xs text-warning">Catatan redaksi: {s.note_from_editor}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="poin-title">
        <h2 id="poin-title" className="text-lg font-semibold text-ink">Riwayat poin</h2>
        <p className="mt-1 text-sm text-muted">1 poin per artikel atau informasi yang disetujui. Penukaran poin belum tersedia.</p>
        {points.length === 0 ? (
          <p className="mt-3 rounded-lg border border-line bg-canvas p-4 text-sm text-muted">Belum ada poin — poin pertama didapat saat artikel pertamamu disetujui redaksi.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {points.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg border border-line bg-canvas px-4 py-3">
                <span className="text-sm text-ink">{p.source_title}</span>
                <Badge tone="active">+{p.points} poin</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function KontributorPage() {
  return (
    <RequireRole roles={["contributor", "admin_portal", "superadmin"]} title="Dashboard kontributor">
      <DashboardContent />
    </RequireRole>
  );
}
