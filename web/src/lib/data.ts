// DATA LAYER — implementasi NYATA (Supabase Postgres via Drizzle).
// Tanda tangan fungsi SAMA seperti API di architecture.md §3 dan seperti
// data layer palsu sebelumnya, supaya layar tidak berubah.
//
// Bila DATABASE_URL belum diisi (P1 belum dibuat), fungsi-fungsi di sini
// memakai fallback seed sementara dari data-seed.ts (in-memory) agar situs
// tetap bisa dibangun/dilihat — JANGAN jadikan ini permanen: set
// ITAP_ALLOW_SEED_FALLBACK=false setelah P1 untuk mematikan fallback dan
// memaksa error yang jelas. Lihat replica/backend.md.
//
// Otorisasi: baca publik difilter status di query (published/aktif/open);
// tulis memakai `can()` dari lib/auth + konteks profil pemanggil (ctx).
// RLS schema.sql adalah pertahanan kedua untuk akses langsung via client.
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb, isDbConfigured } from "./db";
import * as t from "./db/schema";
import { can, getCurrentProfile, isAdmin, type SessionProfile } from "./auth";
import * as seed from "./data-seed";
import { getJobsUpdatedAt as getJobsUpdatedAtFromJson, listJobsFromJson } from "./jobs-json";
import type { Lang } from "./i18n";
export { channelLabel } from "./labels";
import type {
  Article, Category, Channel, Comment, Contribution, ContributionPoint,
  ContributionRevision, ContributorDashboard, DailyPrices, InfoSubmission, JobListing, Kedai, MarketRates,
  ModerationWord, Paginated, Report,
} from "./types";
import { applySensor, checkModerationWords } from "./moderation";

const PER_PAGE = 9;

/** true bila DB tersambung (dan fallback seed tidak dimatikan paksa). */
function useSeed(): boolean {
  return !isDbConfigured() && process.env.ITAP_ALLOW_SEED_FALLBACK !== "false";
}

export type Ctx = { profile?: SessionProfile | null };
async function ctxProfile(ctx?: Ctx): Promise<SessionProfile | null> {
  if (ctx && "profile" in ctx) return ctx.profile ?? null;
  try { return await getCurrentProfile(); } catch { return null; }
}

function paginate<T>(items: T[], page: number, perPage = PER_PAGE): Paginated<T> {
  const total = items.length;
  const total_pages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), total_pages);
  return { items: items.slice((safePage - 1) * perPage, safePage * perPage), page: safePage, per_page: perPage, total, total_pages };
}

