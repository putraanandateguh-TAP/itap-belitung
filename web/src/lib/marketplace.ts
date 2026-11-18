// Marketplace + chat + moderasi (arsitektur §3.6, §3.7, F03–F08) — DB nyata.
// Dipakai route /api/listings*, /api/threads*, /api/me/*, /api/admin/*.
// Detail privat (kontak penjual, koordinat) TIDAK pernah dikembalikan ke
// publik — hanya ke pembeli terverifikasi / pemilik / admin (masking di sini,
// bukan di RLS kolom — arsitektur §2).
import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { getDb, isDbConfigured } from "./db";
import * as t from "./db/schema";
import { can, type SessionProfile } from "./auth";
import type { Paginated } from "./types";

function needDb() {
  if (!isDbConfigured()) {
    throw new Error("DATABASE_URL belum diisi — marketplace butuh Supabase (P1).");
  }
  return getDb();
}

export interface ListingPublic {
  id: string; title: string; price_cents: number; currency: string;
  location_name: string | null; status: string; views: number;
  saves_count: number; likes_count: number; created_at: string;
  category?: string;
  seller_id?: string; description?: string | null;
  seller_contact?: string | null; location_lat?: number | null; location_lng?: number | null;
  photos?: { storage_path: string; sort_order: number }[];
  bookmark_type?: "save" | "like";
  // A4 (M8) — kepercayaan penjual, dari data profil ASLI (bukan karangan):
  // verifikasi WhatsApp hanya bisa dibaca dari profiles.whatsappVerifiedAt;
  // status email penjual lain TIDAK bisa dibaca lapisan aplikasi (hanya ada
  // di auth.users), jadi TIDAK ada klaim "terverifikasi email+WA" di sini —
  // badge yang tampil hanya "WhatsApp terverifikasi" bila memang ada
  // whatsappVerifiedAt. Umur akun + jumlah penawaran aktif dari data nyata.
  seller_whatsapp_verified?: boolean;
  seller_since?: string | null;
  seller_active_listings?: number;
}

export interface SellerTrust {
  whatsappVerified: boolean;
  since: string | null;
  activeListings: number;
}

async function sellerTrust(db: ReturnType<typeof getDb>, sellerId: string): Promise<SellerTrust> {
  const profs = await db.select().from(t.profiles).where(eq(t.profiles.id, sellerId)).limit(1);
  const counted = await db.select({ n: sql<number>`count(*)` }).from(t.listings)
    .where(and(eq(t.listings.sellerId, sellerId), eq(t.listings.status, "aktif")));
  const p = profs[0];
  return {
    whatsappVerified: Boolean(p?.whatsappVerifiedAt),
    since: p?.createdAt?.toISOString() ?? null,
    activeListings: Number(counted[0]?.n ?? 0),
  };
}

function toListing(
  row: typeof t.listings.$inferSelect,
  full: boolean,
  sellerContact?: string | null,
  photos: { storage_path: string; sort_order: number }[] = [],
  trust?: SellerTrust,
): ListingPublic {
  const base: ListingPublic = {
    id: row.id, title: row.title, price_cents: row.priceCents, currency: row.currency,
    location_name: row.locationName, status: row.status, views: row.views,
    saves_count: row.savesCount, likes_count: row.likesCount,
    created_at: row.createdAt.toISOString(), category: row.category, photos,
    seller_whatsapp_verified: trust?.whatsappVerified,
    seller_since: trust?.since ?? null,
    seller_active_listings: trust?.activeListings,
  };
  if (full) {
    base.seller_id = row.sellerId;
    base.description = row.description;
    base.seller_contact = sellerContact ?? null;
    base.location_lat = row.locationLat;
    base.location_lng = row.locationLng;
  }
  return base;
}

async function sellerContact(db: ReturnType<typeof getDb>, sellerId: string): Promise<string | null> {
  const rows = await db.select().from(t.profiles).where(eq(t.profiles.id, sellerId)).limit(1);
  return rows[0]?.whatsappNumber ?? null;
}

export type ListingSort = "terbaru" | "termurah" | "termahal" | "terpopuler";

