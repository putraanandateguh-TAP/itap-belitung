// scripts/seed-via-rest.ts — seed lewat PostgREST (service_role) untuk
// lingkungan tanpa akses Postgres langsung (mis. VM ini, port 5432 diblokir).
// Jalur ini SETARA dengan scripts/seed.ts (Drizzle langsung): data yang sama
// dari src/lib/seed-data.ts, idempotent (upsert + cek-dulu untuk tabel tanpa
// unique constraint). Kunci service_role hanya dipakai di sini (server-side),
// tidak pernah masuk client.
//   SEED_AUTHOR_ID=<uuid profil admin> npx tsx scripts/seed-via-rest.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // dotenv biasa TIDAK memuat .env.local
import {
  ARTICLES, CATEGORIES, DAILY_PRICES, JOBS, KEDAI, MARKET_RATES, PRODUCTS, SERVICES,
} from "../src/lib/seed-data";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AUTHOR = process.env.SEED_AUTHOR_ID ?? "";
if (!URL || !KEY) throw new Error("env Supabase (URL/service_role) belum diisi di .env.local");
if (!AUTHOR) throw new Error("SEED_AUTHOR_ID belum diisi — bootstrap admin dulu");

const BASE = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function rest(method: string, path: string, body?: unknown, prefer?: string): Promise<any> {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    method,
    headers: { ...BASE, ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${String(text).slice(0, 300)}`);
  return data;
}

const enc = (s: string) => encodeURIComponent(s);
// "01-11-2026" -> "2026-11-01"
const ddmmyyyy = (s: string) => { const [d, m, y] = s.split("-"); return `${y}-${m}-${d}`; };

async function exists(table: string, filter: string): Promise<boolean> {
  const rows = await rest("GET", `${table}?select=id&${filter}&limit=1`);
  return Array.isArray(rows) && rows.length > 0;
}

async function main() {
  // 1. Kategori (unique channel+slug -> upsert).
  await rest("POST", "categories?on_conflict=channel,slug",
    CATEGORIES.map((c) => ({ channel: c.channel, name_id: c.name_id, name_en: c.name_en, slug: c.slug })),
    "resolution=merge-duplicates,return=minimal");
  const cats = await rest("GET", "categories?select=id,slug,channel");
  const catId = new Map<string, string>();
  for (const c of cats) catId.set(`${c.channel}:${c.slug}`, c.id);
  console.log(`kategori: ${cats.length}`);

  // 2. Artikel (unique channel+slug -> upsert; butuh author).
  let n = 0;
  for (const a of ARTICLES) {
    await rest("POST", "articles?on_conflict=channel,slug", {
      author_id: AUTHOR,
      category_id: catId.get(`${a.channel}:${a.category_id}`) ?? null,
      channel: a.channel, slug: a.slug,
      title_id: a.title_id, title_en: a.title_en,
      body_id: a.body_id.join("\n\n"),
      body_en: a.body_en ? a.body_en.join("\n\n") : null,
      gallery: a.gallery,
      location_name: a.location_name || null,
      location_lat: a.location_lat, location_lng: a.location_lng,
      source: a.source || null, source_url: a.source_url, external: a.external,
      status: "published",
      published_at: new Date(a.published_at).toISOString(),
      views: a.views,
    }, "resolution=merge-duplicates,return=minimal");
    n++;
  }
  console.log(`artikel: ${n} (published)`);

  // 3. Harga pangan harian (unique commodity+market+price_date -> upsert).
  const priceDate = ddmmyyyy(DAILY_PRICES.source_date);
  await rest("POST", "daily_prices?on_conflict=commodity,market,price_date",
    DAILY_PRICES.items.map((item) => ({
      commodity: item.commodity, price_cents: Math.round(item.price * 100),
      market: DAILY_PRICES.market, unit: item.unit, price_date: priceDate,
    })), "resolution=merge-duplicates,return=minimal");
  console.log(`harga pangan: ${DAILY_PRICES.items.length} komoditas @ ${priceDate}`);

  // 4. Kurs / IHSG / emas — tanpa unique constraint: cek dulu.
  const asOf = new Date("2026-11-17T17:42:00+07:00").toISOString();
  async function insertRateIfAbsent(kind: string, symbol: string, value: string, details: object) {
    if (await exists("market_rates", `kind=eq.${kind}&symbol=eq.${enc(symbol)}`)) return;
    await rest("POST", "market_rates", { kind, symbol, value, as_of: asOf, details });
  }
  await insertRateIfAbsent("ihsg", "IHSG", String(MARKET_RATES.ihsg.value),
    { change: MARKET_RATES.ihsg.change, percent: MARKET_RATES.ihsg.percent });
  await insertRateIfAbsent("emas", "ANTAM-1G", String(MARKET_RATES.gold.price_1g),
    { previous: MARKET_RATES.gold.previous });
  for (const c of MARKET_RATES.currencies) {
    await insertRateIfAbsent("kurs", c.code, String(c.sell_erate), {
      buy_erate: c.buy_erate, sell_erate: c.sell_erate, buy_tt: c.buy_tt,
      sell_tt: c.sell_tt, buy_bn: c.buy_bn, sell_bn: c.sell_bn,
    });
  }
  console.log(`kurs: IHSG + emas + ${MARKET_RATES.currencies.length} mata uang`);

  // 5. Lowongan — tanpa unique constraint: cek (title, company).
  let jobsN = 0;
  for (const j of JOBS) {
    if (await exists("job_listings", `title=eq.${enc(j.title)}&company=eq.${enc(j.company)}`)) continue;
    await rest("POST", "job_listings", {
      title: j.title, company: j.company, location: j.location,
      salary_min_cents: null, salary_max_cents: null, deadline: j.deadline,
      source_url: j.source_url || null, status: "open",
    });
    jobsN++;
  }
  console.log(`lowongan: ${jobsN} baru (total sumber ${JOBS.length})`);

  // 6. Produk digital (slug unique -> upsert) + jasa (cek title).
  await rest("POST", "digital_products?on_conflict=slug",
    PRODUCTS.map((p) => ({
      name: p.name, slug: p.id, description: p.desc,
      price_cents: Math.round(p.price * 100), active: true,
    })), "resolution=merge-duplicates,return=minimal");
  let svcN = 0;
  for (const s of SERVICES) {
    if (await exists("services", `title=eq.${enc(s.name)}`)) continue;
    await rest("POST", "services", {
      title: s.name, description: s.desc,
      price_from_cents: Math.round(s.price_from * 100), active: true,
    });
    svcN++;
  }
  console.log(`produk: ${PRODUCTS.length} · jasa: ${svcN} baru (total sumber ${SERVICES.length})`);

  // 7. Menu Kedai — HARGA ASLI poster Kedai I&T (5× Rp18.000 + Lumpia Rp15.000).
  let kedaiN = 0;
  for (const m of KEDAI.menu) {
    if (await exists("kedai_menu_items", `name=eq.${enc(m.name)}`)) continue;
    await rest("POST", "kedai_menu_items", {
      name: m.name, category: m.category,
      price_cents: m.price ? Math.round(m.price * 100) : 0, available: m.available,
    });
    kedaiN++;
  }
  console.log(`menu kedai: ${kedaiN} baru (total sumber ${KEDAI.menu.length}, harga asli)`);

  // 8. Budaya (slug unique -> upsert; lirik kosong — belum ada sumber).
  const cultureMap: Record<string, "upacara" | "tari_musik" | "bahasa"> = {
    upacara: "upacara", "tari-musik": "tari_musik", bahasa: "bahasa",
  };
  let cultureN = 0;
  for (const a of ARTICLES) {
    const cat = cultureMap[a.category_id];
    if (a.channel !== "budaya" || !cat) continue;
    await rest("POST", "culture_stories?on_conflict=slug", {
      category: cat, title: a.title_id, body: a.body_id.join("\n\n"),
      lyrics: null, sources: a.source ? [a.source] : [], slug: a.slug,
    }, "resolution=merge-duplicates,return=minimal");
    cultureN++;
  }
  console.log(`budaya: ${cultureN} cerita`);

  // Verifikasi: hitung baris per tabel.
  for (const t of ["categories", "articles", "daily_prices", "market_rates", "job_listings", "digital_products", "services", "kedai_menu_items", "culture_stories"]) {
    const rows = await rest("GET", `${t}?select=id`);
    console.log(`verify ${t}: ${rows.length}`);
  }
  console.log("Seed selesai.");
}

main().catch((e) => { console.error(e); process.exit(1); });
