// Format tampilan: rupiah, tanggal WIB (Asia/Jakarta), sapaan.
export function formatRupiah(priceCents: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(priceCents / 100);
}

export function formatDateWIB(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatTimeWIB(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Sapaan berdasarkan jam WIB saat ini. */
export function greetingWIB(now = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", hour12: false }).format(now),
  );
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 19) return "Selamat sore";
  return "Selamat malam";
}

/** Nama salat dari kunci payload yang mungkin dipakai cron (defensif). */
const PRAYER_KEYS: Record<string, string> = {
  subuh: "Subuh",
  dzuhur: "Dzuhur",
  zuhur: "Dzuhur",
  ashar: "Ashar",
  asr: "Ashar",
  maghrib: "Maghrib",
  isya: "Isya",
  isha: "Isya",
  imsak: "Imsak",
  terbit: "Terbit",
  dhuha: "Dhuha",
};

export interface PrayerTime {
  name: string;
  time: string;
}

/** Cari daftar waktu salat di payload snapshot yang bentuknya belum tentu. */
export function extractPrayerTimes(payload: unknown): PrayerTime[] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const candidates: unknown[] = [obj.schedule, obj.jadwal, obj.times, obj.data, payload];
  for (const c of candidates) {
    if (Array.isArray(c)) {
      const out: PrayerTime[] = [];
      for (const row of c) {
        if (row && typeof row === "object") {
          const r = row as Record<string, unknown>;
          const name = typeof r.name === "string" ? r.name : typeof r.sholat === "string" ? r.sholat : null;
          const time = typeof r.time === "string" ? r.time : typeof r.jam === "string" ? r.jam : null;
          if (name && time) out.push({ name, time });
        }
      }
      if (out.length > 0) return out;
    }
    if (c && typeof c === "object" && !Array.isArray(c)) {
      const out: PrayerTime[] = [];
      for (const [key, value] of Object.entries(c as Record<string, unknown>)) {
        const label = PRAYER_KEYS[key.toLowerCase()];
        if (label && typeof value === "string") out.push({ name: label, time: value });
      }
      if (out.length > 0) return out;
    }
  }
  return [];
}

/** Ambil nilai string/angka sederhana dari payload untuk tampilan generik. */
export function snapshotPrimitives(payload: unknown): { label: string; value: string }[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const out: { label: string; value: string }[] = [];
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (typeof value === "string" || typeof value === "number") {
      out.push({ label: key.replace(/_/g, " "), value: String(value) });
    }
  }
  return out.slice(0, 12);
}
