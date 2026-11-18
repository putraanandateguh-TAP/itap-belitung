// Klien HTTP untuk route API Next.js yang sama dengan web (arsitektur §3).
// Supabase client HANYA untuk Auth + Realtime, bukan untuk membaca data
// bisnis langsung — aturan sensitif hidup di API.
import { API_URL, isApiConfigured } from "./config";
import { supabase } from "./supabase";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const NOT_CONFIGURED = new ApiError(
  0,
  "NOT_CONFIGURED",
  "Alamat API belum diatur. Isi EXPO_PUBLIC_API_URL di .env, lalu jalankan ulang aplikasi.",
);

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isApiConfigured) throw NOT_CONFIGURED;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(await authHeaders()),
        ...(init.headers as Record<string, string> | undefined),
      },
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Tidak bisa menghubungi server. Periksa koneksi internet.");
  }
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `Server mengembalikan ${res.status}.`;
    throw new ApiError(res.status, res.status === 501 ? "NOT_IMPLEMENTED" : "HTTP", message);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// --- Endpoint (arsitektur §3) -------------------------------------------------

import type {
  Article,
  Category,
  ChatMessage,
  ChatThread,
  Comment,
  ContributorDashboard,
  CultureStory,
  DailyPrices,
  DailySnapshot,
  Listing,
  Paginated,
  Profile,
} from "../types";

export const endpoints = {
  articles: (channel?: string, category?: string, page = 1) =>
    api.get<Paginated<Article>>(
      `/api/articles?${new URLSearchParams({
        ...(channel ? { channel } : {}),
        ...(category ? { category } : {}),
        page: String(page),
      }).toString()}`,
    ),
  article: (slug: string) => api.get<Article>(`/api/articles/${encodeURIComponent(slug)}`),
  articleRelated: (slug: string) =>
    api.get<Article[]>(`/api/articles/${encodeURIComponent(slug)}/related`),
  articleComments: (slug: string) =>
    api.get<Comment[]>(`/api/articles/${encodeURIComponent(slug)}/comments`),
  postComment: (slug: string, text: string) =>
    api.post<Comment>(`/api/articles/${encodeURIComponent(slug)}/comments`, { text }),
  search: (q: string, sort = "terbaru", channel?: string) =>
    api.get<Paginated<Article>>(
      `/api/search?${new URLSearchParams({
        q,
        sort,
        ...(channel ? { channel } : {}),
      }).toString()}`,
    ),
  categories: (channel?: string) =>
    api.get<Category[]>(
      `/api/categories${channel ? `?channel=${encodeURIComponent(channel)}` : ""}`,
    ),
  culture: (category?: string) =>
    api.get<CultureStory[]>(
      `/api/culture${category ? `?category=${encodeURIComponent(category)}` : ""}`,
    ),
  cultureStory: (slug: string) => api.get<CultureStory>(`/api/culture/${encodeURIComponent(slug)}`),
  listings: (q?: string, page = 1) =>
    api.get<Listing[]>(
      `/api/listings?${new URLSearchParams({
        ...(q ? { q } : {}),
        page: String(page),
      }).toString()}`,
    ),
  listing: (id: string) => api.get<Listing>(`/api/listings/${encodeURIComponent(id)}`),
  createListing: (body: { title: string; description?: string; price_cents: number; location_name?: string }) =>
    api.post<Listing>("/api/listings", body),
  updateListing: (id: string, body: Partial<{ title: string; description: string; price_cents: number; location_name: string }>) =>
    api.patch<Listing>(`/api/listings/${encodeURIComponent(id)}`, body),
  confirmListing: (id: string) => api.post<Listing>(`/api/listings/${encodeURIComponent(id)}/confirm`),
  markListingSold: (id: string) => api.post<Listing>(`/api/listings/${encodeURIComponent(id)}/mark-sold`),
  deleteListing: (id: string) => api.del(`/api/listings/${encodeURIComponent(id)}`),
  bookmark: (id: string, type: "save" | "like") =>
    api.post(`/api/listings/${encodeURIComponent(id)}/bookmark`, { type }),
  unbookmark: (id: string, type: "save" | "like") =>
    api.del(`/api/listings/${encodeURIComponent(id)}/bookmark?type=${type}`),
  myListings: () => api.get<Listing[]>("/api/me/listings"),
  mySaved: () => api.get<Listing[]>("/api/me/saved"),
  reportListing: (id: string, reason: string) =>
    api.post(`/api/listings/${encodeURIComponent(id)}/report`, { reason }),
  blockUser: (id: string) => api.post(`/api/users/${encodeURIComponent(id)}/block`),
  createThread: (listingId: string) => api.post<ChatThread>("/api/threads", { listing_id: listingId }),
  myThreads: () => api.get<ChatThread[]>("/api/me/threads"),
  threadMessages: (id: string) => api.get<ChatMessage[]>(`/api/threads/${encodeURIComponent(id)}/messages`),
  sendMessage: (id: string, text: string) =>
    api.post<ChatMessage>(`/api/threads/${encodeURIComponent(id)}/messages`, { text }),
  profile: () => api.get<Profile | null>("/api/me/profile"),
  updateProfile: (body: Partial<Pick<Profile, "display_name" | "language_pref" | "location_name" | "whatsapp_number">>) =>
    api.patch<Profile>("/api/me/profile", body),
  deleteAccount: () => api.del("/api/me"),
  postDevice: (fcmToken: string) =>
    api.post("/api/devices", { fcm_token: fcmToken, platform: "android" }),
  deleteDevice: (id: string) => api.del(`/api/devices/${encodeURIComponent(id)}`),
  acceptMarketplaceRules: () => api.post("/api/auth/marketplace-rules/accept"),
  sendEmailOtp: (email: string) => api.post("/api/auth/email-otp/send", { email }),
  sendWhatsappOtp: () => api.post("/api/auth/whatsapp-otp/send"),
  verifyWhatsappOtp: (code: string) => api.post("/api/auth/whatsapp-otp/verify", { code }),
  requestPasswordReset: (email: string) => api.post("/api/auth/password-reset/request", { email }),
  daily: (source: "weather" | "prayer" | "fuel" | "transport" | "earthquake") =>
    api.get<DailySnapshot>(`/api/daily/${source}`),
  emergency: () => api.get<{ name: string; number: string }[]>("/api/daily/emergency"),
  prices: () => api.get<DailyPrices>("/api/prices"),
  contributor: () => api.get<ContributorDashboard>("/api/me/contributor"),
  aiChat: (text: string) => api.post<{ answer: string; sources?: string[] }>("/api/ai/chat", { text }),
  aiItineraries: () => api.get<{ id: string; days: unknown[]; created_at: string }[]>("/api/ai/itineraries"),
  aiFeedback: (conversationId: string, vote: "up" | "down") =>
    api.post("/api/ai/feedback", { conversation_id: conversationId, vote }),
  translate: (text: string, from: string, to: string) =>
    api.post<{ translation: string }>("/api/translate", { text, from, to }),
};
