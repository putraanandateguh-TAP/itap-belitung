// scripts/migrate.ts — menjalankan file migrasi SQL (drizzle/*.sql) ke
// Postgres Supabase. Dipakai setelah P1 (proyek dibuat + DATABASE_URL diisi).
//   DATABASE_URL=postgresql://postgres.<ref>:<password>@<host>:6543/postgres \
//     npm run db:migrate
// Urutan: 0001_init.sql (schema.sql) -> 0002_storage.sql -> 0003_*.
// 0002 hanya jalan di Supabase (butuh skema storage.*); bila gagal di
// Postgres biasa, lewati dengan pesan yang jelas.
// TIDAK membuat akun/layanan — hanya menjalankan SQL ke database milik Teguh.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../drizzle");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL belum diisi. Lihat replica/backend.md § P1.");
  process.exit(1);
}
async function main(): Promise<void> {
  // `url` sudah dijaga di atas (process.exit bila kosong); `!` hanya untuk
  // TypeScript — narrowing modul tidak terbawa ke dalam main() (BUG-004:
  // `npm run typecheck` gagal sebelum perbaikan ini).
  const sql = postgres(url!, { max: 1 });
  let failed = false;
  for (const f of files) {
    const full = path.join(dir, f);
    try {
      await sql.unsafe(readFileSync(full, "utf8"));
      console.log(`OK  ${f}`);
    } catch (e) {
      failed = true;
      console.error(`GAGAL ${f}: ${(e as Error).message}`);
      if (f === "0002_storage.sql") {
        console.error("  -> 0002 butuh Supabase (skema storage.*). Jalankan manual di Supabase SQL Editor bila perlu.");
      } else {
        break;
      }
    }
  }
  await sql.end();
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
