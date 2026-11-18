// Format tampilan: Rupiah + tanggal WIB (id-ID), sesuai tailwind-mapping.md.

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

/** "10 Okt 2026" — selalu WIB (Asia/Jakarta). */
export function formatDateWIB(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

/** "10 Okt 2026 · 08.00 WIB" */
export function formatDateTimeWIB(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso)) + " WIB";
}

/** "2 hari lalu" / "baru saja" — relatif terhadap sekarang, WIB. */
export function formatRelativeWIB(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) return "Hari ini";
  if (days === 1) return "Kemarin";
  if (days < 30) return `${days} hari lalu`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} bulan lalu`;
  return formatDateWIB(iso);
}

export function formatViews(n: number): string {
  if (n >= 1000) return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n / 1000)} rb dibaca`;
  return `${n} dibaca`;
}
