// scripts/seed.ts — memindahkan konten ASLI situs lama (seed-data.ts) ke
// Supabase. Data ini milik iTAP sendiri (bukan Satam, bukan orang sungguhan
// sebagai pengguna — tidak ada akun demo yang dibuat di sini).
//   DATABASE_URL=... SEED_AUTHOR_ID=<uuid profil admin> npm run db:seed
// SEED_AUTHOR_ID = id profil (auth.users.id) pemilik konten artikel — isi
// setelah signup pertama di /masuk + profil dibuat. Tanpa itu, artikel
// dilewati (kategori/harga/kurs/loker/produk/jasa/menu tetap di-seed).
// Idempotent: pakai onConflictDoNothing pada kunci unik.
import "dotenv/config";
import { getDb } from "../src/lib/db";
import * as t from "../src/lib/db/schema";
import {
  ARTICLES, CATEGORIES, DAILY_PRICES, JOBS, KEDAI, MARKET_RATES, PRODUCTS, SERVICES,
} from "../src/lib/seed-data";

const db = getDb();
const authorId = process.env.SEED_AUTHOR_ID ?? "";
const log = (s: string) => console.log(s);

// "01-11-2026" -> "2026-11-01"
function ddmmyyyy(s: string): string {
  const [d, m, y] = s.split("-");
  return `${y}-${m}-${d}`;
}

async function main() {
  // 1. Kategori (slug -> uuid baru).
  const catIdBySlug = new Map<string, string>();
  for (const c of CATEGORIES) {
    const rows = await db.insert(t.categories).values({
      channel: c.channel, nameId: c.name_id, nameEn: c.name_en, slug: c.slug,
    }).onConflictDoNothing().returning();
    if (rows[0]) catIdBySlug.set(c.slug, rows[0].id);
  }
  // Ambil id kategori yang sudah ada (seed idempotent).
  const existingCats = await db.select().from(t.categories);
  for (const c of existingCats) catIdBySlug.set(c.slug, c.id);
  log(`kategori: ${catIdBySlug.size}`);

  // 2. Artikel (butuh author).
  if (!authorId) {
    log("artikel: DILEWATI — SEED_AUTHOR_ID belum diisi (signup dulu, lalu seed ulang).");
  } else {
    let n = 0;
    for (const a of ARTICLES) {
      const catId = catIdBySlug.get(a.category_id) ?? null;
      await db.insert(t.articles).values({
        authorId, categoryId: catId, channel: a.channel, slug: a.slug,
        titleId: a.title_id, titleEn: a.title_en,
        bodyId: a.body_id.join("\n\n"),
        bodyEn: a.body_en ? a.body_en.join("\n\n") : null,
        gallery: a.gallery as unknown as object,
        locationName: a.location_name || null,
        locationLat: a.location_lat, locationLng: a.location_lng,
        source: a.source || null, sourceUrl: a.source_url, external: a.external,
        status: "published", publishedAt: new Date(a.published_at), views: a.views,
      }).onConflictDoNothing();
      n++;
    }
    log(`artikel: ${n} (published)`);
  }

  // 3. Harga pangan harian.
  const priceDate = ddmmyyyy(DAILY_PRICES.source_date);
  for (const item of DAILY_PRICES.items) {
    await db.insert(t.dailyPrices).values({
      commodity: item.commodity, priceCents: Math.round(item.price * 100),
      market: DAILY_PRICES.market, unit: item.unit, priceDate,
    }).onConflictDoNothing();
  }
  log(`harga pangan: ${DAILY_PRICES.items.length} komoditas @ ${priceDate}`);

  // 4. Kurs / IHSG / emas.
  const asOf = new Date("2026-11-17T17:42:00+07:00");
  await db.insert(t.marketRates).values({
    kind: "ihsg", symbol: "IHSG", value: String(MARKET_RATES.ihsg.value), asOf,
    details: { change: MARKET_RATES.ihsg.change, percent: MARKET_RATES.ihsg.percent },
  });
  await db.insert(t.marketRates).values({
    kind: "emas", symbol: "ANTAM-1G", value: String(MARKET_RATES.gold.price_1g), asOf,
    details: { previous: MARKET_RATES.gold.previous },
  });
  for (const c of MARKET_RATES.currencies) {
    await db.insert(t.marketRates).values({
      kind: "kurs", symbol: c.code, value: String(c.sell_erate), asOf,
      details: {
        buy_erate: c.buy_erate, sell_erate: c.sell_erate, buy_tt: c.buy_tt,
        sell_tt: c.sell_tt, buy_bn: c.buy_bn, sell_bn: c.sell_bn,
      },
    });
  }
  log(`kurs: IHSG + emas + ${MARKET_RATES.currencies.length} mata uang`);

  // 5. Lowongan.
  for (const j of JOBS) {
    await db.insert(t.jobListings).values({
      title: j.title, company: j.company, location: j.location,
      salaryMinCents: null, salaryMaxCents: null, deadline: j.deadline,
      sourceUrl: j.source_url || null, status: "open",
    });
  }
  log(`lowongan: ${JOBS.length} (gaji/tenggat null — tidak ada di sumber, sesuai build-log)`);

  // 6. Produk digital (katalog saja — TANPA lisensi) + jasa.
  for (const p of PRODUCTS) {
    await db.insert(t.digitalProducts).values({
      name: p.name, slug: p.id, description: p.desc,
      priceCents: Math.round(p.price * 100), active: true,
    }).onConflictDoNothing();
  }
  for (const s of SERVICES) {
    await db.insert(t.services).values({
      title: s.name, description: s.desc,
      priceFromCents: Math.round(s.price_from * 100), active: true,
    });
  }
  log(`produk: ${PRODUCTS.length} · jasa: ${SERVICES.length}`);

  // 7. Menu Kedai — HANYA contoh (harga 0). Ganti dengan harga asli bila ada.
  for (const m of KEDAI.menu) {
    await db.insert(t.kedaiMenuItems).values({
      name: m.name, category: m.category,
      priceCents: m.price ? Math.round(m.price * 100) : 0, available: m.available,
    });
  }
  log(`menu kedai: ${KEDAI.menu.length} (contoh, harga 0 — belum ada harga asli)`);
  log("Seed selesai.");
}

main().catch((e) => { console.error(e); process.exit(1); });
