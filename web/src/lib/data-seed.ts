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
  ARTICLES, CATEGORIES, CHANNELS, DAILY_PRICES, KEDAI, MARKET_RATES,
  PRODUCTS, SERVICES,
} from "./seed-data";
import { articleWithOverride, store } from "./store";
import type { Lang } from "./i18n";
import type {
  Article, Category, Channel, Comment, Contribution, ContributionPoint,
  ContributionRevision, ContributorDashboard, CultureCategory, CultureStory, DailyPrices, InfoSubmission, JobListing, Kedai, MarketRates,
  ModerationWord, Paginated, Report,
} from "./types";

/** Konteks pemanggil minimal untuk jalur seed (id + nama saja — seed tidak
 * memeriksa izin; otorisasi penuh hanya di jalur DB nyata). */
export type SeedCtx = { profile?: { id: string; displayName?: string | null; email?: string } | null };

/** Riwayat revisi yang tercatat selama sesi seed berjalan (in-memory,
 * hilang saat server restart — sama seperti semua tulis seed lainnya).
 * Kunci: id kontribusi/artikel. */
const revisionLog = new Map<string, ContributionRevision[]>();

/** Override verifikasi/auto-approve kontributor seed (diubah lewat
 * PATCH /api/admin/contributors — tersimpan selama sesi seed berjalan). */
const contributorOverrides = new Map<string, { verified?: boolean; auto_approve?: boolean }>();

/** Id unik berbasis waktu (monotonik dalam proses) — Date.now() mentah bisa
 * bertabrakan bila dua tulis terjadi dalam 1 ms yang sama. */
let lastMs = 0;
function uniqueId(prefix: string): string {
  const ms = Date.now();
  lastMs = ms <= lastMs ? lastMs + 1 : ms;
  return `${prefix}-${lastMs}`;
}

function snapshotOf(c: Contribution): { title_id: string; body_id: string } {
  return { title_id: c.title_id, body_id: c.body_id };
}

function logRevision(id: string, entry: ContributionRevision): void {
  const list = revisionLog.get(id) ?? [];
  list.push(entry);
  revisionLog.set(id, list);
}

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