export async function listListings(opts: {
  q?: string; category?: string; sort?: ListingSort; page?: number; perPage?: number;
} = {}): Promise<Paginated<ListingPublic>> {
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(50, Math.max(1, opts.perPage ?? 20));
  const empty: Paginated<ListingPublic> = { items: [], page, per_page: perPage, total: 0, total_pages: 0 };
  // Tanpa DATABASE_URL (P1 belum ada) tidak ada listing di seed — kembalikan
  // daftar kosong yang jujur, BUKAN 500 (BUG-001). Sebelum perbaikan, needDb()
  // melempar di sini sehingga GET /api/listings publik selalu 500 di env seed.
  if (!isDbConfigured()) return empty;
  const db = getDb();
  const conds = [eq(t.listings.status, "aktif")];
  if (opts.q) conds.push(sql`${t.listings.title} ilike ${"%" + opts.q + "%"}`);
  if (opts.category) conds.push(eq(t.listings.category, opts.category));
  const where = and(...conds);
  const order = opts.sort === "termurah" ? asc(t.listings.priceCents)
    : opts.sort === "termahal" ? desc(t.listings.priceCents)
    : opts.sort === "terpopuler" ? desc(t.listings.views)
    : desc(t.listings.createdAt);
  const [rows, counted] = await Promise.all([
    db.select().from(t.listings).where(where).orderBy(order)
      .limit(perPage).offset((page - 1) * perPage),
    db.select({ n: sql<number>`count(*)` }).from(t.listings).where(where),
  ]);
  const total = Number(counted[0]?.n ?? 0);
  return {
    items: rows.map((r) => toListing(r, false)),
    page, per_page: perPage, total,
    total_pages: total === 0 ? 0 : Math.ceil(total / perPage),
  };
}

export async function getListing(id: string, profile?: SessionProfile | null) {
  // Lihat listListings (BUG-001): tanpa DB tidak ada listing -> null (404 di
  // route), bukan 500.
  if (!isDbConfigured()) return null;
  const db = getDb();
  const rows = await db.select().from(t.listings).where(eq(t.listings.id, id)).limit(1);
  const row = rows[0];
  if (!row) return null;
  const full = Boolean(
    profile && (profile.id === row.sellerId || profile.verified || profile.role === "admin_portal" || profile.role === "superadmin"),
  );
  if (row.status === "aktif" && full) {
    await db.execute(sql`select public.increment_listing_views(${row.id})`).catch(() => undefined);
    row.views += 1;
  }
  const photos = await db.select().from(t.listingPhotos)
    .where(eq(t.listingPhotos.listingId, id)).orderBy(t.listingPhotos.sortOrder);
  return toListing(row, full,
    full ? await sellerContact(db, row.sellerId) : null,
    photos.map((p) => ({ storage_path: p.storagePath, sort_order: p.sortOrder })),
    await sellerTrust(db, row.sellerId));
}

export async function createListing(profile: SessionProfile, data: {
  title: string; description?: string; category?: string; price_cents: number;
  location_name?: string; location_lat?: number | null; location_lng?: number | null;
}) {
  const db = needDb();
  if (!can(profile, "listing.create")) {
    throw new Error("FORBIDDEN: pasang penawaran butuh email terverifikasi + aturan marketplace disetujui (F04). Verifikasi WhatsApp belum tersedia (P2) dan bukan syarat saat ini.");
  }
  // Penahanan otomatis kamus kata (F08): kata "sensor" disamarkan di judul/
  // deskripsi; kata "hold" menahan listing (status "dinonaktifkan" — tidak
  // tampil publik sampai redaksi mengaktifkan lagi lewat /api/admin/listings).
  // Mode seed: pemeriksaan dilewati (kamus tidak bisa dibaca tanpa DB).
  const { applySensor, checkModerationWords } = await import("./moderation");
  const check = await checkModerationWords(`${data.title}\n${data.description ?? ""}`);
  let title = data.title;
  let description = data.description ?? "";
  if (check.match?.action === "sensor") {
    title = await applySensor(title);
    description = await applySensor(description);
  }
  const status = check.match?.action === "hold" ? "dinonaktifkan" : "aktif";
  const inserted = await db.insert(t.listings).values({
    sellerId: profile.id, title, description,
    category: data.category ?? "lainnya",
    priceCents: data.price_cents, locationName: data.location_name ?? null,
    locationLat: data.location_lat ?? null, locationLng: data.location_lng ?? null,
    status, lastConfirmedAt: new Date(),
  }).returning();
  return toListing(inserted[0], true);
}

