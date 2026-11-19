// Job 4/7 — daily-prices (harian 10:15 WIB / 03:15 UTC).
// Memperbarui harga pangan + kurs + IHSG + emas — sebelumnya TIDAK ADA
// cron yang menulis daily_prices / market_rates (satu-satunya penulis
// adalah scripts/seed.ts), sehingga harga pangan basi 01-11-2026 dan
// kurs/IHSG/emas basi 17-11-2026.
//
// SUMBER (diverifikasi 2026-11-19, lihat src/lib/market-parse.ts):
// - Pangan: ADAT Belitung (sumber yang SAMA dengan seed — scrape HTML,
//   tidak ada API). price_date = tanggal "Update Terakhir" ADAT, BUKAN
//   hari ini: ADAT sendiri masih bertanggal 01-11-2026, jadi sampai
//   Diskominfo memperbarui ADAT, halaman tetap menampilkan 01-11-2026.
//   Itu kejujuran data, bukan bug cron.
// - IHSG/kurs: Yahoo Finance v8 chart (tanpa key). Kurs = mid-market
//   Yahoo, BUKAN e-rate BCA seperti seed — dicatat di details.source.
// - Emas: proksi COMEX Gold Futures (GC=F) x USD/IDR -> IDR/gram,
//   simbol EMAS-1G (BUKAN ANTAM-1G — bukan harga retail Antam).
//   SAR = USDIDR / USDSAR (patok resmi SAR/USD 3,75).
// - GAGAL TERLIHAT: tiap sumber yang mati dicatat console.error +
//   results "gagal: ..." dan data terakhir yang bagus tetap tampil
//   (halaman membaca baris terbaru di DB).
// - Idempotensi: daily_prices punya unique (commodity, market,
//   price_date) -> onConflictDoNothing; market_rates TIDAK punya unique
//   -> dicek dulu apakah (kind, symbol) sudah ada hari ini (WIB).
import { NextResponse } from "next/server";
import { and, eq, gte } from "drizzle-orm";
import { cronAuth } from "@/lib/cron-auth";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";
import {
  fetchJson,
  fetchText,
  goldPerGramIdr,
  parseAdatHtml,
  parseYahooChart,
  startOfTodayWIB,
  todayWIB,
  type YahooQuote,
} from "@/lib/market-parse";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MARKET = "Pasar Tanjung Pandan, Belitung";
const ADAT_URL = "https://adat.belitung.go.id/komoditas";
const YAHOO_CHART = (symbol: string) =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;

const FX_CODES = ["USD", "SGD", "EUR", "AUD", "JPY", "CNH", "MYR"] as const;

async function yahooQuote(symbol: string): Promise<YahooQuote> {
  const payload = await fetchJson(YAHOO_CHART(symbol));
  const q = parseYahooChart(payload);
  if (!q) throw new Error(`bentuk respons Yahoo berubah (simbol ${symbol})`);
  return q;
}

