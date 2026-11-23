// Definisi sumber info harian (dipakai cron daily-info-fetch dan
// penyegaran-saat-baca di lib/daily.ts). Lihat komentar di route cron.
import { parsePrayerPayload, parseQuakePayload, parseWeatherPayload } from "./daily-parse";

export type SourceDef = {
  source: string;
  url: () => string;
  validate: (payload: unknown) => boolean;
};

export function todayWIB(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

export const DAILY_SOURCES: SourceDef[] = [
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

export async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
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