/**
 * Aksi admin atas satu listing (S22): nonaktifkan (tahan dari publik) atau
 * aktifkan lagi. Trigger DB melarang terjual -> aktif dan dihapus -> aktif
 * (>14 hari), jadi "activate" hanya berhasil untuk listing dinonaktifkan.
 */
export async function moderateListing(profile: SessionProfile, id: string, action: "activate" | "disable") {
  const db = needDb();
  if (!can(profile, "listing.moderate")) {
    throw new Error("FORBIDDEN: moderasi listing hanya redaksi.");
  }
  const rows = await db.select().from(t.listings).where(eq(t.listings.id, id)).limit(1);
  if (!rows[0]) throw new Error("NOT_FOUND: penawaran tidak ditemukan.");
  const updated = await db.update(t.listings)
    .set({ status: action === "activate" ? "aktif" : "dinonaktifkan" })
    .where(eq(t.listings.id, id)).returning();
  return toListing(updated[0], true);
}

/** Catat foto yang sudah diunggah ke Storage bucket `listing-photos` (maks 5). */
export async function addListingPhotos(profile: SessionProfile, listingId: string, paths: string[]) {
  const db = needDb();
  if (!Array.isArray(paths) || paths.length === 0 || paths.length > 5) {
    throw new Error("CONFLICT: kirim 1–5 path foto.");
  }
  const rows = await db.select().from(t.listings).where(eq(t.listings.id, listingId)).limit(1);
  if (!rows[0]) throw new Error("NOT_FOUND");
  if (!can(profile, "listing.edit", { ownerId: rows[0].sellerId })) throw new Error("FORBIDDEN");
  // Path Storage harus di folder penjual sendiri (<user_id>/...) — sesuai policy bucket.
  for (const p of paths) {
    if (typeof p !== "string" || !p.startsWith(`${profile.id}/`) || p.includes("..")) {
      throw new Error("CONFLICT: path foto tidak valid.");
    }
  }
  const existing = await db.select().from(t.listingPhotos).where(eq(t.listingPhotos.listingId, listingId));
  if (existing.length + paths.length > 5) throw new Error("CONFLICT: maksimal 5 foto per penawaran.");
  const start = existing.length;
  await db.insert(t.listingPhotos).values(
    paths.map((p, i) => ({ listingId, storagePath: p, sortOrder: start + i })),
  );
}

export async function updateListing(profile: SessionProfile, id: string, patch: Partial<{
  title: string; description: string; category: string; price_cents: number; location_name: string;
}>) {
  const db = needDb();
  const rows = await db.select().from(t.listings).where(eq(t.listings.id, id)).limit(1);
  if (!rows[0]) throw new Error("NOT_FOUND");
  if (!can(profile, "listing.edit", { ownerId: rows[0].sellerId })) throw new Error("FORBIDDEN");
  // Transisi status terjual -> aktif dijaga trigger DB; edit biasa tidak ubah status.
  const updated = await db.update(t.listings).set({
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.category !== undefined ? { category: patch.category } : {}),
    ...(patch.price_cents !== undefined ? { priceCents: patch.price_cents } : {}),
    ...(patch.location_name !== undefined ? { locationName: patch.location_name } : {}),
  }).where(eq(t.listings.id, id)).returning();
  return toListing(updated[0], true);
}

/** Atomic: hanya listing aktif yang bisa ditandai terjual (race §4). */
export async function markListingSold(profile: SessionProfile, id: string) {
  const db = needDb();
  const rows = await db.select().from(t.listings).where(eq(t.listings.id, id)).limit(1);
  if (!rows[0]) throw new Error("NOT_FOUND");
  if (!can(profile, "listing.edit", { ownerId: rows[0].sellerId })) throw new Error("FORBIDDEN");
  const updated = await db.update(t.listings)
    .set({ status: "terjual", soldAt: new Date() })
    .where(and(eq(t.listings.id, id), eq(t.listings.status, "aktif"))).returning();
  if (!updated[0]) throw new Error("CONFLICT: listing sudah tidak aktif.");
  return toListing(updated[0], true);
}

