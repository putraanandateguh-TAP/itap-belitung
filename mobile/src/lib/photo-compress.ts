// Kompresi foto listing di client (F05) — cerminan web/src/components/photo-compress.ts.
// Target ≤1 MB, JPEG, EXIF dibuang. Dipakai form pasang aplikasi sebelum upload
// ke bucket Storage `listing-photos`.
//
// CARA KERJA PER PLATFORM:
// - Web: canvas langsung (createImageBitmap → drawImage → toBlob JPEG).
//   expo-image-manipulator 13.x di web MENGABAIKAN format + kualitas:
//   renderAsync() memanggil canvas.toBlob() tanpa argumen (selalu PNG) dan
//   saveAsync() mengabaikan SaveOptions — hasil untuk foto noise 1600px bisa
//   5,5 MB (terverifikasi 2026-11-18). Karena itu web TIDAK memakai manipulator.
//   Menggambar ulang lewat <canvas> otomatis membuang semua metadata EXIF
//   (termasuk koordinat GPS) karena hanya piksel yang disalin.
// - Native (Android/iOS): expo-image-manipulator — modul native menghormati
//   format JPEG + kualitas kompresi.
import * as FileSystem from "expo-file-system";
import type { ImagePickerAsset } from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Platform } from "react-native";

export const PHOTO_LIMITS = {
  maxBytes: 1 * 1024 * 1024, // 1 MB setelah kompresi client (sama dengan server)
  maxDimension: 1600,
  maxPhotosPerListing: 5,
  allowedTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;

export interface CompressedPhoto {
  /** URI file terkompresi (dipakai pratinjau + upload). */
  uri: string;
  width: number;
  height: number;
  originalBytes: number;
  compressedBytes: number;
  originalName: string;
}

/** "1,2 MB" untuk label ukuran file (cerminan web). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

async function getFileSize(uri: string): Promise<number> {
  if (Platform.OS === "web") {
    const res = await fetch(uri);
    const blob = await res.blob();
    return blob.size;
  }
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? (info.size ?? 0) : 0;
}

/** Jalur web: canvas — cerminan persis web/src/components/photo-compress.ts. */
async function compressOnWeb(asset: ImagePickerAsset, originalBytes: number): Promise<CompressedPhoto> {
  // tsconfig mobile tidak menyertakan lib DOM — akses API browser via globalThis.
  const g = globalThis as unknown as {
    document: {
      createElement(tag: string): {
        width: number;
        height: number;
        getContext(kind: string): {
          drawImage(image: unknown, x: number, y: number, w: number, h: number): void;
        } | null;
        toBlob(cb: (blob: Blob | null) => void, type?: string, quality?: number): void;
      };
    };
    createImageBitmap(blob: Blob): Promise<{ width: number; height: number; close(): void }>;
  };
  const blob = await (await fetch(asset.uri)).blob();
  const bitmap = await g.createImageBitmap(blob);
  const scale = Math.min(1, PHOTO_LIMITS.maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = g.document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung kompresi gambar.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  // Turunkan kualitas sampai ≤1 MB (mulai 0.82, turun 0.1 per percobaan).
  let quality = 0.82;
  let outBlob: Blob | null = null;
  for (let i = 0; i < 5; i++) {
    outBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!outBlob) throw new Error("Gagal mengompresi foto.");
    if (outBlob.size <= PHOTO_LIMITS.maxBytes || quality <= 0.42) break;
    quality -= 0.1;
  }
  if (!outBlob) throw new Error("Gagal mengompresi foto.");
  return {
    uri: URL.createObjectURL(outBlob),
    width,
    height,
    originalBytes,
    compressedBytes: outBlob.size,
    originalName: asset.fileName ?? "foto.jpg",
  };
}

/** Jalur native: expo-image-manipulator (format + kualitas dihormati modul native). */
async function compressOnNative(asset: ImagePickerAsset, originalBytes: number): Promise<CompressedPhoto> {
  const scale = Math.min(1, PHOTO_LIMITS.maxDimension / Math.max(asset.width, asset.height));
  const width = Math.max(1, Math.round(asset.width * scale));
  const height = Math.max(1, Math.round(asset.height * scale));
  let quality = 0.82;
  let last: { uri: string; width: number; height: number } | null = null;
  let compressedBytes = 0;
  for (let i = 0; i < 5; i++) {
    const out = await manipulateAsync(
      asset.uri,
      [{ resize: { width, height } }],
      { compress: quality, format: SaveFormat.JPEG },
    );
    last = out;
    compressedBytes = await getFileSize(out.uri);
    if (compressedBytes <= PHOTO_LIMITS.maxBytes || quality <= 0.42) break;
    quality -= 0.1;
  }
  if (!last) throw new Error("Gagal mengompresi foto.");
  return {
    uri: last.uri,
    width: last.width,
    height: last.height,
    originalBytes,
    compressedBytes,
    originalName: asset.fileName ?? "foto.jpg",
  };
}

/**
 * Kompres satu foto pilihan ke JPEG ≤1 MB, dimensi maks 1600 px, EXIF dibuang.
 * Menurunkan kualitas (0.82 → 0.42) sampai di bawah batas, seperti web.
 */
export async function compressListingPhoto(asset: ImagePickerAsset): Promise<CompressedPhoto> {
  const mimeType = (asset.mimeType ?? "").toLowerCase();
  if (mimeType && !(PHOTO_LIMITS.allowedTypes as readonly string[]).includes(mimeType)) {
    throw new Error("Tipe file tidak diizinkan — hanya JPEG, PNG, atau WebP.");
  }
  const originalBytes = asset.fileSize ?? (await getFileSize(asset.uri));
  if (Platform.OS === "web") return compressOnWeb(asset, originalBytes);
  return compressOnNative(asset, originalBytes);
}
