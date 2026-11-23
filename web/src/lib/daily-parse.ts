// Parser + penanda umur untuk payload cache info harian (M5, A5).
// Payload mentah disimpan cron dari sumber publik; parser di sini
// memvalidasi bentuknya sebelum dirender — bila bentuk berubah, halaman
// menampilkan pesan jujur, bukan crash atau data karangan.
//
// Bentuk yang diverifikasi 2026-11-18 (curl read-only):
// - BMKG cuaca: { data: [{ lokasi: { desa, kecamatan, kotkab, provinsi },
//   cuaca: [ [ { local_datetime, t, weather_desc, tp, hu, ws, wd }, ... ],
//   ... ] }] } — 3 hari, tiap hari berisi item per jam.
// - Salat (MyQuran): { status: true, data: { lokasi, daerah,
//   jadwal: { tanggal, imsak, subuh, terbit, dhuha, dzuhur, ashar,
//   maghrib, isya } } }.
// - Gempa (BMKG TEWS): { Infogempa: { gempa: { Tanggal, Jam, Magnitude,
//   Kedalaman, Wilayah, Potensi, Dirasakan, Coordinates } } }.

export type WeatherItem = {
  time: string; // "HH:MM" WIB
  temp: number | null;
  desc: string;
  rainMm: number | null;
  humidity: number | null;
  windKmh: number | null;
  windDir: string;
};

export type WeatherDay = { date: string; items: WeatherItem[] };

export type WeatherParsed = {
  location: string;
  days: WeatherDay[];
};

export type PrayerParsed = {
  location: string;
  region: string;
  dateLabel: string;
  times: { label: string; time: string }[];
};

export type QuakeParsed = {
  date: string;
  time: string;
  magnitude: string;
  depth: string;
  region: string;
  potential: string;
  felt: string;
  coordinates: string;
};

const PRAYER_LABELS: [string, string][] = [
  ["imsak", "Imsak"],
  ["subuh", "Subuh"],
  ["terbit", "Terbit"],
  ["dhuha", "Duha"],
  ["dzuhur", "Zuhur"],
  ["ashar", "Asar"],
  ["maghrib", "Magrib"],
  ["isya", "Isya"],
];

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** "2026-11-18 18:00:00" (local_datetime BMKG) -> "18:00". */
function hhmm(localDatetime: string): string {
  const m = localDatetime.match(/(\d{2}):(\d{2}):\d{2}$/);
  return m ? `${m[1]}:${m[2]}` : localDatetime;
}

export function parseWeatherPayload(payload: unknown): WeatherParsed | null {
  if (!isObj(payload) || !Array.isArray(payload.data) || payload.data.length === 0) return null;
  const first = payload.data[0];
  if (!isObj(first) || !isObj(first.lokasi) || !Array.isArray(first.cuaca)) return null;
  const loc = first.lokasi;
  const location = [str(loc.desa), str(loc.kecamatan), str(loc.kotkab), str(loc.provinsi)]
    .filter(Boolean).join(", ");
  const days: WeatherDay[] = [];
  for (const day of first.cuaca) {
    if (!Array.isArray(day) || day.length === 0) continue;
    const items: WeatherItem[] = [];
    for (const it of day) {
      if (!isObj(it)) continue;
      items.push({
        time: hhmm(str(it.local_datetime)),
        temp: num(it.t),
        desc: str(it.weather_desc) || "—",
        rainMm: num(it.tp),
        humidity: num(it.hu),
        windKmh: num(it.ws),
        windDir: str(it.wd),
      });
    }
    if (items.length === 0) continue;
    const date = str(day[0]?.local_datetime).slice(0, 10) || "—";
    days.push({ date, items });
  }
  if (days.length === 0 || !location) return null;
  return { location, days };
}

export function parsePrayerPayload(payload: unknown): PrayerParsed | null {
  if (!isObj(payload) || !isObj(payload.data)) return null;
  const d = payload.data;
  const jadwal = d.jadwal;
  if (!isObj(jadwal)) return null;
  const times: { label: string; time: string }[] = [];
  for (const [key, label] of PRAYER_LABELS) {
    const t = str(jadwal[key]);
    if (t) times.push({ label, time: t });
  }
  if (times.length === 0) return null;
  return {
    location: str(d.lokasi) || "Belitung",
    region: str(d.daerah),
    dateLabel: str(jadwal.tanggal),
    times,
  };
}

export function parseQuakePayload(payload: unknown): QuakeParsed | null {
  if (!isObj(payload) || !isObj(payload.Infogempa) || !isObj(payload.Infogempa.gempa)) return null;
  const g = payload.Infogempa.gempa;
  if (!str(g.Tanggal) || !str(g.Magnitude)) return null;
  return {
    date: str(g.Tanggal),
    time: str(g.Jam),
    magnitude: str(g.Magnitude),
    depth: str(g.Kedalaman),
    region: str(g.Wilayah),
    potential: str(g.Potensi),
    felt: str(g.Dirasakan),
    coordinates: str(g.Coordinates),
  };
}

/** Umur cache dalam jam dari fetched_at (ISO). */
export function cacheAgeHours(fetchedAt: string): number | null {
  const t = Date.parse(fetchedAt);
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / 3_600_000;
}

/** A5: data >6 jam dianggap mungkin basi. */
export function isCacheStale(fetchedAt: string, asOfDate: string): boolean {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  if (asOfDate < today) return true;
  const age = cacheAgeHours(fetchedAt);
  return age !== null && age > 6;
}

/** "2026-11-18T10:00:00.000Z" -> "17:00 WIB". */
export function formatUpdatedWIB(fetchedAt: string): string {
  const d = new Date(fetchedAt);
  if (Number.isNaN(d.getTime())) return fetchedAt;
  return `${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} WIB`;
}
