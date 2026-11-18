// Drizzle schema — cerminan replica/schema.sql (migrasi pertama).
// schema.sql tetap sumber kebenaran; bila skema berubah, ubah schema.sql
// dulu, lalu sesuaikan file ini + buat migrasi baru di drizzle/.
// Kolom tambahan dari migrasi 0003 (articles.source_url/external,
// daily_prices.unit, market_rates.details) ditandai di bawah.
import {
  boolean, date, doublePrecision, index, integer, jsonb, numeric,
  pgEnum, pgTable, text, timestamp, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRole = pgEnum("user_role", ["reader", "contributor", "admin_portal", "superadmin"]);
export const articleChannel = pgEnum("article_channel", ["berita", "kuliner", "wisata", "sejarah", "budaya", "legenda"]);
export const articleStatus = pgEnum("article_status", ["draft", "review", "published", "unpublished", "returned"]);
export const commentStatus = pgEnum("comment_status", ["pending", "approved", "rejected"]);
export const listingStatus = pgEnum("listing_status", ["aktif", "terjual", "dinonaktifkan", "dihapus"]);
export const bookmarkType = pgEnum("bookmark_type", ["save", "like"]);
export const reportTarget = pgEnum("report_target", ["listing", "account", "comment"]);
export const reportStatus = pgEnum("report_status", ["open", "reviewed", "hidden", "dismissed"]);
export const moderationAction = pgEnum("moderation_action", ["sensor", "hold"]);
export const verificationStatus = pgEnum("verification_status", ["unverified", "pending", "verified"]);
export const contributionSource = pgEnum("contribution_source", ["article", "info"]);
export const infoStatus = pgEnum("info_status", ["pending", "approved", "rejected"]);
export const cultureCategory = pgEnum("culture_category", ["upacara", "tari_musik", "lagu", "kuliner_tradisi", "cerita_rakyat", "bahasa", "sejarah_timah"]);
export const jobStatus = pgEnum("job_status", ["open", "closed"]);
export const marketKind = pgEnum("market_kind", ["kurs", "ihsg", "emas"]);

const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  email: text("email").notNull(),
  displayName: text("display_name"),
  role: userRole("role").notNull().default("reader"),
  whatsappNumber: text("whatsapp_number"),
  whatsappVerifiedAt: timestamp("whatsapp_verified_at", { withTimezone: true }),
  languagePref: text("language_pref").notNull().default("id"),
  locationName: text("location_name"),
  locationLat: doublePrecision("location_lat"),
  locationLng: doublePrecision("location_lng"),
  institution: text("institution"),
  address: text("address"),
  marketplaceRulesAcceptedAt: timestamp("marketplace_rules_accepted_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const categories = pgTable("categories", {
  id: id(),
  channel: articleChannel("channel").notNull(),
  nameId: text("name_id").notNull(),
  nameEn: text("name_en"),
  slug: text("slug").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("categories_slug_per_channel").on(t.channel, t.slug)]);

