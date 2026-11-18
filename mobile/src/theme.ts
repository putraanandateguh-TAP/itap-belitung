// Token desain iTAP Belitung — disalin dari replica/design/tokens.json
// (brand milik Teguh, DESIGN_GUIDE.md §2–§3). Komponen HANYA memakai token
// ini, bukan nilai hex mentah.
export const colors = {
  accent: "#2563EB",
  accentDark: "#1D4ED8",
  accentLight: "#60A5FA",
  bg: "#FFFFFF",
  border: "#E2E8F0",
  borderInput: "#64748B",
  danger: "#B91C1C",
  onAccent: "#FFFFFF",
  success: "#15803D",
  successBright: "#16A34A",
  surface: "#F8FAFC",
  surfaceAlt: "#DCEEFF",
  surfaceDanger: "#FEF2F2",
  surfaceDark: "#0A1931",
  surfaceDarkDeep: "#071224",
  surfaceSuccess: "#F0FDF4",
  surfaceWarning: "#FFFBEB",
  text: "#0F172A",
  textMuted: "#475569",
  textMutedOnDark: "#94A3B8",
  textOnDark: "#FFFFFF",
  warning: "#92400E",
} as const;

export const radius = { sm: 6, md: 10, lg: 16, xl: 24, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const type = {
  xs: { fontSize: 12, lineHeight: 16, fontWeight: "500" as const },
  sm: { fontSize: 14, lineHeight: 20, fontWeight: "400" as const },
  base: { fontSize: 16, lineHeight: 24, fontWeight: "400" as const },
  lg: { fontSize: 20, lineHeight: 28, fontWeight: "600" as const },
  xl: { fontSize: 28, lineHeight: 34, fontWeight: "700" as const },
  display: { fontSize: 40, lineHeight: 44, fontWeight: "700" as const },
} as const;

export const CHANNEL_LABELS: Record<string, string> = {
  berita: "Berita",
  kuliner: "Kuliner",
  wisata: "Wisata",
  sejarah: "Sejarah",
  budaya: "Budaya",
  legenda: "Legenda",
};

export const CULTURE_CATEGORY_LABELS: Record<string, string> = {
  upacara: "Upacara",
  tari_musik: "Tari & Musik",
  lagu: "Lagu",
  kuliner_tradisi: "Kuliner Tradisi",
  cerita_rakyat: "Cerita Rakyat",
  bahasa: "Bahasa",
  sejarah_timah: "Sejarah Timah",
};

export const LISTING_STATUS_LABELS: Record<string, string> = {
  aktif: "Aktif",
  terjual: "Terjual",
  dinonaktifkan: "Dinonaktifkan",
  dihapus: "Dihapus",
};
