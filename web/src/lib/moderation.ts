// Kamus kata moderasi — penahanan otomatis (F08, S22).
//
// Aturan: saat komentar/listing/kiriman info warga baru dibuat, teksnya
// diperiksa terhadap `moderation_words` (server-side, di route terkait).
//   - kata beraksi "hold"  -> materi DITAHAN ke antrean moderasi (komentar /
//     kiriman info memang selalu pending; listing dibuat "dinonaktifkan"
//     supaya tidak tampil publik sampai redaksi mengaktifkan lagi).
//   - kata beraksi "sensor" -> kata itu disamarkan (diganti bintang) sebelum
//     disimpan, materi tetap jalan.
// Pencocokan: case-insensitive, batas kata (bukan substring di tengah kata
// lain) untuk kata tunggal; frasa dicocokkan apa adanya.
//
// MODE SEED (tanpa DATABASE_URL, P1 belum ada): kamus tidak bisa dibaca,
// jadi pemeriksaan DILEWATI dengan jujur — fungsi mengembalikan
// `skippedSeed: true` dan pemanggil TIDAK boleh mengklaim materi sudah
// diperiksa. Begitu DB live ada, pemeriksaan aktif tanpa ubah pemanggil.
import { asc } from "drizzle-orm";
import { getDb, isDbConfigured } from "./db";
import * as t from "./db/schema";

export interface ModerationMatch {
  word: string;
  action: "sensor" | "hold";
}

export interface ModerationCheck {
  /** Kata yang cocok (bila ada). */
  match: ModerationMatch | null;
  /** true bila pemeriksaan dilewati karena mode seed (tanpa DB). */
  skippedSeed: boolean;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Regex batas-kata untuk satu entri kamus (kata tunggal atau frasa). */
function wordPattern(word: string): RegExp {
  const w = escapeRegExp(word.trim().toLowerCase());
  // Frasa (mengandung spasi): cocokkan apa adanya di antara batas non-kata.
  // Kata tunggal: butuh batas kata di kedua sisi supaya "tautan" tidak
  // cocok di dalam "bertautan".
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${w}([^\\p{L}\\p{N}_]|$)`, "iu");
}

export async function checkModerationWords(text: string): Promise<ModerationCheck> {
  if (!text || !text.trim()) return { match: null, skippedSeed: false };
  if (!isDbConfigured()) {
    // Mode seed: tidak ada kamus yang bisa dibaca — lewati dengan jujur.
    return { match: null, skippedSeed: true };
  }
  const db = getDb();
  const rows = await db.select().from(t.moderationWords).orderBy(asc(t.moderationWords.word));
  const haystack = text.toLowerCase();
  // "hold" didahulukan: satu kata tahan cukup untuk menahan materi.
  const sorted = [...rows].sort((a, b) => (a.action === "hold" ? 0 : 1) - (b.action === "hold" ? 0 : 1));
  for (const row of sorted) {
    if (wordPattern(row.word).test(haystack)) {
      return { match: { word: row.word, action: row.action }, skippedSeed: false };
    }
  }
  return { match: null, skippedSeed: false };
}

/** Samarkan semua kata beraksi "sensor" dalam teks (ganti huruf dengan *). */
export async function applySensor(text: string): Promise<string> {
  if (!isDbConfigured()) return text;
  const db = getDb();
  const rows = await db.select().from(t.moderationWords).orderBy(asc(t.moderationWords.word));
  let out = text;
  for (const row of rows) {
    if (row.action !== "sensor") continue;
    const pattern = new RegExp(`(${escapeRegExp(row.word)})`, "giu");
    out = out.replace(pattern, (m) => "*".repeat([...m].length));
  }
  return out;
}
