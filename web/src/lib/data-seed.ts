// FALLBACK SEED SEMENTARA — dipakai data.ts hanya bila DATABASE_URL belum
// diisi (P1 belum dibuat). Isi: data ASLI situs statis lama (bukan data
// Satam). Setelah P1 + seed jalan, matikan dengan
// ITAP_ALLOW_SEED_FALLBACK=false, lalu hapus file ini + store.ts.
// DATA LAYER PALSU (fake) — tanda tangan fungsi SAMA seperti API di
// architecture.md §3, supaya replica-backend nanti tinggal mengganti
// implementasi tanpa mengubah layar. TIDAK ada koneksi database di sini:
// semua baca dari seed-data.ts, semua tulis ke store.ts (in-memory, hilang
// saat server restart). Supabase (P1) BELUM ada.
import {
  ARTICLES, CATEGORIES, CHANNELS, DAILY_PRICES, JOBS, KEDAI, MARKET_RATES,
  PRODUCTS, SERVICES,
} from "./seed-data";
import { articleWithOverride, store } from "./store";
import type {
  Article, Category, Channel, Comment, Contribution, ContributionPoint,
  ContributorDashboard, DailyPrices, JobListing, Kedai, MarketRates,
  ModerationWord, Paginated, Report,
} from "./types";

const PER_PAGE = 9;

function paginate<T>(items: T[], page: number, perPage = PER_PAGE): Paginated<T> {
  const total = items.length;
  const total_pages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), total_pages);
  return {
    items: items.slice((safePage - 1) * perPage, safePage * perPage),
    page: safePage, per_page: perPage, total, total_pages,
  };
}

function published(): Article[] {
  return ARTICLES.map(articleWithOverride).filter((a) => a.status === "published");
}

// --- 3.2 Portal & pencarian (F01, F02) -------------------------------------

export async function listCategories(channel?: Channel): Promise<Category[]> {
  const base = CATEGORIES.filter((c) => !channel || c.channel === channel);
  const extra = store.categoriesExtra
    .filter((c) => !channel || c.channel === channel)
    .map((c) => ({ ...c, channel: c.channel as Channel }));
  return [...base, ...extra];
}

export async function listArticles(opts: {
  channel?: Channel; category?: string; page?: number; perPage?: number;
}): Promise<Paginated<Article>> {
  let items = published();
  if (opts.channel) items = items.filter((a) => a.channel === opts.channel);
  if (opts.category) items = items.filter((a) => a.category_id === opts.category);
  items = [...items].sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at));
  return paginate(items, opts.page ?? 1, opts.perPage ?? PER_PAGE);
}

export async function getArticle(slug: string): Promise<Article | null> {
  const found = ARTICLES.map(articleWithOverride).find((a) => a.slug === slug);
  return found ?? null;
}

export async function getRelated(slug: string, limit = 4): Promise<Article[]> {
  const article = await getArticle(slug);
  if (!article) return [];
  const same = published().filter((a) => a.slug !== slug && a.channel === article.channel);
  const cross = published().filter((a) => a.slug !== slug && a.channel !== article.channel);
  return [...same, ...cross].slice(0, limit);
}

export async function searchArticles(opts: {
  q: string; channel?: Channel; category?: string;
  sort?: "terbaru" | "terpopuler" | "banyak-dicari";
  from?: string; to?: string; page?: number;
}): Promise<Paginated<Article>> {
  const q = opts.q.trim().toLowerCase();
  let items = published();
  if (q) {
    items = items.filter((a) =>
      `${a.title_id} ${a.body_id.join(" ")} ${a.location_name} ${a.source}`
        .toLowerCase().includes(q),
    );
  }
  if (opts.channel) items = items.filter((a) => a.channel === opts.channel);
  if (opts.category) items = items.filter((a) => a.category_id === opts.category);
  if (opts.from) items = items.filter((a) => a.published_at >= opts.from!);
  if (opts.to) items = items.filter((a) => a.published_at <= opts.to!);
  if (opts.sort === "terpopuler" || opts.sort === "banyak-dicari") {
    items = [...items].sort((a, b) => b.views - a.views);
  } else {
    items = [...items].sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at));
  }
  return paginate(items, opts.page ?? 1);
}

export async function getPopular(limit = 5): Promise<Article[]> {
  return [...published()].sort((a, b) => b.views - a.views).slice(0, limit);
}

export async function getLatest(limit = 6): Promise<Article[]> {
  return [...published()]
    .sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at))
    .slice(0, limit);
}

export async function getFeatured(): Promise<Article | null> {
  const items = published().filter((a) => a.featured && !a.external);
  return items[0] ?? (await getLatest(1))[0] ?? null;
}

export function channelLabel(channel: Channel): string {
  return CHANNELS[channel];
}

export function categoryName(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.name_id ?? id;
}

// --- 3.3 Komentar (F10) ------------------------------------------------------

