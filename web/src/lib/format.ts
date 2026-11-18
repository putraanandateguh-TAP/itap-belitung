// Format tampilan: Rupiah + tanggal WIB, sesuai bahasa antarmuka.
// Rupiah selalu id-ID (mata uang tetap IDR); tanggal/views mengikuti lang.
import type { Lang } from "./i18n";

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** "10 Okt 2026" / "10 Oct 2026" — selalu WIB (Asia/Jakarta). */
export function formatDateWIB(iso: string, lang: Lang = "id"): string {
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

/** "10 Okt 2026 · 08.00 WIB" / "10 Oct 2026, 08:00 WIB" */
export function formatDateTimeWIB(iso: string, lang: Lang = "id"): string {
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso)) + " WIB";
}

/** "2 hari lalu" / "2 days ago" — relatif terhadap sekarang, WIB. */
export function formatRelativeWIB(iso: string, lang: Lang = "id"): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (lang === "en") {
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} months ago`;
    return formatDateWIB(iso, lang);
  }
  if (days <= 0) return "Hari ini";
  if (days === 1) return "Kemarin";
  if (days < 30) return `${days} hari lalu`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} bulan lalu`;
  return formatDateWIB(iso);
}

export function formatViews(n: number, lang: Lang = "id"): string {
  if (lang === "en") {
    if (n >= 1000) return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n / 1000)}k reads`;
    return `${n} reads`;
  }
  if (n >= 1000) return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n / 1000)} rb dibaca`;
  return `${n} dibaca`;
}
