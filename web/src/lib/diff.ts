// Diff berbasis baris (tanpa dependensi) — dipakai Riwayat Revisi untuk
// membandingkan snapshot isi antar versi artikel. LCS sederhana; untuk teks
// yang sangat panjang (>250 ribu sel matriks) fallback ke blok utuh supaya
// tidak mengunci UI. Bukan diff kata-per-kata: cukup untuk melihat paragraf
// yang ditambah / dihapus / dipertahankan antar revisi.
export interface DiffLine {
  type: "same" | "add" | "del";
  text: string;
}

function splitLines(s: string): string[] {
  const lines = s.replace(/\r\n/g, "\n").split("\n");
  // Buang baris kosong di ujung (pemisah paragraf ganda di akhir).
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  return lines;
}

/** Bandingkan dua teks per baris. Baris kosong di tengah dipertahankan. */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = splitLines(oldText);
  const b = splitLines(newText);
  if (a.length === 0 && b.length === 0) return [];
  if (a.length === 0) return b.map((text) => ({ type: "add" as const, text }));
  if (b.length === 0) return a.map((text) => ({ type: "del" as const, text }));
  if (a.length * b.length > 250_000) {
    return [
      ...a.map((text) => ({ type: "del" as const, text })),
      ...b.map((text) => ({ type: "add" as const, text })),
    ];
  }
  // LCS (dynamic programming) di atas baris.
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "del", text: a[i] });
      i++;
    } else {
      out.push({ type: "add", text: b[j] });
      j++;
    }
  }
  while (i < a.length) out.push({ type: "del", text: a[i++] });
  while (j < b.length) out.push({ type: "add", text: b[j++] });
  return out;
}
