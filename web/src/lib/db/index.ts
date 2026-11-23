// Koneksi database (Drizzle + postgres-js).
// DATABASE_URL = connection string Postgres Supabase (pooler, port 6543,
// mode transaction). Tanpa DATABASE_URL, backend TIDAK tersambung
// (isDbConfigured() false) dan data.ts memakai fallback seed sementara —
// lihat replica/backend.md.
//
// PENTING (insiden 2026-11-18): DATABASE_URL sempat menunjuk pooler mode
// SESSION (port 5432) dengan batas pool Supavisor 15 koneksi, sementara
// getDb() memakai max: 5 per instans serverless — beberapa pengunjung
// bersamaan langsung menghabiskan pool (EMAXCONNSESSION) dan semua halaman
// data mengembalikan 500. Perbaikan: URL pindah ke port 6543 (transaction)
// DAN max: 1 — satu instans lambda memegang paling banyak satu koneksi;
// Supavisor yang memultipleksnya. Jangan naikkan max tanpa menaikkan
// pool_size Supabase.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/** Paksa pooler Supavisor mode TRANSACTION (6543). Audit 23 Nov 2026:
 *  produksi masih mengembalikan EMAXCONNSESSION (mode session, pool 15)
 *  saat ~12 halaman dibuka bersamaan — jadi URL session (:5432 di host
 *  *.pooler.supabase.com) ditulis ulang ke :6543 di sini, apa pun isi env. */
export function poolerUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith(".pooler.supabase.com") && (u.port === "5432" || u.port === "")) u.port = "6543";
    return u.toString();
  } catch {
    return url;
  }
}

const PG_OPTS = { max: 1, prepare: false, idle_timeout: 20, connect_timeout: 10 } as const;

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Client Drizzle (lazy). Melempar error jelas bila DATABASE_URL belum diisi. */
let client: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL belum diisi. Lihat replica/backend.md.",
    );
  }
  if (!dbInstance) {
    client = postgres(poolerUrl(process.env.DATABASE_URL), PG_OPTS);
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}

/** Koneksi mentah (dipakai scripts/migrate.ts + seed). */
export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL belum diisi — lihat replica/backend.md § P1.");
  }
  if (!client) client = postgres(poolerUrl(process.env.DATABASE_URL), PG_OPTS);
  return client;
}

export async function closeDb() {
  if (client) { await client.end({ timeout: 5 }); client = null; dbInstance = null; }
}
