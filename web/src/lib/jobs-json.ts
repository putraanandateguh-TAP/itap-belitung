// Lowongan publik untuk /lowongan dan GET /api/jobs.
// Sumber: web/src/data/loker.json (skema tim Career: meta + lowongan[]).
//
// Refresh: salin /workspace/itap-konten-web/career/loker.json ke
// web/src/data/loker.json, lalu commit dan push ke main (Vercel auto-deploy).
// Tenggat yang sudah lewat disembunyikan saat request (bukan saat salin file).
import { createHash } from "node:crypto";
import raw from "@/data/loker.json";
import type { JobListing } from "./types";

export const JOB_REGIONS = [
  "Belitung",
  "Belitung Timur",
  "Pangkal Pinang",
  "Bangka",
  "Lainnya / Babel umum",
] as const;

export type JobRegion = (typeof JOB_REGIONS)[number];

type CareerJob = {
  judul: string;
  perusahaan: string;
  lokasi: string;
  kategori?: string | null;
  gaji?: string | null;
  tanggal_posting?: string | null;
  dicek?: string | null;
  sumber: string;
  link: string;
  ringkasan?: string | null;
  bagian?: string | null;
  batas_lamaran?: string | null;
};

type CareerLokerFile = {
  meta?: { diperbarui?: string; catatan?: string };
  lowongan?: CareerJob[];
};

const file = raw as CareerLokerFile;

const REGION_RULES: { name: JobRegion; pattern: RegExp }[] = [
  { name: "Belitung Timur", pattern: /belitung timur|beltim|manggar|gantung|kelapa kampit|dendang|damar|simpang renggiang|simpang pesak/i },
  { name: "Pangkal Pinang", pattern: /pangkal ?pinang|girimaya|gerunggang|bukit ?intan|rangkui|taman sari|gabek|pangkalbalam|bukitintan/i },
  { name: "Belitung", pattern: /belitung|belitong|tanjung ?pandan|sijuk|membalong|badau|selat nasik/i },
  { name: "Bangka", pattern: /bangka|sungailiat|belinyu|muntok|mentok|toboali|koba|jebus|pemali|kelapan|puding besar/i },
];

function mapRegion(job: CareerJob): JobRegion {
  const text = `${job.lokasi ?? ""} | ${job.judul ?? ""}`.toLowerCase()
    .replace(/(provinsi |prov\.? |kep(ulauan|\.)? )?bangka[ -]belitung|\bbabel\b/g, " ");
  for (const rule of REGION_RULES) {
    if (rule.pattern.test(text)) return rule.name;
  }
  if ((job.bagian ?? "").toLowerCase() === "belitung") return "Belitung";
  return "Lainnya / Babel umum";
}

function normUrl(url: string): string {
  return url.trim().split("?")[0].replace(/\/+$/, "").toLowerCase();
}

function present(value: string | null | undefined): string | null {
  const s = (value ?? "").trim();
  if (!s) return null;
  if (/^tidak tercantum/i.test(s)) return null;
  return s;
}

function todayWIB(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

function deadlineDate(value: string | null | undefined): string | null {
  const s = present(value);
  if (!s) return null;
  const m = s.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function isExpired(batas: string | null | undefined, today: string): boolean {
  const d = deadlineDate(batas);
  return d != null && d < today;
}

function toIsoWib(date: string | null | undefined): string {
  const d = deadlineDate(date) ?? todayWIB();
  return `${d}T00:00:00+07:00`;
}

function jobId(url: string): string {
  return `loker-${createHash("sha1").update(url).digest("hex").slice(0, 12)}`;
}

/** Tanggal meta.diperbarui (YYYY-MM-DD), fallback hari ini WIB. */
export function getJobsUpdatedAt(): string {
  return deadlineDate(file.meta?.diperbarui) ?? todayWIB();
}

export function loadCuratedJobs(now = todayWIB()): JobListing[] {
  const seen = new Set<string>();
  const items: JobListing[] = [];
  for (const job of file.lowongan ?? []) {
    const url = (job.link ?? "").trim();
    if (!url) continue;
    const key = normUrl(url);
    if (!key || seen.has(key)) continue;
    if (isExpired(job.batas_lamaran, now)) continue;
    seen.add(key);
    items.push({
      id: jobId(url),
      title: (job.judul ?? "").trim(),
      company: (job.perusahaan ?? "").trim(),
      location: (job.lokasi ?? "").trim(),
      salary: present(job.gaji),
      deadline: deadlineDate(job.batas_lamaran),
      source: (job.sumber ?? "").trim() || "Sumber publik",
      source_url: url,
      region: mapRegion(job),
      posted_at: toIsoWib(job.tanggal_posting),
    });
  }
  items.sort((a, b) => {
    const byDate = b.posted_at.localeCompare(a.posted_at);
    return byDate !== 0 ? byDate : a.title.localeCompare(b.title, "id");
  });
  return items;
}

export async function listJobsFromJson(
  opts: { q?: string; region?: string } = {},
): Promise<JobListing[]> {
  let items = loadCuratedJobs();
  if (opts.q) {
    const q = opts.q.toLowerCase();
    items = items.filter((j) =>
      `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(q),
    );
  }
  if (opts.region && opts.region !== "semua") {
    items = items.filter((j) => j.region === opts.region);
  }
  return items;
}
