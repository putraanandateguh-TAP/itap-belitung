// S19 Dashboard kontributor — status kiriman, statistik baca, riwayat poin.
// Data dari /api/me/contributor + /api/me/points (fake, §3.4).
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, FileText, PenLine, Star } from "lucide-react";
import { RequireRole } from "@/components/require-role";
import { RevisionHistory } from "@/components/revision-history";
import { useLanguage } from "@/components/language-provider";
import { channelLabel } from "@/lib/labels";
import { Badge, Button, ButtonLink, EmptyState, StatusBadge } from "@/components/ui";
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
  const { t, lang } = useLanguage();
  const [data, setData] = useState<ContributorDashboard | null>(null);
  const [points, setPoints] = useState<ContributionPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);

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
        <EmptyState title={t("kontributor.loadFailed")} desc={t("kontributor.reloadHint")} action={<ButtonLink href="/kontributor">{t("kontributor.reload")}</ButtonLink>} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">{t("kontributor.dashboard")}</h1>
          <p className="mt-1 text-sm text-muted">{t("kontributor.dashboardDesc")}</p>
        </div>
        <ButtonLink href="/kontributor/tulis"><PenLine className="size-4" aria-hidden="true" /> {t("kontributor.writeNew")}</ButtonLink>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Eye className="size-4 text-accent" aria-hidden="true" />} label={t("kontributor.totalViews")} value={data.total_views.toLocaleString(lang === "en" ? "en-US" : "id-ID")} />
        <StatCard icon={<FileText className="size-4 text-accent" aria-hidden="true" />} label={t("kontributor.approved")} value={data.approved_count} />
        <StatCard icon={<FileText className="size-4 text-accent" aria-hidden="true" />} label={t("kontributor.pending")} value={data.pending_count} />
        <StatCard icon={<Star className="size-4 text-accent" aria-hidden="true" />} label={t("kontributor.points")} value={data.points_total} />
      </div>

      <section aria-labelledby="kiriman-title">
        <h2 id="kiriman-title" className="text-lg font-semibold text-ink">{t("kontributor.mySubmissions")}</h2>
        {data.submissions.length === 0 ? (
          <div className="mt-3">
            <EmptyState title={t("kontributor.noSubmissions")} desc={t("kontributor.noSubmissionsDesc")} action={<ButtonLink href="/kontributor/tulis">{t("kontributor.startWriting")}</ButtonLink>} />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-canvas" tabIndex={0} role="region" aria-label={t("kontributor.tableAria")}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-xs uppercase text-muted">
                  <th scope="col" className="px-4 py-3">{t("kontributor.colTitle")}</th>
                  <th scope="col" className="px-4 py-3">{t("kontributor.colChannel")}</th>
                  <th scope="col" className="px-4 py-3">{t("kontributor.colStatus")}</th>
                  <th scope="col" className="px-4 py-3">{t("kontributor.colViews")}</th>
                  <th scope="col" className="px-4 py-3">{t("kontributor.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {data.submissions.map((s: Contribution) => (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-semibold text-ink">{s.title_id}</td>
                    <td className="px-4 py-3 text-muted">{channelLabel(s.channel, lang)}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-muted">{s.views.toLocaleString(lang === "en" ? "en-US" : "id-ID")}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/kontributor/tulis/${s.id}`} className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                          {s.status === "review" ? t("kontributor.view") : t("kontributor.edit")}
                        </Link>
                        <Button size="sm" variant="ghost" onClick={() => setHistoryId(historyId === s.id ? null : s.id)} aria-expanded={historyId === s.id}>
                          {historyId === s.id ? t("kontributor.closeHistory") : t("kontributor.history")}
                        </Button>
                      </div>
                      {s.note_from_editor && <p className="mt-1 text-xs text-warning">{t("kontributor.editorNote", { note: s.note_from_editor })}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {historyId && (
        <section aria-labelledby="riwayat-title">
          <div className="flex items-center justify-between gap-2">
            <h2 id="riwayat-title" className="text-lg font-semibold text-ink">
              Riwayat revisi: {data.submissions.find((s) => s.id === historyId)?.title_id ?? ""}
            </h2>
            <Button size="sm" variant="ghost" onClick={() => setHistoryId(null)}>Tutup</Button>
          </div>
          <div className="mt-3">
            <RevisionHistory contributionId={historyId} title={data.submissions.find((s) => s.id === historyId)?.title_id} />
          </div>
        </section>
      )}

      <section aria-labelledby="poin-title">
        <h2 id="poin-title" className="text-lg font-semibold text-ink">{t("kontributor.pointsHistory")}</h2>
        <p className="mt-1 text-sm text-muted">{t("kontributor.pointsNote")}</p>
        {points.length === 0 ? (
          <p className="mt-3 rounded-lg border border-line bg-canvas p-4 text-sm text-muted">{t("kontributor.noPoints")}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {points.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg border border-line bg-canvas px-4 py-3">
                <span className="text-sm text-ink">{p.source_title}</span>
                <Badge tone="active">{t("kontributor.pointsSuffix", { points: p.points })}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function KontributorPage() {
  const { t } = useLanguage();
  return (
    <RequireRole roles={["contributor", "admin_portal", "superadmin"]} title={t("kontributor.dashboard")}>
      <DashboardContent />
    </RequireRole>
  );
}
