// Koneksi database (Drizzle + postgres-js).
// DATABASE_URL = connection string Postgres Supabase (pooler, port 6543,
// mode transaction) — diisi Teguh setelah P1. Tanpa DATABASE_URL, backend
// TIDAK tersambung (isDbConfigured() false) dan data.ts memakai fallback
// seed sementara — lihat replica/backend.md.
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
    client = postgres(process.env.DATABASE_URL, { max: 5, prepare: false });
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
