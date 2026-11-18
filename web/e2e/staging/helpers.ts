// Helper black-box test staging (Workstream E).
// Semua test di web/e2e/staging/ adalah black-box HTTP: mereka hanya
// memanggil deployment staging lewat env STAGING_* — TIDAK PERNAH
// menyentuh production, TIDAK membaca .env.local, TIDAK memakai
// service-role key, dan TIDAK mengimpor kode aplikasi.
//
// Cara jalan (lihat web/docs/STAGING.md §6 + web/docs/TEST_PLAN.md):
//   set -a; source web/.env.staging.local; set +a
//   npm run test:staging
//
// Bila env staging tidak lengkap, SEMUA spec meng-skip dirinya sendiri
// (bukan gagal) — staging yang belum dibuat bukan bug aplikasi.
import { test as base, type APIRequestContext, expect } from "@playwright/test";

export const cfg = {
  baseUrl: process.env.STAGING_BASE_URL ?? "",
  supabaseUrl: process.env.STAGING_SUPABASE_URL ?? "",
  anonKey: process.env.STAGING_SUPABASE_ANON_KEY ?? "",
  admin: {
    email: process.env.STAGING_ADMIN_EMAIL ?? "",
    password: process.env.STAGING_ADMIN_PASSWORD ?? "",
  },
  buyer: {
    email: process.env.STAGING_BUYER_EMAIL ?? "",
    password: process.env.STAGING_BUYER_PASSWORD ?? "",
  },
  reader: {
    email: process.env.STAGING_READER_EMAIL ?? "",
    password: process.env.STAGING_READER_PASSWORD ?? "",
  },
};

export const stagingReady =
  Boolean(cfg.baseUrl && cfg.supabaseUrl && cfg.anonKey) &&
  Boolean(cfg.admin.email && cfg.admin.password) &&
  Boolean(cfg.buyer.email && cfg.buyer.password) &&
  Boolean(cfg.reader.email && cfg.reader.password);

export const test = base;
export { expect };

// Kode lisensi dummy dari scripts/seed-staging.sql (staging saja).
export const SEED_CODES = {
  validGenerator: "ITAP-TEST-VALD-0001",
  validKasir: "ITAP-TEST-KSR1-0005",
  expired: "ITAP-TEST-EXPR-0002",
  revoked: "ITAP-TEST-RVKD-0003",
  deviceLimit: "ITAP-TEST-DVCE-0004",
  pastExpiryActive: "ITAP-TEST-PAST-0006",
  monthly: "ITAP-TEST-MNTH-0007",
} as const;

// Login lewat Supabase Auth REST (password grant) — tidak ada route
// /api/auth/signin di aplikasi; login UI memakai supabase-js yang
// memanggil endpoint yang sama. Mengembalikan access_token (JWT).
const tokenCache = new Map<string, string>();

export async function login(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const cached = tokenCache.get(email);
  if (cached) return cached;
  const res = await request.post(
    `${cfg.supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: cfg.anonKey, "Content-Type": "application/json" },
      data: { email, password },
    },
  );
  expect(res.status(), `login ${email}: ${await res.text()}`).toBe(200);
  const body = (await res.json()) as { access_token?: string };
  expect(body.access_token, `login ${email} harus mengembalikan access_token`).toBeTruthy();
  tokenCache.set(email, body.access_token as string);
  return body.access_token as string;
}

export type Creds = { email: string; password: string };

export async function loginAs(request: APIRequestContext, who: Creds): Promise<string> {
  return login(request, who.email, who.password);
}

// Panggilan HTTP ke aplikasi staging (Next.js).
export async function api(
  request: APIRequestContext,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  opts: { token?: string; data?: unknown; rawBody?: string } = {},
) {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.data !== undefined || opts.rawBody !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  return request.fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers,
    data: opts.rawBody ?? (opts.data !== undefined ? JSON.stringify(opts.data) : undefined),
  });
}

// Panggilan langsung ke Edge Function Supabase staging (mem-bypass
// route Next.js — dipakai untuk uji device limit per device_id dan
// rate limit persisten Edge Function).
export async function edge(
  request: APIRequestContext,
  fn: "validate-license" | "admin-licenses",
  opts: { token?: string; data?: unknown; query?: string } = {},
) {
  const headers: Record<string, string> = { apikey: cfg.anonKey };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.data !== undefined) headers["Content-Type"] = "application/json";
  return request.fetch(
    `${cfg.supabaseUrl}/functions/v1/${fn}${opts.query ?? ""}`,
    {
      method: opts.data !== undefined ? "POST" : "GET",
      headers,
      data: opts.data !== undefined ? JSON.stringify(opts.data) : undefined,
    },
  );
}

// Suffix unik per run agar data yang dibuat test tidak bentrok antar run.
export const runId = Date.now().toString(36);