export async function confirmListing(profile: SessionProfile, id: string) {
  const db = needDb();
  const rows = await db.select().from(t.listings).where(eq(t.listings.id, id)).limit(1);
  if (!rows[0]) throw new Error("NOT_FOUND");
  if (!can(profile, "listing.edit", { ownerId: rows[0].sellerId })) throw new Error("FORBIDDEN");
  const updated = await db.update(t.listings).set({ lastConfirmedAt: new Date() })
    .where(eq(t.listings.id, id)).returning();
  return toListing(updated[0], true);
}

export async function softDeleteListing(profile: SessionProfile, id: string) {
  const db = needDb();
  const rows = await db.select().from(t.listings).where(eq(t.listings.id, id)).limit(1);
  if (!rows[0]) throw new Error("NOT_FOUND");
  if (!can(profile, "listing.edit", { ownerId: rows[0].sellerId })) throw new Error("FORBIDDEN");
  await db.update(t.listings).set({ status: "dihapus", deletedAt: new Date() })
    .where(eq(t.listings.id, id));
}

export async function restoreListing(profile: SessionProfile, id: string) {
  const db = needDb();
  const rows = await db.select().from(t.listings).where(eq(t.listings.id, id)).limit(1);
  if (!rows[0]) throw new Error("NOT_FOUND");
  if (!can(profile, "listing.edit", { ownerId: rows[0].sellerId })) throw new Error("FORBIDDEN");
  // Batas 14 hari dijaga trigger listing_status_guard.
  const updated = await db.update(t.listings).set({ status: "aktif", deletedAt: null })
    .where(eq(t.listings.id, id)).returning();
  return toListing(updated[0], true);
}

export async function listMyListings(profile: SessionProfile) {
  const db = needDb();
  const rows = await db.select().from(t.listings)
    .where(eq(t.listings.sellerId, profile.id)).orderBy(desc(t.listings.createdAt));
  return rows.map((r) => toListing(r, true));
}

export async function setBookmark(profile: SessionProfile, listingId: string, type: "save" | "like") {
  const db = needDb();
  await db.insert(t.bookmarks).values({ userId: profile.id, listingId, type })
    .onConflictDoNothing();
  // Counter naik 1 (best-effort; angka pasti bisa dihitung ulang dari bookmarks).
  if (type === "save") {
    await db.update(t.listings).set({ savesCount: sql`${t.listings.savesCount} + 1` })
      .where(eq(t.listings.id, listingId)).catch(() => undefined);
  } else {
    await db.update(t.listings).set({ likesCount: sql`${t.listings.likesCount} + 1` })
      .where(eq(t.listings.id, listingId)).catch(() => undefined);
  }
}

export async function removeBookmark(profile: SessionProfile, listingId: string, type: "save" | "like") {
  const db = needDb();
  await db.delete(t.bookmarks).where(and(
    eq(t.bookmarks.userId, profile.id),
    eq(t.bookmarks.listingId, listingId),
    eq(t.bookmarks.type, type),
  ));
}

export async function listSaved(profile: SessionProfile) {
  const db = needDb();
  const rows = await db.select().from(t.bookmarks)
    .where(eq(t.bookmarks.userId, profile.id)).orderBy(desc(t.bookmarks.createdAt));
  const out: ListingPublic[] = [];
  for (const b of rows) {
    const l = await getListing(b.listingId, profile);
    if (l) out.push({ ...l, bookmark_type: b.type });
  }
  return out;
}

// --- Chat (F06) ---------------------------------------------------------------

