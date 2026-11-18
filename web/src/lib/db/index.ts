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

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Client Drizzle (lazy). Melempar error jelas bila DATABASE_URL belum diisi. */
let client: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL belum diisi — proyek Supabase (P1) belum dibuat. Lihat replica/backend.md § P1.",
    );
  }
  if (!dbInstance) {
    client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}

/** Koneksi mentah (dipakai scripts/migrate.ts + seed). */
export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL belum diisi — lihat replica/backend.md § P1.");
  }
  if (!client) client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  return client;
}

export async function closeDb() {
  if (client) { await client.end({ timeout: 5 }); client = null; dbInstance = null; }
}