export function categoryName(id: string, lang: Lang = "id"): string {
  const c = CATEGORIES.find((c) => c.id === id);
  if (!c) return id;
  return lang === "en" && c.name_en ? c.name_en : c.name_id;
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

/** A9 (M8) — mode seed: komentar seed TIDAK punya pemilik (ditulis tanpa
    user id), jadi "komentar saya" tidak bisa ditentukan dengan jujur —
    kembalikan daftar kosong. Komentar yang baru dikirim tetap terlihat
    penulisnya di sesi itu dari respons POST (status pending). */
export async function listMyComments(): Promise<Comment[]> {
  return [];
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

export async function createContribution(data: Partial<Contribution>, ctx?: SeedCtx): Promise<Contribution> {
  const draft: Contribution = {
    id: uniqueId("c"),
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
  logRevision(draft.id, {
    at: draft.updated_at, by: ctx?.profile?.displayName ?? "Penulis",
    changes: "Draf dibuat.", snapshot: snapshotOf(draft),
  });
  return draft;
}

export async function updateContribution(id: string, data: Partial<Contribution>): Promise<Contribution | null> {
  const c = store.contributions.find((x) => x.id === id);
  if (!c) return null;
  if (c.status === "review") return c; // terkunci saat review (recon F09)
  Object.assign(c, data, { updated_at: new Date().toISOString() });
  logRevision(id, {
    at: c.updated_at, by: "Penulis",
    changes: "Draf diubah oleh penulis.", snapshot: snapshotOf(c),
  });
  return c;
}

export async function submitContribution(id: string, ctx?: SeedCtx): Promise<Contribution | null> {
  const c = store.contributions.find((x) => x.id === id);
  if (!c || c.status !== "draft") return c ?? null;
  const now = new Date().toISOString();
  // Persetujuan otomatis: kontributor terverifikasi + auto_approve aktif
  // langsung terbit saat submit (bukan masuk antrean review).
  const me = ctx?.profile?.id ? (await listAdminContributors()).find((x) => x.id === ctx.profile!.id) : undefined;
  if (me?.verified && me.auto_approve) {
    c.status = "published";
    c.updated_at = now;
    logRevision(id, {
      at: now, by: "Redaksi iTAP",
      changes: "Disetujui otomatis (kontributor terverifikasi + auto-approve aktif) dan diterbitkan.",
      snapshot: snapshotOf(c),
    });
    return c;
  }
  c.status = "review";
  c.updated_at = now;
  logRevision(id, {
    at: now, by: ctx?.profile?.displayName ?? "Penulis",
    changes: "Dikirim ke redaksi.", snapshot: snapshotOf(c),
  });
  return c;
}

export async function listContributionRevisions(id: string): Promise<ContributionRevision[]> {
  const c = store.contributions.find((x) => x.id === id);
  const logged = revisionLog.get(id) ?? [];
  if (!c) return [...logged].sort((a, b) => +new Date(b.at) - +new Date(a.at));
  // Baris dasar (sintesis dari status seed — tanpa snapshot isi untuk
  // versi lama, karena seed lama tidak menyimpannya). Bila sesi ini sudah
  // mencatat "Draf dibuat." di log, baris dasar draf tidak diduplikasi.
  const hasCreateLog = logged.some((r) => r.changes === "Draf dibuat.");
  const baseline: ContributionRevision[] = [
    ...(hasCreateLog ? [] : [{ at: c.updated_at, by: "Penulis", changes: "Draf dibuat / terakhir diubah.", snapshot: null } as ContributionRevision]),
    ...(c.status === "published"
      ? [{ at: "2026-11-13T10:00:00+07:00", by: "Redaksi iTAP", changes: "Disetujui dan diterbitkan. +1 poin kontribusi.", snapshot: snapshotOf(c) }]
      : []),
  ];
  return [...logged, ...baseline].sort((a, b) => +new Date(b.at) - +new Date(a.at));
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
  const c = store.contributions.find((x) => x.id === id);
  const art = !c ? ARTICLES.find((a) => a.id === id) : undefined;
  const snapshot = c ? snapshotOf(c)
    : art ? { title_id: art.title_id, body_id: art.body_id.join("\n\n") } : null;
  logRevision(id, {
    at: new Date().toISOString(), by: "Redaksi iTAP",
    changes: note || (decision === "publish" ? "Disetujui dan diterbitkan. +1 poin kontribusi."
      : decision === "return" ? "Dikembalikan ke kontributor (minta perbaikan)."
      : "Diturunkan dari terbit."),
    snapshot,
  });
}

export async function createCategory(channel: Channel, name_id: string, name_en: string): Promise<Category> {
  const slug = name_id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const cat = { id: `cat-${Date.now()}`, channel, name_id, name_en, slug };
  store.categoriesExtra.push(cat);
  return cat;
}

export async function listAdminContributors(): Promise<{ id: string; name: string; email: string; verified: boolean; auto_approve: boolean; points: number }[]> {
  const base = [
    { id: "u-dian", name: "Dian (Kontributor Demo)", email: "dian@contoh.id", verified: true, auto_approve: false, points: 2 },
    { id: "u-budi", name: "Budi (Kontributor Demo)", email: "budi@contoh.id", verified: false, auto_approve: false, points: 0 },
  ];
  return base.map((c) => {
    const o = contributorOverrides.get(c.id);
    return o ? { ...c, verified: o.verified ?? c.verified, auto_approve: o.auto_approve ?? c.auto_approve } : c;
  });
}

/** Ubah verifikasi/auto-approve kontributor seed (dipakai PATCH admin di
 * mode seed — tersimpan selama sesi berjalan, hilang saat restart). */
export async function setContributorPatch(
  id: string, patch: { verification_status?: "unverified" | "pending" | "verified"; auto_approve?: boolean },
): Promise<{ id: string; name: string; email: string; verified: boolean; auto_approve: boolean; points: number } | null> {
  const list = await listAdminContributors();
  const row = list.find((x) => x.id === id);
  if (!row) return null;
  const prev = contributorOverrides.get(id) ?? {};
  contributorOverrides.set(id, {
    verified: patch.verification_status !== undefined ? patch.verification_status === "verified" : (prev.verified ?? row.verified),
    auto_approve: patch.auto_approve !== undefined ? patch.auto_approve : (prev.auto_approve ?? row.auto_approve),
  });
  return (await listAdminContributors()).find((x) => x.id === id) ?? null;
}

export async function listReports(): Promise<Report[]> {
  return store.reports;
}

export async function reviewReport(id: string, action: "hidden" | "dismissed" | "reviewed" | "unblock" | "disable_listing"): Promise<void> {
  const r = store.reports.find((x) => x.id === id);
  // Mode seed: hanya status laporan yang berubah. disable_listing/unblock
  // dicatat sebagai "reviewed" — tidak ada listing/komentar/blokir seed
  // yang terikat laporan untuk ditindak.
  if (r) r.status = action === "disable_listing" || action === "unblock" ? "reviewed" : action;
}

export async function listModerationWords(): Promise<ModerationWord[]> {
  return store.words;
}

export async function addModerationWord(word: string, action: "sensor" | "hold"): Promise<ModerationWord> {
  const w: ModerationWord = { id: `w-${Date.now()}`, word: word.toLowerCase(), action };
  store.words.push(w);
  store.words.sort((a, b) => a.word.localeCompare(b.word));
  return w;
}

export async function updateModerationWord(id: string, patch: { word?: string; action?: "sensor" | "hold" }): Promise<ModerationWord | null> {
  const w = store.words.find((x) => x.id === id);
  if (!w) return null;
  if (patch.word !== undefined) w.word = patch.word.toLowerCase();
  if (patch.action !== undefined) w.action = patch.action;
  store.words.sort((a, b) => a.word.localeCompare(b.word));
  return w;
}

export async function deleteModerationWord(id: string): Promise<void> {
  // Mutasi in-place (bukan reassign) supaya referensi store.words yang
  // sudah dipegang pemanggil tidak basi.
  const i = store.words.findIndex((x) => x.id === id);
  if (i >= 0) store.words.splice(i, 1);
}

// --- Info warga (kurasi redaksi, S22) -----------------------------------------

export async function createInfoSubmission(text: string, ctx?: SeedCtx): Promise<InfoSubmission> {
  const row = {
    id: uniqueId("is"),
    user_id: ctx?.profile?.id ?? "u-contoh",
    user_name: ctx?.profile?.displayName ?? "Warga",
    text,
    status: "pending" as const,
    curated_for_ai: false,
    created_at: new Date().toISOString(),
  };
  store.infoSubmissions.unshift(row);
  return row;
}

export async function listInfoSubmissions(status?: string) {
  const rows = store.infoSubmissions;
  return status ? rows.filter((x) => x.status === status) : rows;
}

export async function reviewInfoSubmission(id: string, decision: "approved" | "rejected") {
  const row = store.infoSubmissions.find((x) => x.id === id);
  if (!row) return null;
  row.status = decision;
  row.curated_for_ai = decision === "approved";
  return row;
}

// --- 3.8 Konten iTAP -----------------------------------------------------------

export async function getDailyPrices(): Promise<DailyPrices> {
  return DAILY_PRICES;
}

export async function getMarketRates(): Promise<MarketRates> {
  return MARKET_RATES;
}

export async function listJobs(opts: { q?: string; region?: string } = {}): Promise<JobListing[]> {
  const { listJobsFromJson } = await import("./jobs-json");
  return listJobsFromJson(opts);
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

// --- Budaya (S34–S35, F15, M5) ---------------------------------------------
// Seed cerita budaya HANYA dari 5 artikel kanal Budaya yang teksnya memang
// ada di KB situs lama (seed-data.ts, id kb-35 s.d. kb-39). Tidak ada cerita
// atau lirik yang dikarang: lyrics selalu null di seed ini (tidak ada lirik
// di sumber), sources = sumber artikel aslinya. Kategori dipetakan dari
// kategori artikel ke enum culture_stories (upacara, tari-musik -> tari_musik,
// bahasa); kategori lagu/kuliner_tradisi/cerita_rakyat/sejarah_timah masih
// kosong sampai Teguh/redaksi mengisinya.
const CULTURE_CATEGORY_MAP: Record<string, CultureCategory> = {
  upacara: "upacara",
  "tari-musik": "tari_musik",
  bahasa: "bahasa",
};

export const CULTURE_STORIES_SEED: CultureStory[] = ARTICLES.filter(
  (a) => a.channel === "budaya" && CULTURE_CATEGORY_MAP[a.category_id],
).map((a) => ({
  id: `culture-${a.id}`,
  slug: a.slug,
  category: CULTURE_CATEGORY_MAP[a.category_id],
  title: a.title_id,
  body: a.body_id.join("\n\n"),
  lyrics: null,
  sources: a.source ? [a.source] : [],
  created_at: a.published_at,
}));

export async function listCultureStories(category?: string): Promise<CultureStory[]> {
  return CULTURE_STORIES_SEED.filter((s) => !category || s.category === category);
}

export async function getCultureStory(slug: string): Promise<CultureStory | null> {
  return CULTURE_STORIES_SEED.find((s) => s.slug === slug) ?? null;
}