export async function createThread(profile: SessionProfile, listingId: string) {
  const db = needDb();
  if (!can(profile, "thread.create")) {
    throw new Error("FORBIDDEN: chat butuh email terverifikasi.");
  }
  const listings = await db.select().from(t.listings).where(eq(t.listings.id, listingId)).limit(1);
  const listing = listings[0];
  if (!listing) throw new Error("NOT_FOUND");
  if (listing.sellerId === profile.id) throw new Error("CONFLICT: tidak bisa chat dengan diri sendiri.");
  // Trigger thread_listing_active_guard menolak listing tidak aktif.
  const inserted = await db.insert(t.chatThreads).values({
    listingId, buyerId: profile.id, sellerId: listing.sellerId,
  }).onConflictDoNothing().returning();
  if (inserted[0]) return inserted[0];
  const existing = await db.select().from(t.chatThreads).where(and(
    eq(t.chatThreads.listingId, listingId), eq(t.chatThreads.buyerId, profile.id),
  )).limit(1);
  return existing[0];
}

export interface ThreadSummary {
  id: string; listing_id: string; listing_title: string; listing_price_cents: number;
  listing_status: string; buyer_id: string; seller_id: string; other_user_id: string;
  is_seller: boolean; last_message_at: string | null; last_message_text: string | null;
  created_at: string;
  // A4 (M8): kepercayaan lawan bicara — WhatsApp terverifikasi + sejak kapan
  // bergabung, dari profiles (data asli; email lawan bicara tidak terbaca di
  // lapisan aplikasi, jadi tidak diklaim).
  other_user_whatsapp_verified: boolean;
  other_user_since: string | null;
}

/** Inbox: thread + ringkasan barang + cuplikan pesan terakhir. */
export async function listMyThreads(profile: SessionProfile): Promise<ThreadSummary[]> {
  const db = needDb();
  const threads = await db.select().from(t.chatThreads).where(
    or(eq(t.chatThreads.buyerId, profile.id), eq(t.chatThreads.sellerId, profile.id)),
  ).orderBy(desc(t.chatThreads.lastMessageAt), desc(t.chatThreads.createdAt));
  const profs = await db.select().from(t.profiles);
  const profById = new Map(profs.map((p) => [p.id, p]));
  const out: ThreadSummary[] = [];
  for (const th of threads) {
    const listing = await db.select().from(t.listings).where(eq(t.listings.id, th.listingId)).limit(1);
    const last = await db.select().from(t.messages).where(eq(t.messages.threadId, th.id))
      .orderBy(desc(t.messages.createdAt)).limit(1);
    const otherId = th.buyerId === profile.id ? th.sellerId : th.buyerId;
    const other = profById.get(otherId);
    out.push({
      id: th.id,
      listing_id: th.listingId,
      listing_title: listing[0]?.title ?? "Penawaran tidak tersedia",
      listing_price_cents: listing[0]?.priceCents ?? 0,
      listing_status: listing[0]?.status ?? "dihapus",
      buyer_id: th.buyerId,
      seller_id: th.sellerId,
      other_user_id: otherId,
      is_seller: th.sellerId === profile.id,
      last_message_at: th.lastMessageAt?.toISOString() ?? null,
      last_message_text: last[0]?.text ?? null,
      created_at: th.createdAt.toISOString(),
      other_user_whatsapp_verified: Boolean(other?.whatsappVerifiedAt),
      other_user_since: other?.createdAt?.toISOString() ?? null,
    });
  }
  return out;
}

/** Satu thread + ringkasan barangnya; hanya untuk peserta. */
export async function getThread(profile: SessionProfile, threadId: string): Promise<ThreadSummary | null> {
  const db = needDb();
  const threads = await db.select().from(t.chatThreads).where(eq(t.chatThreads.id, threadId)).limit(1);
  const th = threads[0];
  if (!th) return null;
  if (th.buyerId !== profile.id && th.sellerId !== profile.id) throw new Error("FORBIDDEN: bukan peserta thread.");
  const [summary] = await listMyThreads(profile).then((all) => all.filter((s) => s.id === threadId));
  return summary ?? null;
}

export async function listMessages(profile: SessionProfile, threadId: string) {
  const db = needDb();
  const threads = await db.select().from(t.chatThreads).where(eq(t.chatThreads.id, threadId)).limit(1);
  const th = threads[0];
  if (!th) throw new Error("NOT_FOUND");
  if (th.buyerId !== profile.id && th.sellerId !== profile.id) throw new Error("FORBIDDEN: bukan peserta thread.");
  return db.select().from(t.messages).where(eq(t.messages.threadId, threadId)).orderBy(t.messages.createdAt);
}

