// Kompresi foto listing di client (F05) — target ≤1 MB, JPEG/WebP, EXIF dibuang.
// Menggambar ulang lewat <canvas> otomatis membuang semua metadata EXIF
// (termasuk koordinat GPS) karena hanya piksel yang disalin. Tanpa pustaka
// tambahan. Dipakai form /jual-beli/pasang sebelum upload ke Storage.
import { UPLOAD_LIMITS } from "@/lib/upload";

export interface CompressedPhoto {
  blob: Blob;
  previewUrl: string;
  originalBytes: number;
  compressedBytes: number;
  originalName: string;
}

const MAX_DIMENSION = 1600;

export async function compressListingPhoto(file: File): Promise<CompressedPhoto> {
  if (!UPLOAD_LIMITS.allowedTypes.includes(file.type as (typeof UPLOAD_LIMITS.allowedTypes)[number])) {
    throw new Error("Tipe file tidak diizinkan — hanya JPEG, PNG, atau WebP.");
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung kompresi gambar.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  // Turunkan kualitas sampai ≤1 MB (mulai 0.82, turun 0.1 per percobaan).
  let quality = 0.82;
  let blob: Blob | null = null;
  for (let i = 0; i < 5; i++) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new Error("Gagal mengompresi foto.");
    if (blob.size <= UPLOAD_LIMITS.maxBytes || quality <= 0.42) break;
    quality -= 0.1;
  }
  if (!blob) throw new Error("Gagal mengompresi foto.");
  return {
    blob,
    previewUrl: URL.createObjectURL(blob),
    originalBytes: file.size,
    compressedBytes: blob.size,
    originalName: file.name,
  };
}

/** "1,2 MB" untuk label ukuran file. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