export async function GET(req: Request) {
  const denied = cronAuth(req);
  if (denied) return denied;
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL belum diisi." }, { status: 503 });
  }
  const db = getDb();
  const today = todayWIB();
  const results: Record<string, string> = {};

  // Idempotensi market_rates: lewati bila (kind, symbol) sudah ada hari ini.
  async function insertRateOnce(
    kind: "kurs" | "ihsg" | "emas",
    symbol: string,
    value: string,
    asOf: Date,
    details: Record<string, unknown>,
  ): Promise<boolean> {
    const existing = await db
      .select({ id: t.marketRates.id })
      .from(t.marketRates)
      .where(
        and(
          eq(t.marketRates.kind, kind),
          eq(t.marketRates.symbol, symbol),
          gte(t.marketRates.asOf, startOfTodayWIB()),
        ),
      )
      .limit(1);
    if (existing.length > 0) return false;
    await db.insert(t.marketRates).values({ kind, symbol, value, asOf, details });
    return true;
  }

  // --- 1. Harga pangan (ADAT) + semua kuotasi Yahoo, paralel. ---
  const symbols = ["^JKSE", "GC=F", "USDIDR=X", "USDSAR=X", ...FX_CODES.map((c) => `${c}IDR=X`)];
  const settled = await Promise.allSettled([
    (async () => parseAdatHtml(await fetchText(ADAT_URL)))(),
    ...symbols.map((s) => yahooQuote(s)),
  ]);
  const [adatRes, ...yahooRes] = settled;

  // --- 1a. Tulis harga pangan. ---
  if (adatRes.status === "fulfilled" && adatRes.value) {
    const adat = adatRes.value;
    let inserted = 0;
    for (const item of adat.items) {
      const rows = await db
        .insert(t.dailyPrices)
        .values({
          commodity: item.commodity,
          priceCents: Math.round(item.price * 100),
          market: MARKET,
          unit: item.unit,
          priceDate: adat.date,
        })
        .onConflictDoNothing()
        .returning({ id: t.dailyPrices.id });
      inserted += rows.length;
    }
    results.pangan = `ok: ${adat.items.length} komoditas @ ${adat.date} (${inserted} baru)`;
  } else {
    const msg =
      adatRes.status === "rejected"
        ? (adatRes.reason as Error).message
        : "bentuk HTML ADAT berubah (parser menolak)";
    results.pangan = `gagal: ${msg}`;
    console.error("[daily-prices] pangan gagal:", adatRes.status === "rejected" ? adatRes.reason : msg);
  }

  // --- 1b. Petik kuotasi Yahoo. ---
  const quote = new Map<string, YahooQuote>();
  const yahooErrors: string[] = [];
  symbols.forEach((s, i) => {
    const r = yahooRes[i];
    if (r.status === "fulfilled") quote.set(s, r.value);
    else {
      yahooErrors.push(`${s}: ${(r.reason as Error).message}`);
      console.error(`[daily-prices] Yahoo ${s} gagal:`, r.reason);
    }
  });
  const asOf = (q: YahooQuote | undefined) => q?.marketTime ?? new Date();

  // --- 2. IHSG (^JKSE, sumber tetap Yahoo seperti seed). ---
  const jkse = quote.get("^JKSE");
  if (jkse) {
    const added = await insertRateOnce("ihsg", "IHSG", String(jkse.price), asOf(jkse), {
      change: jkse.change,
      percent: jkse.percent,
      source: "Yahoo Finance (^JKSE)",
    });
    results.ihsg = added ? `ok: ${jkse.price}` : "ok: sudah ada hari ini";
  } else {
    results.ihsg = "gagal: Yahoo ^JKSE tidak merespons";
  }

  // --- 3. Kurs (mid-market Yahoo — BUKAN e-rate BCA; lihat details). ---
  let fxOk = 0;
  const fxFailed: string[] = [];
  for (const code of FX_CODES) {
    const q = quote.get(`${code}IDR=X`);
    if (!q) {
      fxFailed.push(code);
      continue;
    }
    const v = q.price;
    await insertRateOnce("kurs", code, String(v), asOf(q), {
      buy_erate: v,
      sell_erate: v,
      buy_tt: v,
      sell_tt: v,
      buy_bn: v,
      sell_bn: v,
      source: "Yahoo Finance (mid-market, bukan e-rate BCA)",
    });
    fxOk++;
  }
  // SAR: Yahoo tidak menyediakan SARIDR=X (404) — dihitung dari
  // USD/IDR dibagi USD/SAR (patok resmi SAR/USD 3,75).
  const usdIdr = quote.get("USDIDR=X");
  const usdSar = quote.get("USDSAR=X");
  if (usdIdr && usdSar) {
    const sar = usdIdr.price / usdSar.price;
    await insertRateOnce("kurs", "SAR", String(sar), asOf(usdIdr), {
      buy_erate: sar,
      sell_erate: sar,
      buy_tt: sar,
      sell_tt: sar,
      buy_bn: sar,
      sell_bn: sar,
      source: "Yahoo Finance: USD/IDR ÷ USD/SAR (patok resmi SAR/USD 3,75)",
    });
    fxOk++;
  } else {
    fxFailed.push("SAR");
  }
  results.kurs =
    fxFailed.length === 0
      ? `ok: ${fxOk}/${FX_CODES.length + 1} mata uang`
      : `sebagian: ${fxOk} ok, gagal: ${fxFailed.join(", ")}`;

  // --- 4. Emas (proksi COMEX, BUKAN retail Antam — lihat details). ---
  const gc = quote.get("GC=F");
  if (gc && usdIdr) {
    const perGram = Math.round(goldPerGramIdr(gc.price, usdIdr.price));
    const prev =
      gc.prevClose !== null ? Math.round(goldPerGramIdr(gc.prevClose, usdIdr.price)) : null;
    const added = await insertRateOnce("emas", "EMAS-1G", String(perGram), asOf(gc), {
      previous: prev,
      usd_per_troy_oz: gc.price,
      usd_idr: usdIdr.price,
      source: "COMEX Gold Futures (GC=F) × USD/IDR — proksi emas dunia, bukan harga retail Antam",
    });
    results.emas = added ? `ok: Rp${perGram}/g` : "ok: sudah ada hari ini";
  } else {
    results.emas = "gagal: Yahoo GC=F/USDidr tidak merespons";
  }

  if (yahooErrors.length > 0) results.yahoo_errors = yahooErrors.join(" | ");
  console.log("[daily-prices]", JSON.stringify({ date: today, results }));
  return NextResponse.json({ ok: true, date: today, results });
}
