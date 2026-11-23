import { NextResponse } from "next/server";
import { listCategories } from "@/lib/data";
import { TRANSLATOR_LANGUAGES } from "@/lib/ai";
import { checkRateLimit } from "@/lib/api";

// POST /api/translate — penerjemah 9 bahasa (F13).
//
// Kamus lokal KECIL di server: HANYA padanan dari konten bilingual ASLI
// yang sudah ada — pasangan nama kategori ID–EN dari data iTAP
// (listCategories: "Kuliner Lokal" ↔ "Local Food", dst.). Pencocokan
// persis seluruh teks (tanpa ubah huruf/besar-kecil/spasi berlebih).
// Tanpa padanan → 501 jujur; fallback Gemini belum ada (P3 — kunci
// Gemini milik Teguh). JANGAN mengarang terjemahan.

const LANG_CODES: Set<string> = new Set(TRANSLATOR_LANGUAGES.map((l) => l.code));

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

async function localDictionary(): Promise<Map<string, string>> {
  const dict = new Map<string, string>();
  const categories = await listCategories();
  for (const c of categories) {
    const id = normalize(c.name_id);
    const en = normalize(c.name_en);
    if (!id || !en) continue;
    // id → en dan en → id (hanya pasangan yang memang ada di data).
    dict.set(`id|en|${id}`, c.name_en);
    dict.set(`en|id|${en}`, c.name_id);
  }
  return dict;
}

export async function POST(req: Request) {
  const limited = checkRateLimit(req, "translate", 60);
  if (limited) return limited;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Isi permintaan harus JSON." }, { status: 400 });
  }
  const { text, from, to } =
    (body as { text?: unknown; from?: unknown; to?: unknown }) ?? {};
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Tulis dulu teks yang mau diterjemahkan." }, { status: 400 });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: "Teks terlalu panjang (maks. 2.000 karakter)." }, { status: 400 });
  }
  if (typeof from !== "string" || !LANG_CODES.has(from) || typeof to !== "string" || !LANG_CODES.has(to)) {
    return NextResponse.json({ error: "Bahasa sumber/tujuan tidak dikenal." }, { status: 400 });
  }
  const clean = text.trim();
  // Validasi di atas sudah memastikan from/to anggota LANG_CODES.
  const fromLang = from as (typeof TRANSLATOR_LANGUAGES)[number]["code"];
  const toLang = to as (typeof TRANSLATOR_LANGUAGES)[number]["code"];
  if (fromLang === toLang) {
    // Bahasa sama — tidak ada yang diterjemahkan; kembalikan apa adanya.
    return NextResponse.json({ translation: clean, from, to, source: "same-language" });
  }

  const dict = await localDictionary();
  const hit = dict.get(`${fromLang}|${toLang}|${normalize(clean)}`);
  if (hit) {
    return NextResponse.json({ translation: hit, from, to, source: "kamus-lokal" });
  }

  // Kamus lokal hanya berisi padanan istilah kategori ID–EN; teks lain
  // butuh Gemini (P3) yang belum ada. Jawab 501, bukan terjemahan karangan.
  return NextResponse.json(
    {
      error:
        "Penerjemah belum tersedia untuk teks ini — kamus lokal hanya berisi padanan istilah kategori Indonesia–English dari konten iTAP, dan kunci Gemini (Fase 3, P3) belum ada.",
    },
    { status: 501 },
  );
}
