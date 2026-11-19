// Parser untuk cron harga/kurs/berita (daily-prices + daily-news).
// Prinsip yang sama dengan src/lib/daily-parse.ts: validasi bentuk SEBELUM
// tulis ke DB — bila sumber berubah bentuk, job gagal terlihat (console.error
// + results "gagal: ...") dan data terakhir yang bagus tetap tampil.
//
// Sumber yang DIVERIFIKASI 2026-11-19 (curl dari VM, HTTP 200):
// - Harga pangan: ADAT Belitung https://adat.belitung.go.id/komoditas
//   (sumber yang SAMA dengan seed). TIDAK ada API/JSON — halaman HTML
//   server-rendered berisi kartu komoditas (nama, "Rp NNN", "/ kg|liter")
//   + "Update Terakhir: DD-MM-YYYY". Parser regex di bawah memetik kartu itu.
//   CATATAN PENTING: "Update Terakhir" ADAT masih 01-11-2026 — jadi walau
//   cron jalan tiap hari, price_date yang ditulis tetap tanggal data ADAT
//   (bukan hari ini), dan halaman akan tetap menampilkan 01-11-2026 sampai
//   Diskominfo memperbarui ADAT. Itu kejujuran data, bukan bug cron.
// - Kurs/IHSG: Yahoo Finance v8 chart (tanpa key, tanpa crumb):
//   https://query1.finance.yahoo.com/v8/finance/chart/<SIMBOL>
//   Simbol terverifikasi: ^JKSE, GC=F, USDIDR=X, SGDIDR=X, EURIDR=X,
//   AUDIDR=X, JPYIDR=X, CNHIDR=X, MYRIDR=X. DUA yang GAGAL:
//   v7 /finance/quote -> 401 (butuh crumb); SARIDR=X -> 404 di v8.
//   SAR dihitung dari USDIDR / USDSAR (USDSAR=X = 3,751 — patok resmi
//   SAR/USD 3,75), dicatat di details.
//   SUMBER BERUBAH dari seed: kurs seed = e-rate BCA, IHSG seed = Yahoo
//   (tetap), emas seed = retail Antam. Kurs baru = mid-market Yahoo
//   (bukan e-rate BCA); emas baru = proksi COMEX GC=F x USD/IDR (bukan
//   harga retail Antam) dengan simbol EMAS-1G — lihat daily-prices/route.ts.
// - Berita: Google News RSS "Belitung"
//   https://news.google.com/rss/search?q=Belitung&hl=id&gl=ID&ceid=ID:id
//   (100 item, <source> = nama media, <link> = tautan Google News seperti
//   yang sudah dipakai artikel agregasi seed). RSS media lokal langsung
//   TIDAK bisa dipakai: belitung.tribunnews.com/rss -> 403 (bot-block),
//   babel.antaranews.com/rss/terkini -> 404.

