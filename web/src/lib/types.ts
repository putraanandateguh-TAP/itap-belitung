// Tipe data portal iTAP Belitung — mengikuti model data architecture.md §2
// (subset fase M0–M2). Satu sumber kebenaran untuk layar + API palsu.

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
  /** null = belum ada terjemahan EN (state kosong tab EN, recon F01) */
  title_en: string | null;
  body_id: string[];
  body_en: string[] | null;
  /** Galeri: tanpa URL foto asli di fase ini — komponen merender placeholder. */
  gallery: { alt: string; caption: string }[];
  location_name: string;
  location_lat: number | null;
  location_lng: number | null;
  source: string;
  source_url: string | null;
  /** true = agregasi tautan media lain (berita.json situs lama), bukan artikel iTAP */
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

export interface Contribution {
  id: string;
  title_id: string;
  title_en: string;
  body_id: string;
  body_en: string;
  channel: Channel;
  category_id: string;
  location_name: string;
  source: string;
  status: ArticleStatus;
  views: number;
  note_from_editor: string | null;
  updated_at: string;
}

export interface ContributionPoint {
  id: string;
  source_type: "article" | "info";
  source_id: string;
  source_title: string;
  points: number;
  awarded_at: string;
}

export interface ContributorDashboard {
  total_views: number;
  approved_count: number;
  pending_count: number;
  draft_count: number;
  points_total: number;
  submissions: Contribution[];
}

export interface Report {
  id: string;
  target_type: "listing" | "account" | "comment";
  target_label: string;
  reporter: string;
  reason: string;
  status: "open" | "reviewed" | "hidden" | "dismissed";
  created_at: string;
}

export interface ModerationWord {
  id: string;
  word: string;
  action: "sensor" | "hold";
}

/** Kiriman info warga (S22 — kurasi redaksi, calon referensi AI). */
export interface InfoSubmission {
  id: string;
  user_id: string;
  user_name: string;
  text: string;
  status: "pending" | "approved" | "rejected";
  curated_for_ai: boolean;
  created_at: string;
}

/** Satu baris blokir akun (F08): siapa memblokir siapa. */
export interface BlockEntry {
  id: string;
  blocker_id: string;
  blocker_name: string;
  blocked_id: string;
  blocked_name: string;
  created_at: string;
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

export interface MarketRates {
  ihsg: { value: number; change: number; percent: number; as_of: string; source: string; fetched_at: string };
  gold: { price_1g: number; previous: number; date: string; source: string; fetched_at: string };
  currencies: { code: string; buy_erate: number; sell_erate: number; buy_tt: number; sell_tt: number; buy_bn: number; sell_bn: number }[];
  fx_source: string;
  fx_fetched_at: string;
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  deadline: string | null;
  source: string;
  source_url: string;
  region: string;
  posted_at: string;
}

export interface DigitalProduct {
  id: string;
  name: string;
  tag: string;
  desc: string;
  price: number;
  was_price: number | null;
  price_note: string;
  badge: string | null;
}

export interface Service {
  id: string;
  name: string;
  desc: string;
  price_from: number;
  price_note: string;
  features: string[];
}

export interface KedaiMenuItem {
  id: string;
  name: string;
  desc: string;
  price: number | null;
  category: string;
  available: boolean;
  /** true = harga/nama BUKAN dari repo lama; contoh yang harus diganti data asli */
  isExample: boolean;
}

export interface Kedai {
  name: string;
  address: string;
  hours: string;
  maps_url: string;
  grabfood_url: string;
  gofood_url: string;
  whatsapp: string;
  menu: KedaiMenuItem[];
}

export type Role = "reader" | "contributor" | "admin_portal" | "superadmin";

/** Cerita budaya (S34–S35, F15) — bentuk yang sama dengan tabel
 * culture_stories di schema.sql. lyrics null = belum ada lirik dari
 * sumber nyata (jangan dikarang); sources = daftar sumber bacaan. */
export type CultureCategory =
  | "upacara" | "tari_musik" | "lagu" | "kuliner_tradisi"
  | "cerita_rakyat" | "bahasa" | "sejarah_timah";

export interface CultureStory {
  id: string;
  slug: string;
  category: CultureCategory;
  title: string;
  body: string;
  lyrics: string | null;
  sources: string[];
  created_at: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}