export const articles = pgTable("articles", {
  id: id(),
  authorId: uuid("author_id").notNull(),
  categoryId: uuid("category_id"),
  channel: articleChannel("channel").notNull(),
  slug: text("slug").notNull(),
  titleId: text("title_id").notNull(),
  titleEn: text("title_en"),
  bodyId: text("body_id").notNull(), // paragraf dipisah "\n\n" (UI memakai string[])
  bodyEn: text("body_en"),
  gallery: jsonb("gallery").notNull().default([]),
  locationName: text("location_name"),
  locationLat: doublePrecision("location_lat"),
  locationLng: doublePrecision("location_lng"),
  source: text("source"),
  sourceUrl: text("source_url"), // migrasi 0003 (seed punya source_url)
  external: boolean("external").notNull().default(false), // migrasi 0003 (agregasi media lain)
  status: articleStatus("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  views: integer("views").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex("articles_slug_per_channel").on(t.channel, t.slug),
  index("articles_channel_status").on(t.channel, t.status, t.publishedAt),
  index("articles_author_status").on(t.authorId, t.status),
]);

export const articleRevisions = pgTable("article_revisions", {
  id: id(),
  articleId: uuid("article_id").notNull(),
  editorId: uuid("editor_id"),
  changes: jsonb("changes").notNull().default({}),
  note: text("note"),
  createdAt: createdAt(),
}, (t) => [index("revisions_article_created").on(t.articleId, t.createdAt)]);

export const comments = pgTable("comments", {
  id: id(),
  articleId: uuid("article_id").notNull(),
  userId: uuid("user_id").notNull(),
  text: text("text").notNull(),
  status: commentStatus("status").notNull().default("pending"),
  sentimentLabel: text("sentiment_label"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("comments_article_status").on(t.articleId, t.status, t.createdAt)]);

export const cultureStories = pgTable("culture_stories", {
  id: id(),
  category: cultureCategory("category").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  lyrics: text("lyrics"),
  sources: jsonb("sources").notNull().default([]),
  slug: text("slug").notNull().unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const listings = pgTable("listings", {
  id: id(),
  sellerId: uuid("seller_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull().default(0),
  currency: text("currency").notNull().default("IDR"),
  locationName: text("location_name"),
  locationLat: doublePrecision("location_lat"),
  locationLng: doublePrecision("location_lng"),
  status: listingStatus("status").notNull().default("aktif"),
  lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true }),
  soldAt: timestamp("sold_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  views: integer("views").notNull().default(0),
  savesCount: integer("saves_count").notNull().default(0),
  likesCount: integer("likes_count").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("listings_status_created").on(t.status, t.createdAt),
  index("listings_seller_status").on(t.sellerId, t.status),
]);

export const listingPhotos = pgTable("listing_photos", {
  id: id(),
  listingId: uuid("listing_id").notNull(),
  storagePath: text("storage_path").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const chatThreads = pgTable("chat_threads", {
  id: id(),
  listingId: uuid("listing_id").notNull(),
  buyerId: uuid("buyer_id").notNull(),
  sellerId: uuid("seller_id").notNull(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("chat_threads_one_per_buyer").on(t.listingId, t.buyerId)]);

export const messages = pgTable("messages", {
  id: id(),
  threadId: uuid("thread_id").notNull(),
  senderId: uuid("sender_id").notNull(),
  text: text("text").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("messages_thread_created").on(t.threadId, t.createdAt)]);

export const bookmarks = pgTable("bookmarks", {
  id: id(),
  userId: uuid("user_id").notNull(),
  listingId: uuid("listing_id").notNull(),
  type: bookmarkType("type").notNull(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("bookmarks_one_per_type").on(t.userId, t.listingId, t.type)]);

export const reports = pgTable("reports", {
  id: id(),
  reporterId: uuid("reporter_id").notNull(),
  targetType: reportTarget("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  reason: text("reason").notNull(),
  status: reportStatus("status").notNull().default("open"),
  moderatorId: uuid("moderator_id"),
  moderatorNote: text("moderator_note"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const blocks = pgTable("blocks", {
  id: id(),
  blockerId: uuid("blocker_id").notNull(),
  blockedId: uuid("blocked_id").notNull(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("blocks_one_pair").on(t.blockerId, t.blockedId)]);

export const moderationWords = pgTable("moderation_words", {
  id: id(),
  word: text("word").notNull().unique(),
  action: moderationAction("action").notNull(),
  createdBy: uuid("created_by"),
  createdAt: createdAt(),
});

export const contributorProfiles = pgTable("contributor_profiles", {
  userId: uuid("user_id").primaryKey(),
  institution: text("institution"),
  address: text("address"),
  verificationStatus: verificationStatus("verification_status").notNull().default("unverified"),
  autoApprove: boolean("auto_approve").notNull().default(false),
  pointsTotal: integer("points_total").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const contributionPoints = pgTable("contribution_points", {
  id: id(),
  userId: uuid("user_id").notNull(),
  sourceType: contributionSource("source_type").notNull(),
  sourceId: uuid("source_id").notNull(),
  points: integer("points").notNull().default(1),
  awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("contribution_points_one_per_source").on(t.sourceType, t.sourceId)]);

export const infoSubmissions = pgTable("info_submissions", {
  id: id(),
  userId: uuid("user_id").notNull(),
  text: text("text").notNull(),
  status: infoStatus("status").notNull().default("pending"),
  curatedForAi: boolean("curated_for_ai").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const devices = pgTable("devices", {
  id: id(),
  userId: uuid("user_id").notNull(),
  fcmToken: text("fcm_token").notNull(),
  platform: text("platform").notNull(), // android | ios | web
  language: text("language").notNull().default("id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("devices_one_token_per_user").on(t.userId, t.fcmToken)]);

export const itineraries = pgTable("itineraries", {
  id: id(),
  userId: uuid("user_id").notNull(),
  title: text("title"),
  days: jsonb("days").notNull().default([]),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const aiConversations = pgTable("ai_conversations", {
  id: id(),
  userId: uuid("user_id").notNull(),
  messages: jsonb("messages").notNull().default([]),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const aiFeedback = pgTable("ai_feedback", {
  id: id(),
  userId: uuid("user_id").notNull(),
  conversationId: uuid("conversation_id"),
  vote: integer("vote").notNull(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("ai_feedback_one_per_conversation").on(t.userId, t.conversationId)]);

export const dailyInfoSnapshots = pgTable("daily_info_snapshots", {
  id: id(),
  source: text("source").notNull(), // weather | prayer | fuel | transport | earthquake | air
  scopeKey: text("scope_key").notNull().default("belitung"),
  asOfDate: date("as_of_date").notNull(),
  payload: jsonb("payload").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("daily_info_one_per_day").on(t.source, t.scopeKey, t.asOfDate)]);

export const dailyPrices = pgTable("daily_prices", {
  id: id(),
  commodity: text("commodity").notNull(),
  priceCents: integer("price_cents").notNull().default(0),
  currency: text("currency").notNull().default("IDR"),
  market: text("market"),
  unit: text("unit"), // migrasi 0003 (seed punya satuan, mis. "kg")
  priceDate: date("price_date").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("daily_prices_one_per_day").on(t.commodity, t.market, t.priceDate)]);

export const marketRates = pgTable("market_rates", {
  id: id(),
  kind: marketKind("kind").notNull(),
  symbol: text("symbol").notNull(),
  value: numeric("value").notNull(),
  currency: text("currency").notNull().default("IDR"),
  details: jsonb("details"), // migrasi 0003: rincian BCA {buy_erate, sell_erate, ...} / IHSG {change, percent}
  asOf: timestamp("as_of", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const jobListings = pgTable("job_listings", {
  id: id(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  salaryMinCents: integer("salary_min_cents"),
  salaryMaxCents: integer("salary_max_cents"),
  currency: text("currency").notNull().default("IDR"),
  deadline: date("deadline"),
  sourceUrl: text("source_url"),
  status: jobStatus("status").notNull().default("open"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const digitalProducts = pgTable("digital_products", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  priceCents: integer("price_cents").notNull().default(0),
  currency: text("currency").notNull().default("IDR"),
  fileUrl: text("file_url"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const services = pgTable("services", {
  id: id(),
  title: text("title").notNull(),
  description: text("description"),
  priceFromCents: integer("price_from_cents"),
  currency: text("currency").notNull().default("IDR"),
  ctaUrl: text("cta_url"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const kedaiMenuItems = pgTable("kedai_menu_items", {
  id: id(),
  name: text("name").notNull(),
  category: text("category"),
  priceCents: integer("price_cents").notNull().default(0),
  currency: text("currency").notNull().default("IDR"),
  available: boolean("available").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// CHECK constraints yang hidup di SQL (drizzle tidak memodelkan semuanya):
// - profiles.language_pref in ('id','en'); devices.platform in ('android','ios','web')
// - views/saves/likes/points >= 0; ai_feedback.vote in (-1, 1)
// - daily_info_snapshots.source in (...); chat_threads.buyer <> seller; blocks no-self
