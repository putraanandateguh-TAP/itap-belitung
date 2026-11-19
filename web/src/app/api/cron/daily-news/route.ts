// Job 2/7 — daily-news (harian 08:15 WIB / 01:15 UTC).
// Mengambil berita terbaru tentang Belitung dari Google News RSS lalu
// memasukkannya sebagai artikel agregasi (external=true) — sumber yang
// SAMA dengan artikel agregasi seed (Belitong Info, Posbelitung.co,
// Tribunnews, ANTARA Babel, dll. — semuanya masuk lewat Google News RSS).
// RSS media lokal langsung TIDAK bisa dipakai: belitung.tribunnews.com/rss
// -> 403 (bot-block), babel.antaranews.com/rss/terkini -> 404.
//
// Aturan:
// - Dedupe berdasarkan source_url (cek dulu di DB) dan slug — jangan
//   masukkan duplikat. Maks 10 artikel baru per jalan.
// - title_id = judul (tanpa sufiks " - Nama Media" yang ditempel Google
//   News bila sama dengan <source>); slug dari judul (unik per channel);
//   channel = berita (RSS tidak membawa kategori; default berita);
//   source = nama media (<source>); source_url = tautan asli;
//   status = published; body_id = deskripsi RSS (cuplikan isi, paragraf
//   pertama) + catatan redaksi; bila deskripsi kosong, body_id = "".
//   Halaman artikel tetap menampilkan banner agregasi + tombol
//   "Baca di <sumber>" (cuplikan bukan isi penuh). Perbaikan 19 Nov 2026:
//   13 artikel kabar lama body-nya kosong sehingga pengunjung tidak bisa
//   membaca apa pun di iTAP; artikel agregasi baru tidak boleh kosong lagi.
//   published_at = tanggal RSS.
// - Hanya item <= 7 hari terakhir yang diambil.
// - author_id = profil superadmin (dipilih saat jalan); bila tidak ada,
//   job GAGAL terlihat — jangan karang UUID penulis.
// - Bila RSS mati / bentuk berubah: job gagal terlihat (console.error +
//   results "gagal: ..."), artikel lama tetap tampil.
import { NextResponse } from "next/server";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { cronAuth } from "@/lib/cron-auth";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { fetchText, parseRss, slugify, todayWIB, urlHash8 } from "@/lib/market-parse";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FEED_URL = "https://news.google.com/rss/search?q=Belitung&hl=id&gl=ID&ceid=ID:id";
const MAX_NEW = 10;
const MAX_AGE_DAYS = 7;

export async function GET(req: Request) {
  const denied = cronAuth(req);
  if (denied) return denied;
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL belum diisi." }, { status: 503 });
  }
  const db = getDb();
  const today = todayWIB();

  // Kategori + penulis diselesaikan dulu: tanpa keduanya tidak ada
  // artikel yang ditulis (gagal terlihat, bukan data karangan).
  const [belitungCat] = await db
    .select({ id: t.categories.id })
    .from(t.categories)
    .where(and(eq(t.categories.channel, "berita"), eq(t.categories.slug, "belitung")))
    .limit(1);
  let categoryId = belitungCat?.id ?? null;
  if (!categoryId) {
    const [anyNews] = await db
      .select({ id: t.categories.id })
      .from(t.categories)
      .where(eq(t.categories.channel, "berita"))
      .orderBy(asc(t.categories.sortOrder))
      .limit(1);
    categoryId = anyNews?.id ?? null;
  }
  if (!categoryId) {
    console.error("[daily-news] gagal: tidak ada kategori channel berita di DB");
    return NextResponse.json(
      { ok: false, error: "Tidak ada kategori channel berita di DB." },
      { status: 503 },
    );
  }
  const [admin] = await db
    .select({ id: t.profiles.id })
    .from(t.profiles)
    .where(eq(t.profiles.role, "superadmin"))
    .limit(1);
  if (!admin) {
    console.error("[daily-news] gagal: tidak ada profil superadmin (author_id)");
    return NextResponse.json(
      { ok: false, error: "Tidak ada profil superadmin untuk author_id." },
      { status: 503 },
    );
  }

  let xml: string;
  try {
    xml = await fetchText(FEED_URL, 10000);
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[daily-news] RSS gagal:", e);
    return NextResponse.json({ ok: false, date: today, results: { berita: `gagal: ${msg}` } });
  }
  const items = parseRss(xml);
  if (items.length === 0) {
    console.error("[daily-news] gagal: RSS kosong / bentuk berubah (parser menolak)");
    return NextResponse.json({
      ok: false,
      date: today,
      results: { berita: "gagal: RSS kosong / bentuk berubah (parser menolak)" },
    });
  }

  const existing = await db
    .select({ slug: t.articles.slug, sourceUrl: t.articles.sourceUrl })
    .from(t.articles)
    .where(and(eq(t.articles.channel, "berita"), isNotNull(t.articles.sourceUrl)));
  const knownUrls = new Set(existing.map((r) => r.sourceUrl as string));
  const knownSlugs = new Set(existing.map((r) => r.slug));

  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  let inserted = 0;
  let skippedDuplicate = 0;
  let skippedOld = 0;
  for (const item of items) {
    if (inserted >= MAX_NEW) break;
    if (!item.pubDate || item.pubDate.getTime() < cutoff) {
      skippedOld++;
      continue;
    }
    if (knownUrls.has(item.link)) {
      skippedDuplicate++;
      continue;
    }
    // Google News menempel " - Nama Media" di akhir judul; buang bila
    // sama dengan <source> supaya judul tidak ganda.
    let title = item.title;
    const suffix = ` - ${item.source}`;
    if (title.endsWith(suffix)) title = title.slice(0, -suffix.length).trim();
    if (!title) continue;
    let slug = slugify(title);
    if (knownSlugs.has(slug)) slug = `${slug}-${urlHash8(item.link)}`;
    if (knownSlugs.has(slug)) {
      skippedDuplicate++;
      continue;
    }
    // Deskripsi RSS jadi paragraf pertama body agar halaman artikel
    // agregasi tidak kosong. Deskripsi Google News hanya cuplikan — bukan
    // isi penuh — jadi banner agregasi + tombol "Baca di <sumber>" tetap
    // ditampilkan di halaman artikel. Bila deskripsi kosong, body tetap
    // "" (perilaku lama) supaya job tidak gagal karena satu item.
    const desc = (item.description || "").replace(/\s+/g, " ").trim();
    const bodyId = desc
      ? `${desc}\n\nCatatan redaksi: ringkasan ini adalah cuplikan dari ${item.source}; baca versi lengkapnya melalui tautan sumber di halaman ini.`
      : "";
    await db
      .insert(t.articles)
      .values({
        authorId: admin.id,
        categoryId,
        channel: "berita",
        slug,
        titleId: title,
        titleEn: null,
        bodyId,
        bodyEn: null,
        gallery: [],
        locationName: "Belitung",
        locationLat: null,
        locationLng: null,
        source: item.source,
        sourceUrl: item.link,
        external: true,
        status: "published",
        publishedAt: item.pubDate,
        views: 0,
      })
      .onConflictDoNothing();
    knownUrls.add(item.link);
    knownSlugs.add(slug);
    inserted++;
  }

  const results = {
    berita: `ok: ${inserted} baru dari ${items.length} item RSS (${skippedDuplicate} duplikat dilewati, ${skippedOld} lebih tua dari ${MAX_AGE_DAYS} hari dilewati)`,
  };
  console.log("[daily-news]", JSON.stringify({ date: today, results }));
  return NextResponse.json({ ok: true, date: today, results });
}