export async function sendMessage(profile: SessionProfile, threadId: string, text: string) {
  const db = needDb();
  const threads = await db.select().from(t.chatThreads).where(eq(t.chatThreads.id, threadId)).limit(1);
  const th = threads[0];
  if (!th) throw new Error("NOT_FOUND");
  if (!can(profile, "message.send", { ownerId: th.buyerId === profile.id || th.sellerId === profile.id ? profile.id : null })) {
    throw new Error("FORBIDDEN: bukan peserta thread.");
  }
  const inserted = await db.insert(t.messages).values({
    threadId, senderId: profile.id, text,
  }).returning();
  await db.update(t.chatThreads).set({ lastMessageAt: new Date() }).where(eq(t.chatThreads.id, threadId));
  return inserted[0];
}

// --- Laporan & blokir (F08) ----------------------------------------------------

export async function createReport(profile: SessionProfile, data: { target_type: "listing" | "account" | "comment"; target_id: string; reason: string }) {
  const db = needDb();
  const inserted = await db.insert(t.reports).values({
    reporterId: profile.id, targetType: data.target_type, targetId: data.target_id, reason: data.reason,
  }).returning();
  return inserted[0];
}

export async function blockUser(profile: SessionProfile, blockedId: string) {
  const db = needDb();
  if (blockedId === profile.id) throw new Error("CONFLICT: tidak bisa memblokir diri sendiri.");
  await db.insert(t.blocks).values({ blockerId: profile.id, blockedId }).onConflictDoNothing();
}

export interface BlockRow {
  id: string; blocker_id: string; blocker_name: string;
  blocked_id: string; blocked_name: string; created_at: string;
}

async function toBlockRows(db: ReturnType<typeof getDb>, rows: (typeof t.blocks.$inferSelect)[]): Promise<BlockRow[]> {
  const profs = await db.select().from(t.profiles);
  const nameById = new Map(profs.map((p) => [p.id, p.displayName ?? p.email]));
  return rows.map((r) => ({
    id: r.id, blocker_id: r.blockerId, blocker_name: nameById.get(r.blockerId) ?? "Pengguna",
    blocked_id: r.blockedId, blocked_name: nameById.get(r.blockedId) ?? "Pengguna",
    created_at: r.createdAt.toISOString(),
  }));
}

/** Akun yang SAYA blokir (untuk /pengaturan + tab Blokir redaksi). */
export async function listMyBlocks(profile: SessionProfile): Promise<BlockRow[]> {
  if (!isDbConfigured()) return [];
  const db = getDb();
  const rows = await db.select().from(t.blocks)
    .where(eq(t.blocks.blockerId, profile.id)).orderBy(desc(t.blocks.createdAt));
  return toBlockRows(db, rows);
}

/** Semua blokir di portal (admin saja — untuk tab Blokir redaksi). */
export async function listAllBlocks(profile: SessionProfile): Promise<BlockRow[]> {
  const db = needDb();
  if (!can(profile, "admin.read")) {
    throw new Error("FORBIDDEN: daftar blokir hanya redaksi.");
  }
  const rows = await db.select().from(t.blocks).orderBy(desc(t.blocks.createdAt));
  return toBlockRows(db, rows);
}

/** Buka blokir: pemblokir sendiri atau admin. */
export async function unblockUser(profile: SessionProfile, blockedId: string): Promise<void> {
  const db = needDb();
  const rows = await db.select().from(t.blocks).where(and(
    eq(t.blocks.blockerId, profile.id), eq(t.blocks.blockedId, blockedId),
  )).limit(1);
  if (!rows[0] && !can(profile, "admin.read")) {
    throw new Error("NOT_FOUND: blokir tidak ditemukan.");
  }
  if (rows[0]) {
    await db.delete(t.blocks).where(eq(t.blocks.id, rows[0].id));
  } else {
    // Admin membuka blokir orang lain: hapus semua blokir atas akun itu.
    await db.delete(t.blocks).where(eq(t.blocks.blockedId, blockedId));
  }
}
