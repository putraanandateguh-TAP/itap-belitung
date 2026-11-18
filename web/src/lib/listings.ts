// Kategori marketplace + tipe bersama (client-safe — tanpa impor Drizzle/DB).
// Dipakai halaman /jual-beli, /akun/*, /chat, dan komponen kartu listing.
// Kategori ditulis baru untuk iTAP; bukan kategori Satam.
import { formatRupiah } from "./format";

export const LISTING_CATEGORIES = [
  "kendaraan",
  "elektronik",
  "rumah-tangga",
  "pakaian",
  "hobi",
  "properti",
  "jasa",
  "lainnya",
] as const;

export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

export const LISTING_CATEGORY_LABELS: Record<ListingCategory, string> = {
  kendaraan: "Kendaraan",
  elektronik: "Elektronik",
  "rumah-tangga": "Rumah tangga",
  pakaian: "Pakaian",
  hobi: "Hobi & olahraga",
  properti: "Properti",
  jasa: "Jasa",
  lainnya: "Lainnya",
};

export function isListingCategory(v: string): v is ListingCategory {
  return (LISTING_CATEGORIES as readonly string[]).includes(v);
}

/** Bentuk listing yang dikembalikan API (ringkasan publik / penuh terverifikasi). */
export interface MarketplaceListing {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  location_name: string | null;
  status: string;
  views: number;
  saves_count: number;
  likes_count: number;
  created_at: string;
  category?: string;
  seller_id?: string;
  description?: string | null;
  seller_contact?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  photos?: { storage_path: string; sort_order: number }[];
  bookmark_type?: "save" | "like";
  // A4 (M8) — kepercayaan penjual (lihat lib/marketplace.ts): hanya
  // "WhatsApp terverifikasi" yang bisa diklaim jujur; status email penjual
  // lain tidak terbaca lapisan aplikasi.
  seller_whatsapp_verified?: boolean;
  seller_since?: string | null;
  seller_active_listings?: number;
}

export interface ThreadSummary {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_price_cents: number;
  listing_status: string;
  buyer_id: string;
  seller_id: string;
  other_user_id: string;
  is_seller: boolean;
  last_message_at: string | null;
  last_message_text: string | null;
  created_at: string;
  // A4 (M8): kepercayaan lawan bicara (WhatsApp terverifikasi + sejak kapan).
  other_user_whatsapp_verified?: boolean;
  other_user_since?: string | null;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  read_at?: string | null;
}

/** Harga dalam sen (API) -> "Rp150.000". */
export function formatListingPrice(priceCents: number): string {
  return formatRupiah(Math.round(priceCents / 100));
}

/** URL publik foto listing di bucket `listing-photos` (null bila Supabase belum diisi). */
export function listingPhotoUrl(storagePath: string): string | null {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/listing-photos/${storagePath}`;
}
