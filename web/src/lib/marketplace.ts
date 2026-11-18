// Marketplace + chat + moderasi (arsitektur §3.6, §3.7, F03–F08) — DB nyata.
// Dipakai route /api/listings*, /api/threads*, /api/me/*, /api/admin/*.
// Detail privat (kontak penjual, koordinat) TIDAK pernah dikembalikan ke
// publik — hanya ke pembeli terverifikasi / pemilik / admin (masking di sini,
// bukan di RLS kolom — arsitektur §2).
import { and, desc, eq, or, sql } from "drizzle-orm";
import { getDb, isDbConfigured } from "./db";
import * as t from "./db/schema";
import { can, type SessionProfile } from "./auth";

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
  seller_id?: string; description?: string | null;
  seller_contact?: string | null; location_lat?: number | null; location_lng?: number | null;
  photos?: { storage_path: string; sort_order: number }[];
}

function toListing(
  row: typeof t.listings.$inferSelect,
  full: boolean,
  sellerContact?: string | null,
  photos: { storage_path: string; sort_order: number }[] = [],
): ListingPublic {
  const base: ListingPublic = {
    id: row.id, title: row.title, price_cents: row.priceCents, currency: row.currency,
    location_name: row.locationName, status: row.status, views: row.views,
    saves_count: row.savesCount, likes_count: row.likesCount,
    created_at: row.createdAt.toISOString(), photos,
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

export async function listListings(opts: { q?: string; page?: number; perPage?: number } = {}) {
  // Tanpa DATABASE_URL (P1 belum ada) tidak ada listing di seed — kembalikan
  // daftar kosong yang jujur, BUKAN 500 (BUG-001). Sebelum perbaikan, needDb()
  // melempar di sini sehingga GET /api/listings publik selalu 500 di env seed.
  if (!isDbConfigured()) return [];
  const db = getDb();
  const conds = [eq(t.listings.status, "aktif")];
  if (opts.q) conds.push(sql`${t.listings.title} ilike ${"%" + opts.q + "%"}`);
  const rows = await db.select().from(t.listings)
    .where(and(...conds)).orderBy(desc(t.listings.createdAt))
    .limit(opts.perPage ?? 20).offset(((opts.page ?? 1) - 1) * (opts.perPage ?? 20));
  return rows.map((r) => toListing(r, false));
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
    photos.map((p) => ({ storage_path: p.storagePath, sort_order: p.sortOrder })));
}

export async function createListing(profile: SessionProfile, data: {
  title: string; description?: string; price_cents: number;
  location_name?: string; location_lat?: number | null; location_lng?: number | null;
}) {
  const db = needDb();
  if (!can(profile, "listing.create")) {
    throw new Error("FORBIDDEN: pasang penawaran butuh email + WhatsApp terverifikasi + aturan disetujui (F04).");
  }
  const inserted = await db.insert(t.listings).values({
    sellerId: profile.id, title: data.title, description: data.description ?? "",
    priceCents: data.price_cents, locationName: data.location_name ?? null,
    locationLat: data.location_lat ?? null, locationLng: data.location_lng ?? null,
    status: "aktif", lastConfirmedAt: new Date(),
  }).returning();
  return toListing(inserted[0], true);
}

export async function updateListing(profile: SessionProfile, id: string, patch: Partial<{
  title: string; description: string; price_cents: number; location_name: string;
}>) {
  const db = needDb();
  const rows = await db.select().from(t.listings).where(eq(t.listings.id, id)).limit(1);
  if (!rows[0]) throw new Error("NOT_FOUND");
  if (!can(profile, "listing.edit", { ownerId: rows[0].sellerId })) throw new Error("FORBIDDEN");
  // Transisi status terjual -> aktif dijaga trigger DB; edit biasa tidak ubah status.
  const updated = await db.update(t.listings).set({
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
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
    if (l) out.push(l);
  }
  return out;
}

// --- Chat (F06) ---------------------------------------------------------------

export async function createThread(profile: SessionProfile, listingId: string) {
  const db = needDb();
  if (!can(profile, "thread.create")) {
    throw new Error("FORBIDDEN: chat butuh email + WhatsApp terverifikasi.");
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

export async function listMyThreads(profile: SessionProfile) {
  const db = needDb();
  return db.select().from(t.chatThreads).where(
    or(eq(t.chatThreads.buyerId, profile.id), eq(t.chatThreads.sellerId, profile.id)),
  ).orderBy(desc(t.chatThreads.lastMessageAt), desc(t.chatThreads.createdAt));
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
