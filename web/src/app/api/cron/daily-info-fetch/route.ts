// Job 1/5 — daily-info-fetch (tiap jam, staggered per sumber di vercel.json).
// Ambil data publik resmi (BMKG/Kemenag/Pertamina/dll.) lalu simpan ke
// daily_info_snapshots. JANGAN fetch per request (arsitektur §4).
// Bila fetch gagal / sumber berubah: biarkan cache lama + tandai stale —
// API membaca cache terakhir dengan label "data terakhir diperbarui …".
// Endpoint sumber persisnya diverifikasi saat P1 jalan; daftar di bawah
// adalah endpoint publik yang dipakai saat build (bila berubah, ubah di
// sini + catat di replica/backend.md).
import { NextResponse } from "next/server";
import { cronAuth } from "@/lib/cron-auth";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const SOURCES: { source: string; url: string }[] = [
  // Cuaca BMKG per kecamatan Belitung (API publik BMKG v1, tanpa key).
  { source: "weather", url: "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=19.01.01.1001" },
  // Jadwal salat Kemenag (API publik, tanpa key).
  { source: "prayer", url: "https://api.myquran.com/v2/sholat/jadwal/1904/2026-11-18" },
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
    return NextResponse.json({ error: "DATABASE_URL belum diisi (P1)." }, { status: 503 });
  }
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const results: Record<string, string> = {};
  for (const s of SOURCES) {
    try {
      const payload = await fetchJson(s.url);
      await db.insert(t.dailyInfoSnapshots).values({
        source: s.source, scopeKey: "belitung", asOfDate: today,
        payload: payload as object,
      }).onConflictDoNothing();
      results[s.source] = "ok";
    } catch (e) {
      // Degrade ke cache: jangan hapus data lama; catat gagal saja.
      results[s.source] = `gagal: ${(e as Error).message}`;
    }
  }
  // fuel/transport/earthquake/air: sumbernya belum dipetakan ke endpoint
  // publik yang stabil (catat di backend.md) — cron tidak mengarang data.
  results.fuel = "belum-dipetakan";
  results.transport = "belum-dipetakan";
  results.earthquake = "belum-dipetakan";
  results.air = "belum-dipetakan";
  return NextResponse.json({ ok: true, date: today, results });
}
