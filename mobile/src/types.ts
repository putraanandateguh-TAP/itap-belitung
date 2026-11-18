// Tipe data bersama — bentuk minimal yang dipakai aplikasi, disalin dari
// site/web/src/lib/types.ts + src/lib/marketplace.ts + src/lib/daily.ts.
// TIDAK import lintas proyek: aplikasi Expo tidak boleh mengimpor dari web.
export type Channel = "berita" | "kuliner" | "wisata" | "sejarah" | "budaya" | "legenda";

export type ArticleStatus = "draft" | "review" | "published" | "unpublished" | "returned";

export interface Category {
  id: string;
  channel: Channel;
  name_id: string;
  name_en: string;
  slug: string;
}

export interface Article {
  id: string;
  slug: string;
  channel: Channel;
  category_id: string;
  title_id: string;
  title_en: string | null;
  body_id: string[];
  body_en: string[] | null;
  gallery: { alt: string; caption: string }[];
  location_name: string;
  location_lat: number | null;
  location_lng: number | null;
  source: string;
  source_url: string | null;
  external: boolean;
  author_id: string;
  status: ArticleStatus;
  published_at: string;
  views: number;
  featured: boolean;
}

export interface Comment {
  id: string;
  article_id: string;
  article_slug: string;
  author_name: string;
  text: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export type Role = "reader" | "contributor" | "admin_portal" | "superadmin";

export interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
  whatsapp_number: string | null;
  role: Role;
  language_pref: "id" | "en";
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  email_verified: boolean;
  whatsapp_verified: boolean;
  verified: boolean;
  marketplace_rules_accepted_at: string | null;
  created_at: string;
}

export interface Listing {
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
  seller_id?: string;
  description?: string | null;
  seller_contact?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  photos?: { storage_path: string; sort_order: number }[];
}

export interface ChatThread {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  last_message_at: string | null;
  last_message_text?: string | null;
  other_name?: string | null;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  read_at: string | null;
}

export interface CultureStory {
  id: string;
  slug: string;
  category: string;
  title: string;
  body: string;
  lyrics: string | null;
  sources: string[];
  created_at: string;
}

export interface DailySnapshot {
  source: string;
  scope_key: string;
  as_of: string;
  payload: unknown;
  fetched_at: string;
  stale: boolean;
  note?: string;
}

export interface DailyPriceItem {
  id: string;
  commodity: string;
  price: number;
  unit: string;
  previous_price: number | null;
  status: string;
  change_note: string;
}

export interface DailyPrices {
  source: string;
  source_url: string;
  market: string;
  source_date: string;
  fetched_at: string;
  items: DailyPriceItem[];
}

export interface ContributorDashboard {
  total_views: number;
  approved_count: number;
  pending_count: number;
  draft_count: number;
  points_total: number;
  submissions: {
    id: string;
    title_id: string;
    status: ArticleStatus;
    views: number;
    updated_at: string;
  }[];
}
