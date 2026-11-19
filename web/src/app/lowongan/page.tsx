// Halaman konten iTAP: Lowongan Kerja — #27 Kartu Lowongan.
// Data ASLI dari data/loker.json situs lama (66 lowongan, Glints dkk.,
// diperbarui 2026-11-18). Gaji & tenggat tidak ada di sumber -> ditampilkan
// sebagai "tidak tercantum" dan tautan ke sumber asli.
import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, MapPin } from "lucide-react";
import { listJobs } from "@/lib/data";
import { formatDateWIB } from "@/lib/format";
import { Button, EmptyState } from "@/components/ui";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Lowongan Kerja Belitung",
  description: "Lowongan kerja di Belitung dan Bangka Belitung — dikumpulkan dari Glints dan media lain, dengan tautan ke sumber asli.",
};

const REGIONS = ["Belitung", "Pangkal Pinang", "Bangka", "Lainnya / Babel umum"];

export default async function LowonganPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; region?: string }>;
}) {
  const sp = await searchParams;
  const jobs = await listJobs({ q: sp.q, region: sp.region });
  const lang = await getServerLang();

  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">{t(lang, "jobs.title")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t(lang, "jobs.subtitle", { count: jobs.length })}
        </p>
      </header>

      <form method="get" role="search" aria-label={t(lang, "jobs.searchAria")} className="flex flex-col gap-3 rounded-lg border border-line bg-canvas p-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="loker-q" className="text-sm font-semibold text-ink">{t(lang, "jobs.keyword")}</label>
          <input id="loker-q" name="q" type="search" defaultValue={sp.q ?? ""} placeholder={t(lang, "jobs.keywordPlaceholder")} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="loker-region" className="text-sm font-semibold text-ink">{t(lang, "jobs.region")}</label>
          <select id="loker-region" name="region" defaultValue={sp.region ?? ""} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base">
            <option value="">{t(lang, "jobs.allRegions")}</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <Button type="submit">{t(lang, "common.search")}</Button>
      </form>

      {jobs.length === 0 ? (
        <EmptyState
          title={t(lang, "jobs.emptyTitle")}
          desc={t(lang, "jobs.emptyDesc")}
          action={<Link href="/lowongan" className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent">{t(lang, "jobs.viewAll")}</Link>}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {jobs.map((j) => (
            <li key={j.id} className="flex flex-col gap-2 rounded-lg border border-line bg-canvas p-4 shadow-card">
              {/* Judul memakai lebar penuh: sebelumnya Badge region di pojok
                  kanan atas menutupi judul, dan lokasi tampil 2x (Badge +
                  baris MapPin). Lokasi kini hanya di baris MapPin di bawah. */}
              <h2 className="text-base font-semibold text-ink">{j.title}</h2>
              <p className="text-sm font-semibold text-ink">{j.company}</p>
              <p className="flex items-center gap-1 text-sm text-muted">
                <MapPin className="size-4" aria-hidden="true" /> {j.location}
              </p>
              <p className="text-sm text-muted">
                {t(lang, "jobs.salary")}: {j.salary ?? t(lang, "jobs.notListed")} · {t(lang, "jobs.deadline")}: {j.deadline ?? t(lang, "jobs.notListed")}
              </p>
              <p className="text-xs text-muted">{t(lang, "jobs.sourceLabel")}: {j.source} · {formatDateWIB(j.posted_at, lang)}</p>
              <a
                href={j.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-accent"
              >
                {t(lang, "jobs.applyIn", { source: j.source })} <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
