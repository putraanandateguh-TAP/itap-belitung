// Peta foto produk digital + cerita budaya ke Supabase Storage
// (bucket article-images, publik). Artikel memakai kolom `gallery` di DB
// (bukan peta ini); produk & budaya TIDAK punya kolom gambar, jadi petanya
// tinggal di kode — tanpa perubahan skema (instruksi pemilik 19 Nov 2026).
//
// File diunggah batch foto AI 19 Nov 2026, nama: <slug>-1.jpg untuk artikel
// (dipakai ulang cerita budaya yang slug-nya sama), produk-<slug>-1.jpg
// untuk produk digital. Bila file belum diunggah, entri di sini tidak
// merender apa-apa (guard `&&` di halaman).

export const STORAGE_PHOTOS_BASE =
  "https://iwravgwsxmojxtbznori.supabase.co/storage/v1/object/public/article-images";

/** Kunci = product.tag (= slug digital_products). */
export const PRODUCT_IMAGES: Record<string, string> = {
  "epic-video-generator": `${STORAGE_PHOTOS_BASE}/produk-epic-video-generator-1.jpg`,
  "itap-kasir": `${STORAGE_PHOTOS_BASE}/produk-itap-kasir-1.jpg`,
  "ebook-video-ai": `${STORAGE_PHOTOS_BASE}/produk-ebook-video-ai-1.jpg`,
  "100-prompt-sinematik": `${STORAGE_PHOTOS_BASE}/produk-100-prompt-sinematik-1.jpg`,
  "ai-prompt-pack": `${STORAGE_PHOTOS_BASE}/produk-ai-prompt-pack-1.jpg`,
  "paket-hemat-kreator": `${STORAGE_PHOTOS_BASE}/produk-paket-hemat-kreator-1.jpg`,
};

/** Kunci = culture_stories.slug — sama dengan slug artikel kanal budaya,
 * jadi memakai file yang sama dengan galeri artikel tersebut. */
export const CULTURE_IMAGES: Record<string, string> = {
  "bahasa-melayu-belitung": `${STORAGE_PHOTOS_BASE}/bahasa-melayu-belitung-1.jpg`,
  "buang-jong": `${STORAGE_PHOTOS_BASE}/buang-jong-1.jpg`,
  "makan-bedulang": `${STORAGE_PHOTOS_BASE}/makan-bedulang-1.jpg`,
  "maras-taun": `${STORAGE_PHOTOS_BASE}/maras-taun-1.jpg`,
  "seni-campak-belitung": `${STORAGE_PHOTOS_BASE}/seni-campak-belitung-1.jpg`,
};
