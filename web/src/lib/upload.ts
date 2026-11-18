// Upload: batas ukuran/tipe + helper Supabase Storage.
// Aturan arsitektur §4: foto dikompresi di client (target ≤1 MB, JPEG/WebP),
// metadata EXIF dibuang SEBELUM upload. Server menolak apa pun di luar batas
// ini — jangan percaya validasi client saja.
// Bucket: article-images (path <author_id>/<file>), listing-photos
// (path <seller_id>/<file>) — dibuat migrasi drizzle/0002_storage.sql.
export const UPLOAD_LIMITS = {
  maxBytes: 1 * 1024 * 1024, // 1 MB setelah kompresi client
  allowedTypes: ["image/jpeg", "image/png", "image/webp"],
  maxPhotosPerListing: 5,
  maxPhotosPerArticle: 5,
} as const;

export function validateUploadFile(file: { size: number; type: string }): string | null {
  if (!UPLOAD_LIMITS.allowedTypes.includes(file.type as (typeof UPLOAD_LIMITS.allowedTypes)[number])) {
    return "Tipe file tidak diizinkan — hanya JPEG, PNG, atau WebP.";
  }
  if (file.size > UPLOAD_LIMITS.maxBytes) {
    return "Ukuran file melebihi 1 MB — kompres dulu sebelum mengunggah.";
  }
  if (file.size <= 0) return "File kosong.";
  return null;
}

/** Nama file aman di Storage: <userId>/<uuid>.<ext> — tanpa nama asli user. */
export function storagePath(userId: string, ext: string): string {
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext.toLowerCase()) ? ext.toLowerCase() : "jpg";
  return `${userId}/${crypto.randomUUID()}.${safeExt}`;
}