export async function listComments(slug: string): Promise<Comment[]> {
  return store.comments
    .filter((c) => c.article_slug === slug && c.status === "approved")
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

export async function listPendingComments(): Promise<Comment[]> {
  return store.comments.filter((c) => c.status === "pending");
}

export async function addComment(slug: string, authorName: string, text: string): Promise<Comment> {
  const article = await getArticle(slug);
  const comment: Comment = {
    id: `k-${Date.now()}`, article_id: article?.id ?? slug, article_slug: slug,
    author_name: authorName, text, status: "pending",
    created_at: new Date().toISOString(),
  };
  store.comments.push(comment);
  return comment;
}

export async function moderateComment(id: string, decision: "approved" | "rejected"): Promise<void> {
  const c = store.comments.find((x) => x.id === id);
  if (c) c.status = decision;
}

// --- 3.4 Kontributor (F09) ---------------------------------------------------

export async function getContributorDashboard(): Promise<ContributorDashboard> {
  const subs = store.contributions;
  return {
    total_views: subs.reduce((s, c) => s + c.views, 0),
    approved_count: subs.filter((c) => c.status === "published").length,
    pending_count: subs.filter((c) => c.status === "review").length,
    draft_count: subs.filter((c) => c.status === "draft").length,
    points_total: (await listPoints()).reduce((s, p) => s + p.points, 0),
    submissions: subs,
  };
}

export async function listPoints(): Promise<ContributionPoint[]> {
  return [
    { id: "p-1", source_type: "article", source_id: "c-1", source_title: "Mie Belitung di Warung Legendaris Tanjung Pandan", points: 1, awarded_at: "2026-11-13T10:00:00+07:00" },
    { id: "p-2", source_type: "article", source_id: "kb-17", source_title: "Gangan", points: 1, awarded_at: "2026-11-10T09:00:00+07:00" },
  ];
}

export async function listContributions(): Promise<Contribution[]> {
  return store.contributions;
}

export async function getContribution(id: string): Promise<Contribution | null> {
  return store.contributions.find((c) => c.id === id) ?? null;
}

export async function createContribution(data: Partial<Contribution>): Promise<Contribution> {
  const draft: Contribution = {
    id: `c-${Date.now()}`,
    title_id: data.title_id ?? "Tanpa judul",
    title_en: data.title_en ?? "",
    body_id: data.body_id ?? "",
    body_en: data.body_en ?? "",
    channel: data.channel ?? "wisata",
    category_id: data.category_id ?? "pantai-pulau",
    location_name: data.location_name ?? "",
    source: data.source ?? "",
    status: "draft",
    views: 0,
    note_from_editor: null,
    updated_at: new Date().toISOString(),
  };
  store.contributions.unshift(draft);
  return draft;
}

export async function updateContribution(id: string, data: Partial<Contribution>): Promise<Contribution | null> {
  const c = store.contributions.find((x) => x.id === id);
  if (!c) return null;
  if (c.status === "review") return c; // terkunci saat review (recon F09)
  Object.assign(c, data, { updated_at: new Date().toISOString() });
  return c;
}

export async function submitContribution(id: string): Promise<Contribution | null> {
  const c = store.contributions.find((x) => x.id === id);
  if (!c || c.status !== "draft") return c ?? null;
  c.status = "review";
  c.updated_at = new Date().toISOString();
  return c;
}

export async function listContributionRevisions(id: string): Promise<{ at: string; by: string; changes: string }[]> {
  const c = store.contributions.find((x) => x.id === id);
  if (!c) return [];
  return [
    { at: c.updated_at, by: "Penulis", changes: "Draf dibuat / terakhir diubah." },
    ...(c.status === "published"
      ? [{ at: "2026-11-13T10:00:00+07:00", by: "Redaksi iTAP", changes: "Disetujui dan diterbitkan. +1 poin kontribusi." }]
      : []),
  ];
}

// --- 3.5 CMS / redaksi / moderasi (F11, F08) ---------------------------------

export async function listAdminArticles(filter?: string): Promise<Article[]> {
  let items = ARTICLES.map(articleWithOverride);
  if (filter && filter !== "semua") items = items.filter((a) => a.status === filter);
  return [...items].sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at));
}

export async function reviewArticle(
  id: string, decision: "publish" | "unpublish" | "return", note: string,
): Promise<void> {
  const status = decision === "publish" ? "published" : decision === "unpublish" ? "unpublished" : "returned";
  store.articleOverrides.set(id, { status, note: note || null });
}

export async function createCategory(channel: Channel, name_id: string, name_en: string): Promise<Category> {
  const slug = name_id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const cat = { id: `cat-${Date.now()}`, channel, name_id, name_en, slug };
  store.categoriesExtra.push(cat);
  return cat;
}

export async function listAdminContributors(): Promise<{ id: string; name: string; email: string; verified: boolean; auto_approve: boolean; points: number }[]> {
  return [
    { id: "u-dian", name: "Dian (Kontributor Demo)", email: "dian@contoh.id", verified: true, auto_approve: false, points: 2 },
    { id: "u-budi", name: "Budi (Kontributor Demo)", email: "budi@contoh.id", verified: false, auto_approve: false, points: 0 },
  ];
}

export async function listReports(): Promise<Report[]> {
  return store.reports;
}

export async function reviewReport(id: string, action: "hidden" | "dismissed" | "reviewed"): Promise<void> {
  const r = store.reports.find((x) => x.id === id);
  if (r) r.status = action;
}

export async function listModerationWords(): Promise<ModerationWord[]> {
  return [
    { id: "w-1", word: "contoh-kata-dilarang", action: "hold" },
    { id: "w-2", word: "tautan-penipuan", action: "sensor" },
  ];
}

// --- 3.8 Konten iTAP -----------------------------------------------------------

export async function getDailyPrices(): Promise<DailyPrices> {
  return DAILY_PRICES;
}

export async function getMarketRates(): Promise<MarketRates> {
  return MARKET_RATES;
}

export async function listJobs(opts: { q?: string; region?: string } = {}): Promise<JobListing[]> {
  let items = JOBS;
  if (opts.q) {
    const q = opts.q.toLowerCase();
    items = items.filter((j) => `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(q));
  }
  if (opts.region && opts.region !== "semua") items = items.filter((j) => j.region === opts.region);
  return items;
}

export async function listProducts() {
  return PRODUCTS;
}

export async function listServices() {
  return SERVICES;
}

export async function getKedai(): Promise<Kedai> {
  return KEDAI;
}
