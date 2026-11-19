// Job 1/7 — daily-info-fetch (tiap hari 00:15 UTC (07:15 WIB)).
// Ambil data publik resmi (BMKG/Kemenag/dll.) lalu simpan ke
// daily_info_snapshots. JANGAN fetch per request (arsitektur §4).
// Bila fetch gagal / sumber berubah: biarkan cache lama + tandai stale —
// API membaca cache terakhir dengan label "data terakhir diperbarui …".
//
// Endpoint + bentuk respons DIVERIFIKASI 2026-11-18 (curl read-only, M5):
// - BMKG cuaca: https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=19.02.01.1001
//   (Kota, Tanjung Pandan, Belitung). PERBAIKAN M5: kode lama 19.01.01.1001
//   ternyata Sungailiat, BANGKA — bukan Belitung. Bentuk:
//   { data: [{ lokasi: {...}, cuaca: [[{ local_datetime, t, weather_desc,
//   tp, hu, ws, wd }, ...], ...] }] }.
// - Salat (MyQuran, data Kemenag): https://api.myquran.com/v2/sholat/jadwal/0905/YYYY-MM-DD
//   PERBAIKAN M5: id lama 1904 ternyata KAB. FLORES TIMUR; yang benar 0905
//   = KAB. BELITUNG (daftar kota dicek via /v2/sholat/kota/semua). Tanggal
//   kini dinamis (WIB), bukan hardcode. Bentuk:
//   { status: true, data: { lokasi, daerah, jadwal: { tanggal, imsak,
//   subuh, terbit, dhuha, dzuhur, ashar, maghrib, isya } } }.
// - Gempa (BMKG TEWS): https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json
//   (gempa terbaru, tanpa key). Bentuk: { Infogempa: { gempa: { Tanggal,
//   Jam, Magnitude, Kedalaman, Wilayah, Potensi, Dirasakan } } }.
//   BARU di M5 — sebelumnya belum dipetakan.
// - fuel/transport/air: MASIH belum-dipetakan (M5, jujur, jangan dikarang):
//   harga BBM Pertamina hanya tampil sebagai halaman HTML
//   (pertamina.com/id/harga-bbm) tanpa API JSON publik yang stabil;
//   jadwal pesawat/kapal tidak punya API publik stabil (jadwal berubah
//   dan tersebar di maskapai/operator); kualitas udara tidak ada API
//   publik BMKG. Halaman web menampilkan pesan jujur sampai sumber
//   stabil ditemukan.
import { NextResponse } from "next/server";
import { cronAuth } from "@/lib/cron-auth";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { parsePrayerPayload, parseQuakePayload, parseWeatherPayload } from "@/lib/daily-parse";

export const dynamic = "force-dynamic";
// Batas durasi 60 dtk (maks Hobby): default Vercel 15 dtk terlalu pendek
// untuk 3 fetch berurutan @ timeout 8 dtk + insert DB Singapura dari
// region cron — fungsi bisa terbunuh sebelum insert pertama (dugaan kuat
// invokasi 00:20 UTC 19 Nov 2026 yang tidak menulis apa pun).
export const maxDuration = 60;

type SourceDef = {
  source: string;
  url: () => string;
  validate: (payload: unknown) => boolean;
};

function todayWIB(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

const SOURCES: SourceDef[] = [
  {
    source: "weather",
    url: () => "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=19.02.01.1001",
    validate: (p) => parseWeatherPayload(p) !== null,
  },
  {
    source: "prayer",
    url: () => `https://api.myquran.com/v2/sholat/jadwal/0905/${todayWIB()}`,
    validate: (p) => parsePrayerPayload(p) !== null,
  },
  {
    source: "earthquake",
    url: () => "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json",
    validate: (p) => parseQuakePayload(p) !== null,
  },
];

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "iTAP-Belitung/1.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
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
  // Fetch paralel (bukan berurutan): skenario terburuk 3x8 dtk -> ~8 dtk,
  // dan SETIAP kegagalan dicatat ke log — sebelumnya loop berurutan menelan
  // semua error ke `results` tanpa console.* apa pun, sehingga invokasi
  // yang gagal total tidak meninggalkan jejak di log (19 Nov 2026).
  const settled = await Promise.allSettled(
    SOURCES.map(async (s) => {
      const payload = await fetchJson(s.url());
      if (!s.validate(payload)) throw new Error("bentuk respons berubah (parser menolak)");
      await db.insert(t.dailyInfoSnapshots).values({
        source: s.source, scopeKey: "belitung", asOfDate: today,
        payload: payload as object,
      }).onConflictDoNothing();
      return s.source;
    }),
  );
  for (const [i, r] of settled.entries()) {
    const src = SOURCES[i].source;
    // Degrade ke cache: jangan hapus data lama; catat gagal saja.
    results[src] = r.status === "fulfilled" ? "ok" : `gagal: ${(r.reason as Error).message}`;
    if (r.status === "rejected") console.error(`[daily-info-fetch] ${src} gagal:`, r.reason);
  }
  results.fuel = "belum-dipetakan";
  results.transport = "belum-dipetakan";
  results.air = "belum-dipetakan";
  console.log("[daily-info-fetch]", JSON.stringify({ date: today, results }));
  return NextResponse.json({ ok: true, date: today, results });
}
