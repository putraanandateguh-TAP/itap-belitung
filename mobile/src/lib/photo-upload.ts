// Upload foto listing — cerminan alur web/src/app/jual-beli/pasang/page.tsx:
// foto yang sudah dikompresi (photo-compress.ts) diunggah langsung ke bucket
// Storage `listing-photos`, lalu path-nya dicatat lewat
// POST /api/listings/:id/photos (maks 5 foto per listing).
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import { api } from "./api";
import { assertSupabase, supabase } from "./supabase";
import type { CompressedPhoto } from "./photo-compress";

/** Nama file aman di Storage: <userId>/<uuid>.jpg — tanpa nama asli user. */
export function storagePath(userId: string, ext = "jpg"): string {
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext.toLowerCase()) ? ext.toLowerCase() : "jpg";
  const uuid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  return `${userId}/${uuid}.${safeExt}`;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Dekode base64 ke byte — tanpa pustaka (dipakai native; web memakai fetch). */
function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, "");
  const bytes: number[] = [];
  let acc = 0;
  let bits = 0;
  for (const ch of clean) {
    if (ch === "=") break;
    acc = (acc << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acc >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

/** Baca file hasil kompresi sebagai body upload (Blob di web, byte di native). */
export async function photoToFileBody(photo: CompressedPhoto): Promise<Blob | Uint8Array> {
  if (Platform.OS === "web") {
    const res = await fetch(photo.uri);
    return res.blob();
  }
  const base64 = await FileSystem.readAsStringAsync(photo.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToBytes(base64);
}

/**
 * Unggah foto-foto terkompresi lalu catat path-nya di server.
 * Melempar error jujur bila Supabase (P1) belum dikonfigurasi — pemanggil
 * menampilkan catatan "penawaran terbit, tetapi foto gagal diunggah", seperti web.
 */
export async function uploadListingPhotos(
  listingId: string,
  userId: string,
  photos: CompressedPhoto[],
): Promise<string[]> {
  assertSupabase();
  const paths: string[] = [];
  for (const photo of photos) {
    const body = await photoToFileBody(photo);
    const path = storagePath(userId, "jpg");
    const { error } = await supabase.storage
      .from("listing-photos")
      .upload(path, body, { contentType: "image/jpeg", upsert: false });
    if (error) throw new Error(error.message);
    paths.push(path);
  }
  if (paths.length > 0) {
    await api.post(`/api/listings/${encodeURIComponent(listingId)}/photos`, { paths });
  }
  return paths;
}
