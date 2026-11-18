// AI iTAP + Penerjemah (S41, S37 — M7, F12/F13).
// Helper client-safe: daftar 9 bahasa (recon S37) + riwayat penerjemah
// di perangkat (localStorage, maks 20 — BUKAN server; F16 menghapusnya
// saat akun dihapus via clearTranslationHistory()).
// TIDAK ada kunci API / jawaban AI di file ini: jawaban + terjemahan
// umum menunggu Gemini (P3) dan route menjawab 501 sampai saat itu.

/** 9 bahasa penerjemah (recon S37 — urutan sesuai recon). */
export const TRANSLATOR_LANGUAGES = [
  { code: "belitung", label: "Belitung" },
  { code: "id", label: "Indonesia" },
  { code: "en", label: "English" },
  { code: "ms", label: "Melayu" },
  { code: "zh", label: "Mandarin" },
  { code: "ja", label: "Jepang" },
  { code: "ko", label: "Korea" },
  { code: "nl", label: "Belanda" },
  { code: "de", label: "Jerman" },
] as const;

export type TranslatorLanguage = (typeof TRANSLATOR_LANGUAGES)[number]["code"];

export function languageLabel(code: string): string {
  return TRANSLATOR_LANGUAGES.find((l) => l.code === code)?.label ?? code;
}

/** Satu pesan chat AI. `sources` hanya ada bila jawaban (nanti) dari Gemini
 *  menyertakan sumber kurasi; `unavailable` = jawaban 501 yang jujur. */
export interface AiMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  sources?: { title: string; href: string }[];
  /** Bila jawaban menyertakan rencana perjalanan per hari (F12). */
  itineraryDays?: { day: number; title: string; items: string[] }[];
  /** Id percakapan (untuk feedback) — hanya bila server memberikannya. */
  conversationId?: string;
  unavailable?: boolean;
}

/** Rencana perjalanan tersimpan (GET /api/ai/itineraries). */
export interface AiItinerary {
  id: string;
  title: string;
  created_at: string;
  days: { day: number; title: string; items: string[] }[];
}

/** Satu entri riwayat penerjemah di perangkat (cermin mobile
 *  src/lib/translation-history.ts). */
export interface TranslationEntry {
  id: string;
  sourceText: string;
  result: string;
  from: string;
  to: string;
  favorite: boolean;
  createdAt: string;
}

const HISTORY_KEY = "itap-translation-history-v1";
export const TRANSLATION_HISTORY_MAX = 20;

export function loadTranslationHistory(): TranslationEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TranslationEntry[]) : [];
  } catch {
    return [];
  }
}

export function addTranslationHistory(
  entry: Omit<TranslationEntry, "id" | "createdAt">,
): TranslationEntry[] {
  const next: TranslationEntry[] = [
    { ...entry, id: `${Date.now()}`, createdAt: new Date().toISOString() },
    ...loadTranslationHistory(),
  ].slice(0, TRANSLATION_HISTORY_MAX);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Penyimpanan penuh/diblokir — riwayat tidak tersimpan, bukan error fatal.
  }
  return next;
}

export function toggleTranslationFavorite(id: string): TranslationEntry[] {
  const next = loadTranslationHistory().map((e) =>
    e.id === id ? { ...e, favorite: !e.favorite } : e,
  );
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Abaikan — lihat addTranslationHistory.
  }
  return next;
}

export function clearTranslationHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // Abaikan.
  }
}