export function todayWIB(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

/** "2026-11-19" (WIB) -> awal hari itu dalam UTC (untuk guard idempotensi). */
export function startOfTodayWIB(): Date {
  return new Date(`${todayWIB()}T00:00:00+07:00`);
}

export async function fetchText(url: string, timeoutMs = 10000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "iTAP-Belitung/1.0 (+https://itapbelitung.my.id)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

export async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const text = await fetchText(url, timeoutMs);
  return JSON.parse(text) as unknown;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// ---------------------------------------------------------------------------
// ADAT Belitung (harga pangan, HTML)
// ---------------------------------------------------------------------------

export type AdatItem = { commodity: string; price: number; unit: string };

export type AdatParsed = { date: string; items: AdatItem[] };

/** "01-11-2026" (teks "Update Terakhir" ADAT) -> "2026-11-01". */
export function parseAdatDate(html: string): string | null {
  // Teksnya: Update Terakhir: <strong ...> 01-11-2026 — ada tag HTML
  // di antara label dan tanggal.
  const m = html.match(/Update Terakhir:[\s\S]{0,120}?(\d{2})-(\d{2})-(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/**
 * Petik kartu komoditas ADAT. Setiap kartu diawali <a ... class=
 * "komoditas-item-card ..."> lalu berisi komoditas-name, komoditas-price
 * "Rp NNN" + <span>/ kg|liter</span>. Jangkar kartu dipakai supaya nama
 * di daftar filter (tanpa harga) tidak ikut terpetik.
 */
export function parseAdatHtml(html: string): AdatParsed | null {
  const date = parseAdatDate(html);
  if (!date) return null;
  const items: AdatItem[] = [];
  const cardRe =
    /komoditas-item-card[\s\S]{0,6000}?komoditas-name">([^<]+)<\/span>[\s\S]{0,4000}?komoditas-price">\s*Rp\s*([\d.]+)\s*<span[^>]*>\/\s*(kg|liter|butir|pcs|ikat|pack|gram)\s*<\/span>/gi;
  for (const m of html.matchAll(cardRe)) {
    const price = Number(m[2].replace(/\./g, ""));
    if (!m[1].trim() || !Number.isFinite(price) || price <= 0) continue;
    items.push({ commodity: m[1].trim(), price, unit: m[3].toLowerCase() });
  }
  // ADAT seed punya 13 komoditas; tolak hasil yang jelas-jelas rusak.
  if (items.length < 10) return null;
  const seen = new Set(items.map((i) => i.commodity));
  if (seen.size !== items.length) return null;
  return { date, items };
}

// ---------------------------------------------------------------------------
// Yahoo Finance v8 chart (IHSG, kurs, emas futures, USD/SAR)
// ---------------------------------------------------------------------------

export type YahooQuote = {
  price: number;
  change: number | null;
  percent: number | null;
  prevClose: number | null;
  marketTime: Date | null;
};

export function parseYahooChart(payload: unknown): YahooQuote | null {
  if (!isObj(payload) || !isObj(payload.chart)) return null;
  const result = payload.chart.result;
  if (!Array.isArray(result) || result.length === 0 || !isObj(result[0])) return null;
  const meta = result[0].meta;
  if (!isObj(meta)) return null;
  const price = num(meta.regularMarketPrice);
  if (price === null) return null;
  const time = num(meta.regularMarketTime);
  return {
    price,
    change: num(meta.fulldayChange) ?? num(meta.regularMarketChange),
    percent: num(meta.fulldayChangePercent) ?? num(meta.regularMarketChangePercent),
    prevClose: num(meta.chartPreviousClose),
    marketTime: time !== null ? new Date(time * 1000) : null,
  };
}

/** Harga emas dunia per gram (IDR) dari futures COMEX (USD/troy oz) x USD/IDR. */
export const TROY_OZ_GRAMS = 31.1034768;

export function goldPerGramIdr(usdPerTroyOz: number, usdIdr: number): number {
  return (usdPerTroyOz / TROY_OZ_GRAMS) * usdIdr;
}

// ---------------------------------------------------------------------------
// RSS (Google News) + slug
// ---------------------------------------------------------------------------

export type RssItem = { title: string; link: string; pubDate: Date | null; source: string };

const XML_ENTITIES: [RegExp, string][] = [
  [/&amp;/g, "&"],
  [/&lt;/g, "<"],
  [/&gt;/g, ">"],
  [/&quot;/g, '"'],
  [/&apos;/g, "'"],
  [/&#39;/g, "'"],
  [/&#x27;/g, "'"],
];

export function decodeXmlEntities(s: string): string {
  let out = s;
  for (const [re, rep] of XML_ENTITIES) out = out.replace(re, rep);
  out = out.replace(/&#(\d+);/g, (_, n) => {
    const c = Number(n);
    return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : "";
  });
  return out.replace(/<[^>]+>/g, "").trim();
}

function tagText(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`));
  if (!m) return null;
  let v = m[1].trim();
  if (v.startsWith("<![CDATA[") && v.endsWith("]]>")) v = v.slice(9, -3);
  return decodeXmlEntities(v);
}

export function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    const title = tagText(block, "title");
    const link = tagText(block, "link");
    if (!title || !link || !/^https?:\/\//.test(link)) continue;
    const pubRaw = tagText(block, "pubDate");
    const pub = pubRaw ? new Date(pubRaw) : null;
    const source = tagText(block, "source") || "Google News";
    items.push({ title, link, pubDate: pub && !Number.isNaN(pub.getTime()) ? pub : null, source });
  }
  return items;
}

/** "Bupati Belitung Dorong..." -> "bupati-belitung-dorong" (maks 80 karakter). */
export function slugify(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/-$/g, "");
  return slug || "berita-belitung";
}

/** Sufiks pendek deterministik dari URL (untuk tabrakan slug). */
export function urlHash8(url: string): string {
  let h = 5381;
  for (let i = 0; i < url.length; i++) h = ((h << 5) + h + url.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}