const splitParas = (s: string | null | undefined): string[] =>
  (s ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const joinParas = (arr: string[] | string | null | undefined): string =>
  Array.isArray(arr) ? arr.join("\n\n") : (arr ?? "");

type ArticleRow = typeof t.articles.$inferSelect;

function toArticle(row: ArticleRow, categorySlug?: string): Article {
  const gallery = Array.isArray(row.gallery)
    ? (row.gallery as { alt: string; caption: string; url?: string }[])
    : [];
  return {
    id: row.id,
    slug: row.slug,
    channel: row.channel as Channel,
    category_id: row.categoryId ?? categorySlug ?? "",
    title_id: row.titleId,
    title_en: row.titleEn,
    body_id: splitParas(row.bodyId),
    // bodyEn "" (hasil seed body_en []) = isi terjemahan kosong, BUKAN
    // belum diterjemahkan (null). splitParas("") -> [].
    body_en: row.bodyEn == null ? null : splitParas(row.bodyEn),
    gallery,
    location_name: row.locationName ?? "",
    location_lat: row.locationLat,
    location_lng: row.locationLng,
    source: row.source ?? "",
    source_url: row.sourceUrl,
    external: row.external,
    author_id: row.authorId,
    status: row.status,
    published_at: (row.publishedAt ?? row.createdAt).toISOString(),
    views: row.views,
    featured: false,
  };
}

function toCategory(row: typeof t.categories.$inferSelect): Category {
  return { id: row.id, channel: row.channel as Channel, name_id: row.nameId, name_en: row.nameEn ?? "", slug: row.slug };
}

async function categorySlugById(db: ReturnType<typeof getDb>, id: string | null): Promise<string> {
  if (!id) return "";
  const rows = await db.select().from(t.categories).where(eq(t.categories.id, id)).limit(1);
  return rows[0]?.slug ?? id;
}

// --- 3.2 Portal & pencarian (F01, F02) -------------------------------------

export async function listCategories(channel?: Channel): Promise<Category[]> {
  if (useSeed()) return seed.listCategories(channel);
  const db = getDb();
  const rows = await db.select().from(t.categories)
    .where(channel ? eq(t.categories.channel, channel) : undefined)
    .orderBy(asc(t.categories.sortOrder), asc(t.categories.nameId));
  return rows.map(toCategory);
}

export async function listArticles(opts: {
  channel?: Channel; category?: string; page?: number; perPage?: number;
}): Promise<Paginated<Article>> {
  if (useSeed()) return seed.listArticles(opts);
  const db = getDb();
  const conds = [eq(t.articles.status, "published")];
  if (opts.channel) conds.push(eq(t.articles.channel, opts.channel));
  if (opts.category) conds.push(eq(t.articles.categoryId, opts.category));
  const rows = await db.select().from(t.articles)
    .where(and(...conds))
    .orderBy(desc(t.articles.publishedAt), desc(t.articles.createdAt));
  const cats = await db.select().from(t.categories);
  const slugById = new Map(cats.map((c) => [c.id, c.slug]));
  const items = rows.map((r) => toArticle(r, slugById.get(r.categoryId ?? "") ?? ""));
  return paginate(items, opts.page ?? 1, opts.perPage ?? PER_PAGE);
}

export async function getArticle(slug: string, opts?: { countView?: boolean }): Promise<Article | null> {
  if (useSeed()) return seed.getArticle(slug);
  const db = getDb();
  const rows = await db.select().from(t.articles).where(eq(t.articles.slug, slug)).limit(1);
  const row = rows[0];
  if (!row) return null;
  // View counter atomic (arsitektur §2.10) — hanya untuk artikel published,
  // dan HANYA bila pemanggil memintanya (countView). Default TIDAK menghitung:
  // generateMetadata, getRelated, dan /api/articles/:slug memanggil fungsi ini
  // juga — tanpa ini satu kali buka halaman menaikkan 3x (bug 19 Nov 2026).
  // Halaman artikel menghitung sekali per sesi lewat cookie itap_read_<slug>.
  if (row.status === "published" && opts?.countView) {
    await db.execute(sql`select public.increment_article_views(${row.id})`).catch(() => undefined);
    row.views += 1;
  }
  return toArticle(row, await categorySlugById(db, row.categoryId));
}

export async function getRelated(slug: string, limit = 4): Promise<Article[]> {
  if (useSeed()) return seed.getRelated(slug, limit);
  const article = await getArticle(slug);
  if (!article) return [];
  const db = getDb();
  const rows = await db.select().from(t.articles)
    .where(and(eq(t.articles.status, "published"), sql`${t.articles.id} <> ${article.id}`))
    .orderBy(desc(t.articles.publishedAt)).limit(limit * 2);
  const same = rows.filter((r) => r.channel === article.channel);
  const cross = rows.filter((r) => r.channel !== article.channel);
  return [...same, ...cross].slice(0, limit).map((r) => toArticle(r));
}

export async function searchArticles(opts: {
  q: string; channel?: Channel; category?: string;
  sort?: "terbaru" | "terpopuler" | "banyak-dicari";
  from?: string; to?: string; page?: number;
}): Promise<Paginated<Article>> {
  if (useSeed()) return seed.searchArticles(opts);
  const db = getDb();
  const q = opts.q.trim();
  const conds = [eq(t.articles.status, "published")];
  if (q) {
    // Full-text 'simple' (tanpa stemmer ID — keterbatasan arsitektur §4)
    // + fallback ILIKE judul agar kata parsial tetap ketemu.
    conds.push(sql`(
      to_tsvector('simple', coalesce(${t.articles.titleId}, '') || ' ' || coalesce(${t.articles.bodyId}, ''))
        @@ plainto_tsquery('simple', ${q})
      or ${t.articles.titleId} ilike ${"%" + q + "%"}
    )`);
  }
  if (opts.channel) conds.push(eq(t.articles.channel, opts.channel));
  if (opts.category) conds.push(eq(t.articles.categoryId, opts.category));
  if (opts.from) conds.push(sql`${t.articles.publishedAt} >= ${opts.from}::timestamptz`);
  if (opts.to) conds.push(sql`${t.articles.publishedAt} <= ${opts.to}::timestamptz`);
  const order = opts.sort === "terpopuler" || opts.sort === "banyak-dicari"
    ? desc(t.articles.views)
    : desc(t.articles.publishedAt);
  const rows = await db.select().from(t.articles).where(and(...conds)).orderBy(order);
  return paginate(rows.map((r) => toArticle(r)), opts.page ?? 1);
}

export async function getPopular(limit = 5): Promise<Article[]> {
  if (useSeed()) return seed.getPopular(limit);
  const db = getDb();
  const rows = await db.select().from(t.articles)
    .where(eq(t.articles.status, "published"))
    .orderBy(desc(t.articles.views)).limit(limit);
  return rows.map((r) => toArticle(r));
}

export async function getLatest(limit = 6): Promise<Article[]> {
  if (useSeed()) return seed.getLatest(limit);
  const db = getDb();
  const rows = await db.select().from(t.articles)
    .where(eq(t.articles.status, "published"))
    .orderBy(desc(t.articles.publishedAt)).limit(limit);
  return rows.map((r) => toArticle(r));
}

export async function getFeatured(): Promise<Article | null> {
  if (useSeed()) return seed.getFeatured();
  const latest = await getLatest(1);
  return latest[0] ?? null;
}

/** Nama kategori dari id (uuid DB / slug seed). Async karena butuh DB. */
export async function categoryName(id: string, lang: Lang = "id"): Promise<string> {
  if (useSeed()) return seed.categoryName(id, lang);
  try {
    const db = getDb();
    const rows = await db.select().from(t.categories).where(eq(t.categories.id, id)).limit(1);
    if (rows[0]) return lang === "en" && rows[0].nameEn ? rows[0].nameEn : rows[0].nameId;
    const bySlug = await db.select().from(t.categories).where(eq(t.categories.slug, id)).limit(1);
    if (bySlug[0]) return lang === "en" && bySlug[0].nameEn ? bySlug[0].nameEn : bySlug[0].nameId;
    return id;
  } catch {
    return seed.categoryName(id, lang);
  }
}

// --- 3.3 Komentar (F10) ------------------------------------------------------

function toComment(
  row: typeof t.comments.$inferSelect,
  authorName: string,
  articleSlug: string,
): Comment {
  return {
    id: row.id, article_id: row.articleId, article_slug: articleSlug,
    author_name: authorName, text: row.text, status: row.status,
    created_at: row.createdAt.toISOString(),
  };
}

export async function listComments(slug: string): Promise<Comment[]> {
  if (useSeed()) return seed.listComments(slug);
  const db = getDb();
  const arts = await db.select().from(t.articles).where(eq(t.articles.slug, slug)).limit(1);
  if (!arts[0]) return [];
  const rows = await db.select().from(t.comments)
    .where(and(eq(t.comments.articleId, arts[0].id), eq(t.comments.status, "approved")))
    .orderBy(desc(t.comments.createdAt));
  const profs = await db.select().from(t.profiles);
  const nameById = new Map(profs.map((p) => [p.id, p.displayName ?? p.email]));
  return rows.map((r) => toComment(r, nameById.get(r.userId) ?? "Pembaca", slug));
}

export async function listPendingComments(): Promise<Comment[]> {
  if (useSeed()) return seed.listPendingComments();
  const db = getDb();
  const rows = await db.select().from(t.comments)
    .where(eq(t.comments.status, "pending")).orderBy(desc(t.comments.createdAt));
  const arts = await db.select().from(t.articles);
  const slugById = new Map(arts.map((a) => [a.id, a.slug]));
  const profs = await db.select().from(t.profiles);
  const nameById = new Map(profs.map((p) => [p.id, p.displayName ?? p.email]));
  return rows.map((r) => toComment(r, nameById.get(r.userId) ?? "Pembaca", slugById.get(r.articleId) ?? ""));
}

export async function addComment(
  slug: string, _authorName: string, text: string, ctx?: Ctx,
): Promise<Comment> {
  if (useSeed()) return seed.addComment(slug, _authorName, text);
  const profile = await ctxProfile(ctx);
  if (!can(profile, "comment.create")) {
    throw new Error("UNAUTHORIZED: komentar butuh login + email terverifikasi.");
  }
  const db = getDb();
  const arts = await db.select().from(t.articles).where(eq(t.articles.slug, slug)).limit(1);
  if (!arts[0]) throw new Error("NOT_FOUND: artikel tidak ditemukan.");
  // Penahanan otomatis kamus kata (F08): kata "sensor" disamarkan, kata
  // "hold" menahan komentar di antrean (status tetap pending — semua
  // komentar memang masuk antrean moderasi dulu). Mode seed: pemeriksaan
  // dilewati (kamus tidak bisa dibaca tanpa DB) — lihat lib/moderation.ts.
  const check = await checkModerationWords(text);
  let finalText = text.trim();
  if (check.match?.action === "sensor") finalText = await applySensor(finalText);
  const inserted = await db.insert(t.comments).values({
    articleId: arts[0].id, userId: profile!.id, text: finalText, status: "pending",
  }).returning();
  return toComment(inserted[0], profile!.displayName ?? profile!.email, slug);
}

export async function moderateComment(id: string, decision: "approved" | "rejected", ctx?: Ctx): Promise<void> {
  if (useSeed()) return seed.moderateComment(id, decision);
  const profile = await ctxProfile(ctx);
  if (!can(profile, "article.review")) {
    throw new Error("FORBIDDEN: moderasi komentar hanya redaksi.");
  }
  const db = getDb();
  await db.update(t.comments).set({ status: decision }).where(eq(t.comments.id, id));
}

/** A9 (M8) — komentar SAYA (semua status) agar penulis bisa melihat status
    moderasi komentarnya sendiri. Hanya milik pemanggil; butuh login. */
export async function listMyComments(ctx?: Ctx): Promise<Comment[]> {
  if (useSeed()) return seed.listMyComments();
  const profile = await ctxProfile(ctx);
  if (!profile) return [];
  const db = getDb();
  const rows = await db.select().from(t.comments)
    .where(eq(t.comments.userId, profile.id)).orderBy(desc(t.comments.createdAt));
  const arts = await db.select().from(t.articles);
  const slugById = new Map(arts.map((a) => [a.id, a.slug]));
  return rows.map((r) => toComment(r, profile.displayName ?? profile.email, slugById.get(r.articleId) ?? ""));
}

// --- 3.4 Kontributor (F09) ---------------------------------------------------

function toContribution(row: ArticleRow): Contribution {
  return {
    id: row.id,
    title_id: row.titleId,
    title_en: row.titleEn ?? "",
    body_id: joinParas(splitParas(row.bodyId)),
    body_en: row.bodyEn ?? "",
    channel: row.channel as Channel,
    category_id: row.categoryId ?? "",
    location_name: row.locationName ?? "",
    source: row.source ?? "",
    status: row.status,
    views: row.views,
    note_from_editor: null,
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function getContributorDashboard(ctx?: Ctx): Promise<ContributorDashboard> {
  if (useSeed()) return seed.getContributorDashboard();
  const profile = await ctxProfile(ctx);
  if (!profile) throw new Error("UNAUTHORIZED: masuk dulu.");
  const db = getDb();
  const subs = await db.select().from(t.articles)
    .where(eq(t.articles.authorId, profile.id)).orderBy(desc(t.articles.updatedAt));
  const points = await listPoints(profile.id);
  return {
    total_views: subs.reduce((s, c) => s + c.views, 0),
    approved_count: subs.filter((c) => c.status === "published").length,
    pending_count: subs.filter((c) => c.status === "review").length,
    draft_count: subs.filter((c) => c.status === "draft").length,
    points_total: points.reduce((s, p) => s + p.points, 0),
    submissions: subs.map(toContribution),
  };
}

export async function listPoints(userId?: string, ctx?: Ctx): Promise<ContributionPoint[]> {
  if (useSeed()) return seed.listPoints();
  const profile = userId ? null : await ctxProfile(ctx);
  const uid = userId ?? profile?.id;
  if (!uid) return [];
  const db = getDb();
  const rows = await db.select().from(t.contributionPoints)
    .where(eq(t.contributionPoints.userId, uid)).orderBy(desc(t.contributionPoints.awardedAt));
  const arts = await db.select().from(t.articles);
  const titleById = new Map(arts.map((a) => [a.id, a.titleId]));
  return rows.map((r) => ({
    id: r.id, source_type: r.sourceType, source_id: r.sourceId,
    source_title: titleById.get(r.sourceId) ?? r.sourceId,
    points: r.points, awarded_at: r.awardedAt.toISOString(),
  }));
}

export async function listContributions(ctx?: Ctx): Promise<Contribution[]> {
  if (useSeed()) return seed.listContributions();
  const profile = await ctxProfile(ctx);
  if (!profile) throw new Error("UNAUTHORIZED: masuk dulu.");
  const db = getDb();
  const rows = await db.select().from(t.articles)
    .where(eq(t.articles.authorId, profile.id)).orderBy(desc(t.articles.updatedAt));
  return rows.map(toContribution);
}

export async function getContribution(id: string, ctx?: Ctx): Promise<Contribution | null> {
  if (useSeed()) return seed.getContribution(id);
  const db = getDb();
  const rows = await db.select().from(t.articles).where(eq(t.articles.id, id)).limit(1);
  if (!rows[0]) return null;
  const profile = await ctxProfile(ctx);
  // Baca kiriman sendiri: pemilik boleh baca dalam status apa pun (termasuk
  // review); admin boleh baca semua. Bukan pemilik + bukan admin = 403.
  if (!profile || (profile.id !== rows[0].authorId && !isAdmin(profile))) {
    throw new Error("FORBIDDEN: bukan kirimanmu.");
  }
  return toContribution(rows[0]);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 120) || "tanpa-judul";
}

export async function createContribution(data: Partial<Contribution>, ctx?: Ctx): Promise<Contribution> {
  if (useSeed()) return seed.createContribution(data, ctx);
  const profile = await ctxProfile(ctx);
  if (!can(profile, "contribution.create")) {
    throw new Error("FORBIDDEN: hanya kontributor yang bisa membuat draf.");
  }
  const db = getDb();
  const slug = `${slugify(data.title_id ?? "tanpa-judul")}-${Date.now().toString(36)}`;
  const inserted = await db.insert(t.articles).values({
    authorId: profile!.id,
    categoryId: data.category_id || null,
    channel: (data.channel ?? "wisata") as Channel,
    slug,
    titleId: data.title_id ?? "Tanpa judul",
    titleEn: data.title_en ?? null,
    bodyId: joinParas(data.body_id),
    bodyEn: data.body_en ?? null,
    gallery: [],
    locationName: data.location_name ?? null,
    source: data.source ?? null,
    status: "draft",
  }).returning();
  return toContribution(inserted[0]);
}

export async function updateContribution(id: string, data: Partial<Contribution>, ctx?: Ctx): Promise<Contribution | null> {
  if (useSeed()) return seed.updateContribution(id, data);
  const db = getDb();
  const rows = await db.select().from(t.articles).where(eq(t.articles.id, id)).limit(1);
  if (!rows[0]) return null;
  const profile = await ctxProfile(ctx);
  if (!can(profile, "contribution.edit", { ownerId: rows[0].authorId, status: rows[0].status })) {
    throw new Error("FORBIDDEN: kiriman terkunci saat ditinjau atau bukan milikmu.");
  }
  const patch: Partial<typeof t.articles.$inferInsert> = {};
  if (data.title_id !== undefined) patch.titleId = data.title_id;
  if (data.title_en !== undefined) patch.titleEn = data.title_en || null;
  if (data.body_id !== undefined) patch.bodyId = joinParas(data.body_id);
  if (data.body_en !== undefined) patch.bodyEn = data.body_en || null;
  if (data.channel !== undefined) patch.channel = data.channel;
  if (data.category_id !== undefined) patch.categoryId = data.category_id || null;
  if (data.location_name !== undefined) patch.locationName = data.location_name || null;
  if (data.source !== undefined) patch.source = data.source || null;
  const updated = await db.update(t.articles).set(patch).where(eq(t.articles.id, id)).returning();
  // Catat revisi (dengan snapshot isi) supaya riwayat revisi punya bahan diff.
  await db.insert(t.articleRevisions).values({
    articleId: id, editorId: profile!.id,
    changes: {
      kind: "edit",
      snapshot: { title_id: updated[0].titleId, body_id: updated[0].bodyId },
    },
    note: "Draf diubah oleh penulis.",
  });
  return toContribution(updated[0]);
}

export async function submitContribution(id: string, ctx?: Ctx): Promise<Contribution | null> {
  if (useSeed()) return seed.submitContribution(id, ctx);
  const db = getDb();
  const rows = await db.select().from(t.articles).where(eq(t.articles.id, id)).limit(1);
  if (!rows[0]) return null;
  const profile = await ctxProfile(ctx);
  if (!can(profile, "contribution.submit", { ownerId: rows[0].authorId, status: rows[0].status })) {
    throw new Error("FORBIDDEN: hanya pemilik draf yang bisa mengirim ke redaksi.");
  }
  if (rows[0].status !== "draft") return toContribution(rows[0]);
  const snapshot = { title_id: rows[0].titleId, body_id: rows[0].bodyId };
  // Persetujuan otomatis: kontributor terverifikasi + auto_approve aktif
  // langsung terbit saat submit (bukan masuk antrean review).
  const cps = await db.select().from(t.contributorProfiles)
    .where(eq(t.contributorProfiles.userId, rows[0].authorId)).limit(1);
  const autoApprove = cps[0]?.verificationStatus === "verified" && cps[0].autoApprove === true;
  if (autoApprove) {
    const updated = await db.update(t.articles).set({
      status: "published", publishedAt: new Date(),
    }).where(eq(t.articles.id, id)).returning();
    await db.insert(t.articleRevisions).values({
      articleId: id, editorId: profile!.id,
      changes: { kind: "auto_approve", snapshot },
      note: "Disetujui otomatis (kontributor terverifikasi + auto-approve aktif) dan diterbitkan.",
    });
    await db.execute(sql`select public.award_contribution_point(${updated[0].authorId}, 'article', ${id})`).catch(() => undefined);
    return toContribution(updated[0]);
  }
  const updated = await db.update(t.articles).set({ status: "review" }).where(eq(t.articles.id, id)).returning();
  await db.insert(t.articleRevisions).values({
    articleId: id, editorId: profile!.id,
    changes: { kind: "submit", snapshot },
    note: "Dikirim ke redaksi.",
  });
  return toContribution(updated[0]);
}

/** Ubah catatan perubahan (JSONB) jadi kalimat yang bisa dibaca. */
function describeRevisionChanges(changes: unknown): string {
  if (!changes || typeof changes !== "object") return "Revisi tercatat.";
  const c = changes as Record<string, unknown>;
  if (c.decision === "publish") return "Disetujui dan diterbitkan. +1 poin kontribusi.";
  if (c.decision === "return") return "Dikembalikan ke kontributor (minta perbaikan).";
  if (c.decision === "unpublish") return "Diturunkan dari terbit.";
  if (c.kind === "submit") return "Dikirim ke redaksi.";
  if (c.kind === "auto_approve") return "Disetujui otomatis (kontributor terverifikasi + auto-approve aktif) dan diterbitkan.";
  if (c.kind === "edit") return "Draf diubah oleh penulis.";
  if (c.kind === "create") return "Draf dibuat.";
  const { snapshot: _s, ...rest } = c;
  return JSON.stringify(rest);
}

export async function listContributionRevisions(id: string): Promise<ContributionRevision[]> {
  if (useSeed()) return seed.listContributionRevisions(id);
  const db = getDb();
  const rows = await db.select().from(t.articleRevisions)
    .where(eq(t.articleRevisions.articleId, id)).orderBy(desc(t.articleRevisions.createdAt));
  const profs = await db.select().from(t.profiles);
  const nameById = new Map(profs.map((p) => [p.id, p.displayName ?? p.email]));
  return rows.map((r) => {
    const changes = (r.changes ?? {}) as Record<string, unknown>;
    const snap = changes.snapshot as { title_id?: unknown; body_id?: unknown } | undefined;
    return {
      at: r.createdAt.toISOString(),
      by: r.editorId ? (nameById.get(r.editorId) ?? "Redaksi") : "Redaksi",
      changes: r.note ?? describeRevisionChanges(changes),
      snapshot: typeof snap?.title_id === "string" && typeof snap?.body_id === "string"
        ? { title_id: snap.title_id, body_id: snap.body_id }
        : null,
    };
  });
}

// --- 3.5 CMS / redaksi / moderasi (F11, F08) ---------------------------------

export async function listAdminArticles(filter?: string): Promise<Article[]> {
  if (useSeed()) return seed.listAdminArticles(filter);
  const db = getDb();
  const rows = await db.select().from(t.articles)
    .where(filter && filter !== "semua" ? eq(t.articles.status, filter as Article["status"]) : undefined)
    .orderBy(desc(t.articles.createdAt));
  return rows.map((r) => toArticle(r));
}

export async function reviewArticle(
  id: string, decision: "publish" | "unpublish" | "return", note: string, ctx?: Ctx,
): Promise<void> {
  if (useSeed()) return seed.reviewArticle(id, decision, note);
  const profile = await ctxProfile(ctx);
  if (!can(profile, "article.review")) {
    throw new Error("FORBIDDEN: putusan redaksi hanya admin portal / superadmin.");
  }
  const status = decision === "publish" ? "published" : decision === "unpublish" ? "unpublished" : "returned";
  const db = getDb();
  const updated = await db.update(t.articles).set({
    status,
    publishedAt: decision === "publish" ? new Date() : undefined,
  }).where(eq(t.articles.id, id)).returning();
  if (!updated[0]) throw new Error("NOT_FOUND: artikel tidak ditemukan.");
  await db.insert(t.articleRevisions).values({
    articleId: id, editorId: profile!.id,
    changes: {
      decision, from: "review",
      snapshot: { title_id: updated[0].titleId, body_id: updated[0].bodyId },
    },
    note: note || null,
  });
  if (decision === "publish") {
    // 1 poin per karya disetujui — idempotent via fungsi DB (arsitektur §2.5).
    await db.execute(sql`select public.award_contribution_point(${updated[0].authorId}, 'article', ${id})`).catch(() => undefined);
  }
}

export async function createCategory(channel: Channel, name_id: string, name_en: string, ctx?: Ctx): Promise<Category> {
  if (useSeed()) return seed.createCategory(channel, name_id, name_en);
  const profile = await ctxProfile(ctx);
  if (!can(profile, "category.manage")) {
    throw new Error("FORBIDDEN: kelola kategori hanya redaksi.");
  }
  const db = getDb();
  const inserted = await db.insert(t.categories).values({
    channel, nameId: name_id, nameEn: name_en || null, slug: slugify(name_id),
  }).returning();
  return toCategory(inserted[0]);
}

export async function listAdminContributors(): Promise<{ id: string; name: string; email: string; verified: boolean; auto_approve: boolean; points: number }[]> {
  if (useSeed()) return seed.listAdminContributors();
  const db = getDb();
  const profs = await db.select().from(t.profiles).where(eq(t.profiles.role, "contributor"));
  const cps = await db.select().from(t.contributorProfiles);
  const cpById = new Map(cps.map((c) => [c.userId, c]));
  return profs.map((p) => ({
    id: p.id, name: p.displayName ?? p.email, email: p.email,
    verified: (cpById.get(p.id)?.verificationStatus ?? "unverified") === "verified",
    auto_approve: cpById.get(p.id)?.autoApprove ?? false,
    points: cpById.get(p.id)?.pointsTotal ?? 0,
  }));
}

/** Ubah verifikasi/auto-approve kontributor (dipakai PATCH admin). */
export async function updateContributor(
  id: string,
  patch: { verification_status?: "unverified" | "pending" | "verified"; auto_approve?: boolean },
  ctx?: Ctx,
): Promise<{ id: string; name: string; email: string; verified: boolean; auto_approve: boolean; points: number } | null> {
  if (useSeed()) return seed.setContributorPatch(id, patch);
  const profile = await ctxProfile(ctx);
  if (!can(profile, "contributor.manage")) {
    throw new Error("FORBIDDEN: kelola kontributor hanya redaksi.");
  }
  const db = getDb();
  const values: Partial<typeof t.contributorProfiles.$inferInsert> = {};
  if (patch.verification_status !== undefined) values.verificationStatus = patch.verification_status;
  if (patch.auto_approve !== undefined) values.autoApprove = patch.auto_approve;
  const updated = await db.insert(t.contributorProfiles).values({
    userId: id, ...values,
  }).onConflictDoUpdate({ target: t.contributorProfiles.userId, set: values }).returning();
  const profs = await db.select().from(t.profiles).where(eq(t.profiles.id, id)).limit(1);
  return {
    id,
    name: profs[0]?.displayName ?? profs[0]?.email ?? id,
    email: profs[0]?.email ?? "",
    verified: updated[0].verificationStatus === "verified",
    auto_approve: updated[0].autoApprove,
    points: updated[0].pointsTotal,
  };
}

/** Kirim info warga (calon referensi AI) — masuk antrean kurasi redaksi. */
export async function createInfoSubmission(text: string, ctx?: Ctx): Promise<InfoSubmission> {
  if (useSeed()) return seed.createInfoSubmission(text, ctx);
  const profile = await ctxProfile(ctx);
  if (!can(profile, "info.submit")) {
    throw new Error("FORBIDDEN: kirim info butuh email terverifikasi.");
  }
  const db = getDb();
  // Penahanan otomatis kamus kata (F08): kata "sensor" disamarkan; kata
  // "hold" menahan kiriman di antrean (status memang selalu pending).
  const { applySensor, checkModerationWords } = await import("./moderation");
  const check = await checkModerationWords(text);
  const clean = check.match?.action === "sensor" ? await applySensor(text) : text;
  const inserted = await db.insert(t.infoSubmissions).values({
    userId: profile!.id, text: clean, status: "pending",
  }).returning();
  return {
    id: inserted[0].id, user_id: inserted[0].userId,
    user_name: profile!.displayName ?? profile!.email,
    text: inserted[0].text, status: inserted[0].status,
    curated_for_ai: inserted[0].curatedForAi,
    created_at: inserted[0].createdAt.toISOString(),
  };
}

export async function listReports(): Promise<Report[]> {
  if (useSeed()) return seed.listReports();
  const db = getDb();
  const rows = await db.select().from(t.reports).orderBy(desc(t.reports.createdAt));
  const profs = await db.select().from(t.profiles);
  const nameById = new Map(profs.map((p) => [p.id, p.displayName ?? p.email]));
  return rows.map((r) => ({
    id: r.id, target_type: r.targetType,
    target_label: `${r.targetType} ${r.targetId.slice(0, 8)}`,
    reporter: nameById.get(r.reporterId) ?? "Pembaca",
    reason: r.reason, status: r.status,
    created_at: r.createdAt.toISOString(),
  }));
}

export type ReportAction = "hidden" | "dismissed" | "reviewed" | "unblock" | "disable_listing";

/**
 * Putusan redaksi atas satu laporan (S22). Selain mengubah status laporan,
 * aksi ini MENINDAK materi yang dilaporkan (DB nyata):
 * - hidden: laporan -> hidden; listing -> dinonaktifkan, komentar -> rejected.
 * - disable_listing: listing -> dinonaktifkan; laporan -> reviewed.
 * - unblock: semua blokir atas akun yang dilaporkan dihapus; laporan -> reviewed.
 * - dismissed / reviewed: hanya status laporan.
 * Mode seed: hanya status laporan di store yang berubah (tidak ada
 * listing/komentar/blokir seed yang terikat laporan) — dicatat jujur di UI.
 */
export async function reviewReport(id: string, action: ReportAction, ctx?: Ctx, note = ""): Promise<void> {
  if (useSeed()) return seed.reviewReport(id, action);
  const profile = await ctxProfile(ctx);
  if (!can(profile, "report.review")) {
    throw new Error("FORBIDDEN: moderasi laporan hanya redaksi.");
  }
  const db = getDb();
  const rows = await db.select().from(t.reports).where(eq(t.reports.id, id)).limit(1);
  const report = rows[0];
  if (!report) throw new Error("NOT_FOUND: laporan tidak ditemukan.");
  const status: "hidden" | "dismissed" | "reviewed" =
    action === "hidden" ? "hidden"
    : action === "dismissed" ? "dismissed" : "reviewed";
  if (action === "hidden") {
    if (report.targetType === "listing") {
      await db.update(t.listings).set({ status: "dinonaktifkan" }).where(eq(t.listings.id, report.targetId));
    } else if (report.targetType === "comment") {
      await db.update(t.comments).set({ status: "rejected" }).where(eq(t.comments.id, report.targetId));
    }
    // target "account": tidak ada materi untuk disembunyikan; laporan
    // dicatat hidden, penindakan akun memakai blokir/nonaktifkan terpisah.
  } else if (action === "disable_listing" && report.targetType === "listing") {
    await db.update(t.listings).set({ status: "dinonaktifkan" }).where(eq(t.listings.id, report.targetId));
  } else if (action === "unblock" && report.targetType === "account") {
    await db.delete(t.blocks).where(eq(t.blocks.blockedId, report.targetId));
  }
  await db.update(t.reports).set({
    status, moderatorId: profile!.id, moderatorNote: note || null,
  }).where(eq(t.reports.id, id));
}

export async function listModerationWords(): Promise<ModerationWord[]> {
  if (useSeed()) return seed.listModerationWords();
  const db = getDb();
  const rows = await db.select().from(t.moderationWords).orderBy(asc(t.moderationWords.word));
  return rows.map((r) => ({ id: r.id, word: r.word, action: r.action }));
}

/** Tambah kata kamus (superadmin saja — dicek route). */
export async function addModerationWord(word: string, action: "sensor" | "hold", ctx?: Ctx): Promise<ModerationWord> {
  if (useSeed()) return seed.addModerationWord(word, action);
  const profile = await ctxProfile(ctx);
  if (!can(profile, "moderation-word.manage")) {
    throw new Error("FORBIDDEN: kamus kata hanya superadmin.");
  }
  const db = getDb();
  const inserted = await db.insert(t.moderationWords).values({
    word: word.toLowerCase(), action, createdBy: profile!.id,
  }).returning();
  return { id: inserted[0].id, word: inserted[0].word, action: inserted[0].action };
}

/** Ubah kata/aksi kamus (superadmin saja — dicek route). */
export async function updateModerationWord(
  id: string, patch: { word?: string; action?: "sensor" | "hold" }, ctx?: Ctx,
): Promise<ModerationWord | null> {
  if (useSeed()) return seed.updateModerationWord(id, patch);
  const profile = await ctxProfile(ctx);
  if (!can(profile, "moderation-word.manage")) {
    throw new Error("FORBIDDEN: kamus kata hanya superadmin.");
  }
  const db = getDb();
  const updated = await db.update(t.moderationWords).set({
    ...(patch.word !== undefined ? { word: patch.word.toLowerCase() } : {}),
    ...(patch.action !== undefined ? { action: patch.action } : {}),
  }).where(eq(t.moderationWords.id, id)).returning();
  if (!updated[0]) return null;
  return { id: updated[0].id, word: updated[0].word, action: updated[0].action };
}

/** Hapus kata kamus (superadmin saja — dicek route). */
export async function deleteModerationWord(id: string, ctx?: Ctx): Promise<void> {
  if (useSeed()) return seed.deleteModerationWord(id);
  const profile = await ctxProfile(ctx);
  if (!can(profile, "moderation-word.manage")) {
    throw new Error("FORBIDDEN: kamus kata hanya superadmin.");
  }
  const db = getDb();
  await db.delete(t.moderationWords).where(eq(t.moderationWords.id, id));
}

// --- Info warga (kurasi redaksi, S22) ----------------------------------------

export async function listInfoSubmissions(status?: string): Promise<InfoSubmission[]> {
  if (useSeed()) return seed.listInfoSubmissions(status);
  const db = getDb();
  const rows = await db.select().from(t.infoSubmissions)
    .where(status ? eq(t.infoSubmissions.status, status as (typeof t.infoSubmissions.$inferSelect)["status"]) : undefined)
    .orderBy(desc(t.infoSubmissions.createdAt));
  const profs = await db.select().from(t.profiles);
  const nameById = new Map(profs.map((p) => [p.id, p.displayName ?? p.email]));
  return rows.map((r) => ({
    id: r.id, user_id: r.userId, user_name: nameById.get(r.userId) ?? "Warga",
    text: r.text, status: r.status, curated_for_ai: r.curatedForAi,
    created_at: r.createdAt.toISOString(),
  }));
}

/** Kurasi kiriman info warga: setujui (jadi referensi AI) atau tolak. */
export async function reviewInfoSubmission(id: string, decision: "approved" | "rejected", ctx?: Ctx): Promise<InfoSubmission | null> {
  if (useSeed()) return seed.reviewInfoSubmission(id, decision);
  const profile = await ctxProfile(ctx);
  if (!can(profile, "info.review")) {
    throw new Error("FORBIDDEN: kurasi info warga hanya redaksi.");
  }
  const db = getDb();
  const updated = await db.update(t.infoSubmissions).set({
    status: decision, curatedForAi: decision === "approved",
  }).where(eq(t.infoSubmissions.id, id)).returning();
  if (!updated[0]) return null;
  const profs = await db.select().from(t.profiles).where(eq(t.profiles.id, updated[0].userId)).limit(1);
  return {
    id: updated[0].id, user_id: updated[0].userId,
    user_name: profs[0]?.displayName ?? profs[0]?.email ?? "Warga",
    text: updated[0].text, status: updated[0].status,
    curated_for_ai: updated[0].curatedForAi, created_at: updated[0].createdAt.toISOString(),
  };
}

// --- 3.8 Konten iTAP -----------------------------------------------------------

const IDR = (cents: number | null | undefined): number => Math.round((cents ?? 0) / 100);

export async function getDailyPrices(): Promise<DailyPrices> {
  if (useSeed()) return seed.getDailyPrices();
  const db = getDb();
  const latest = await db.select({ priceDate: t.dailyPrices.priceDate })
    .from(t.dailyPrices).orderBy(desc(t.dailyPrices.priceDate)).limit(1);
  const date = latest[0]?.priceDate;
  const rows = date
    ? await db.select().from(t.dailyPrices).where(eq(t.dailyPrices.priceDate, date)).orderBy(asc(t.dailyPrices.commodity))
    : [];
  // fetched_at = waktu baris terbaru benar-benar masuk DB (bukan "sekarang":
  // sebelumnya memakai new Date() sehingga halaman selalu tampak baru padahal
  // datanya 18 hari — bug 19 Nov 2026). source_url = tautan ADAT yang asli
  // (sebelumnya "" sehingga tautan "Lihat sumber data" mati).
  const fetchedAt = rows.length
    ? new Date(Math.max(...rows.map((r) => r.createdAt.getTime()))).toISOString()
    : new Date().toISOString();
  return {
    source: "ADAT Belitung, Diskominfo Kab. Belitung (data: Dinas Ketahanan Pangan dan Pertanian Kab. Belitung)",
    source_url: "https://adat.belitung.go.id/komoditas",
    market: rows[0]?.market ?? "Pasar Tanjung Pandan",
    source_date: date ?? new Date().toISOString().slice(0, 10),
    fetched_at: fetchedAt,
    items: rows.map((r, i) => ({
      id: r.id, commodity: r.commodity, price: IDR(r.priceCents),
      unit: r.unit ?? "", previous_price: null, status: "—",
      change_note: "Harga kemarin tidak tersedia di sumber.",
    })),
  };
}

export async function getMarketRates(): Promise<MarketRates> {
  if (useSeed()) return seed.getMarketRates();
  const db = getDb();
  const rows = await db.select().from(t.marketRates).orderBy(desc(t.marketRates.asOf)).limit(30);
  const byKind = (kind: string, symbol?: string) =>
    rows.find((r) => r.kind === kind && (!symbol || r.symbol === symbol));
  const ihsg = byKind("ihsg");
  const gold = byKind("emas");
  const currencies = rows.filter((r) => r.kind === "kurs");
  const details = (r: (typeof rows)[number] | undefined) =>
    (r?.details ?? {}) as Record<string, number>;
  // Sumber tampilan dibaca dari details.source yang ditulis cron
  // daily-prices (Yahoo/COMEX); baris seed lama tidak punya field ini dan
  // memakai label lama (Antam/BCA) sebagai fallback — tanpa ini halaman
  // kurs menampilkan nilai baru dengan label lama yang salah (butir 16).
  const detailStr = (r: (typeof rows)[number] | undefined, key: string): string | undefined => {
    const d = (r?.details ?? {}) as Record<string, unknown>;
    return typeof d[key] === "string" ? (d[key] as string) : undefined;
  };
  const ihsgD = details(ihsg);
  const goldD = details(gold);
  // fx_fetched_at = as_of baris terbaru yang benar-benar ada di DB (bukan
  // "sekarang" — sebelumnya memakai new Date() sehingga halaman kurs selalu
  // tampak baru padahal datanya 17 Nov — bug 19 Nov 2026).
  const fxFetchedAt = (rows[0]?.asOf ?? new Date()).toISOString();
  return {
    ihsg: {
      value: Number(ihsg?.value ?? 0), change: ihsgD.change ?? 0, percent: ihsgD.percent ?? 0,
      as_of: (ihsg?.asOf ?? new Date()).toISOString(), source: detailStr(ihsg, "source") ?? "Bursa Efek Indonesia",
      fetched_at: new Date().toISOString(),
    },
    gold: {
      price_1g: Number(gold?.value ?? 0), previous: goldD.previous ?? 0,
      date: (gold?.asOf ?? new Date()).toISOString().slice(0, 10),
      source: detailStr(gold, "source") ?? "Antam", fetched_at: new Date().toISOString(),
    },
    currencies: currencies.map((r) => {
      const d = details(r);
      const v = Number(r.value);
      return {
        code: r.symbol, buy_erate: d.buy_erate ?? v, sell_erate: d.sell_erate ?? v,
        buy_tt: d.buy_tt ?? v, sell_tt: d.sell_tt ?? v,
        buy_bn: d.buy_bn ?? v, sell_bn: d.sell_bn ?? v,
      };
    }),
    fx_source: detailStr(currencies[0], "source") ?? "BCA",
    fx_fetched_at: fxFetchedAt,
  };
}

// Lowongan publik selalu dari web/src/data/loker.json (kurasi tim Career),
// bukan dari job_listings di Supabase. Tabel DB masih diisi seed lama (sumber
// jadi "Sumber eksternal") dan tidak ikut refresh harian Career. Lihat
// web/src/data/README.md.
export async function listJobs(opts: { q?: string; region?: string } = {}): Promise<JobListing[]> {
  return listJobsFromJson(opts);
}

export function getJobsUpdatedAt(): string {
  return getJobsUpdatedAtFromJson();
}


export async function listProducts() {
  if (useSeed()) return seed.listProducts();
  const db = getDb();
  const rows = await db.select().from(t.digitalProducts)
    .where(eq(t.digitalProducts.active, true)).orderBy(asc(t.digitalProducts.name));
  // Katalog saja — TANPA logika lisensi (audit K1; arsitektur §1).
  return rows.map((r) => ({
    id: r.id, name: r.name, tag: r.slug, desc: r.description ?? "",
    price: IDR(r.priceCents), was_price: null, price_note: "", badge: null,
  }));
}

export async function listServices() {
  if (useSeed()) return seed.listServices();
  const db = getDb();
  const rows = await db.select().from(t.services)
    .where(eq(t.services.active, true)).orderBy(asc(t.services.sortOrder));
  return rows.map((r) => ({
    id: r.id, name: r.title, desc: r.description ?? "",
    price_from: IDR(r.priceFromCents), price_note: "", features: [] as string[],
  }));
}

/** Info statis Kedai (bukan di DB) + menu dari DB. */
export async function getKedai(): Promise<Kedai> {
  const seedKedai = await seed.getKedai();
  if (useSeed()) return seedKedai;
  const db = getDb();
  const rows = await db.select().from(t.kedaiMenuItems)
    .where(eq(t.kedaiMenuItems.available, true)).orderBy(asc(t.kedaiMenuItems.category), asc(t.kedaiMenuItems.name));
  return {
    ...seedKedai,
    menu: rows.map((r) => ({
      id: r.id, name: r.name, desc: "", price: r.priceCents > 0 ? IDR(r.priceCents) : null,
      category: r.category ?? "", available: r.available,
      isExample: r.priceCents === 0, // harga 0 = contoh, belum ada harga asli (build-log M2)
    })),
  };
}
