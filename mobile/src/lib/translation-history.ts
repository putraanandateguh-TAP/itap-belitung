// Riwayat penerjemah di perangkat (recon F13): maks 20 entri, tersimpan
// lokal — bukan di server. Dihapus saat akun dihapus (F16) via
// clearTranslationHistory() dari layar hapus akun.
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface TranslationEntry {
  id: string;
  sourceText: string;
  result: string;
  from: string;
  to: string;
  favorite: boolean;
  createdAt: string;
}

const KEY = "@itap/translation-history-v1";
const MAX_ENTRIES = 20;

export async function loadTranslationHistory(): Promise<TranslationEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TranslationEntry[]) : [];
  } catch {
    return [];
  }
}

export async function addTranslationHistory(entry: Omit<TranslationEntry, "id" | "createdAt">): Promise<TranslationEntry[]> {
  const current = await loadTranslationHistory();
  const next: TranslationEntry[] = [
    { ...entry, id: `${Date.now()}`, createdAt: new Date().toISOString() },
    ...current,
  ].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function toggleTranslationFavorite(id: string): Promise<TranslationEntry[]> {
  const current = await loadTranslationHistory();
  const next = current.map((e) => (e.id === id ? { ...e, favorite: !e.favorite } : e));
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function clearTranslationHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
