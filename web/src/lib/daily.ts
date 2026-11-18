// Info harian + budaya (arsitektur §3.8, M5) — baca dari cache
// daily_info_snapshots yang diisi cron daily-info-fetch. Tanpa cache (cron
// belum pernah jalan), kembalikan null + label "belum tersedia" — JANGAN
// fetch sumber publik per request (arsitektur §4, rate limit).
import { and, desc, eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "./db";
import * as t from "./db/schema";
import * as seed from "./data-seed";
import type { CultureStory } from "./types";

export type DailySource = "weather" | "prayer" | "fuel" | "transport" | "earthquake" | "air";

export async function getDailySnapshot(source: DailySource, scopeKey = "belitung") {
  if (!isDbConfigured()) return null;
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db.select().from(t.dailyInfoSnapshots)
    .where(and(eq(t.dailyInfoSnapshots.source, source), eq(t.dailyInfoSnapshots.scopeKey, scopeKey)))
    .orderBy(desc(t.dailyInfoSnapshots.asOfDate)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    source: row.source, scope_key: row.scopeKey, as_of: row.asOfDate,
    payload: row.payload, fetched_at: row.fetchedAt.toISOString(),
    stale: row.asOfDate < today,
  };
}

/** Daftar cerita budaya. Tanpa DB: seed 5 cerita asli KB situs lama
 * (M5 — lihat data-seed.ts CULTURE_STORIES_SEED). */
export async function listCulture(category?: string): Promise<CultureStory[]> {
  if (!isDbConfigured()) return seed.listCultureStories(category);
  const db = getDb();
  const rows = await db.select().from(t.cultureStories)
    .where(category ? eq(t.cultureStories.category, category as (typeof t.cultureStories.$inferSelect)["category"]) : undefined)
    .orderBy(desc(t.cultureStories.createdAt));
  return rows.map((r) => ({
    id: r.id, slug: r.slug, category: r.category as CultureStory["category"],
    title: r.title, body: r.body, lyrics: r.lyrics ?? null,
    sources: Array.isArray(r.sources) ? (r.sources as string[]) : [],
    created_at: r.createdAt.toISOString(),
  }));
}

export async function getCultureStory(slug: string): Promise<CultureStory | null> {
  if (!isDbConfigured()) return seed.getCultureStory(slug);
  const db = getDb();
  const rows = await db.select().from(t.cultureStories).where(eq(t.cultureStories.slug, slug)).limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id, slug: r.slug, category: r.category as CultureStory["category"],
    title: r.title, body: r.body, lyrics: r.lyrics ?? null,
    sources: Array.isArray(r.sources) ? (r.sources as string[]) : [],
    created_at: r.createdAt.toISOString(),
  };
}

/** Nomor darurat Belitung — data statis iTAP (bukan dari sumber eksternal). */
export const EMERGENCY_NUMBERS = [
  { name: "Polres Belitung", number: "110" },
  { name: "Damkar Belitung", number: "113" },
  { name: "Ambulans / RSUD dr. H. Marsidi Judono", number: "118" },
  { name: "SAR / Basarnas Belitung", number: "115" },
  { name: "PLN Belitung", number: "123" },
] as const;
