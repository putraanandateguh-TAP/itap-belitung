// scripts/seed-staging.ts — menjalankan seed dummy STAGING ke database staging.
//   STAGING_DATABASE_URL='postgresql://...' \
//   STAGING_ADMIN_ID='<uuid>' STAGING_BUYER_ID='<uuid>' STAGING_READER_ID='<uuid>' \
//   npm run db:seed:staging
//
// SAFETY (mengikat):
// - Runner ini HANYA membaca STAGING_DATABASE_URL — TIDAK PERNAH DATABASE_URL.
//   Variabel yang berbeda nama ini yang mencegah seed dummy salah sasaran
//   ke production. Bila STAGING_DATABASE_URL mengandung ref production
//   (iwravgwsxmojxtbznori), runner MENOLAK jalan.
// - Tiga UUID akun test wajib diisi (env STAGING_*_ID); tanpa itu, seed
//   berhenti sebelum menyentuh database — placeholder UUID di file SQL
//   tidak boleh dipakai apa adanya.
// - File SQL diganti UUID placeholder-nya secara tekstual (bukan string
//   interpolation ke query) sebelum dieksekusi; nilai UUID divalidasi
//   formatnya dulu.
// - Idempotent: file SQL memakai ON CONFLICT DO NOTHING; aman diulang.
// - Jalankan HANYA setelah migrasi 0001–0004 jalan di staging
//   (lihat web/docs/STAGING.md §3). Tanpa migrasi 0004 (lisensi, PR #24),
//   bagian lisensi gagal dan runner berhenti dengan error.
import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

export const PRODUCTION_REF = "iwravgwsxmojxtbznori";
export const PLACEHOLDER_IDS = {
  admin: "11111111-1111-4111-8111-111111111111",
  buyer: "22222222-2222-4222-8222-222222222222",
  reader: "33333333-3333-4333-8333-333333333333",
} as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateStagingSeedEnv(env: Record<string, string | undefined>): {
  url: string;
  adminId: string;
  buyerId: string;
  readerId: string;
} {
  const url = env.STAGING_DATABASE_URL ?? "";
  if (!url) {
    throw new Error(
      "STAGING_DATABASE_URL belum diisi. Isi dari proyek Supabase STAGING (bukan production).",
    );
  }
  if (url.includes(PRODUCTION_REF)) {
    throw new Error(
      `STAGING_DATABASE_URL mengandung ref production (${PRODUCTION_REF}) — DITOLAK. Seed staging tidak boleh jalan ke production.`,
    );
  }
  const adminId = env.STAGING_ADMIN_ID ?? "";
  const buyerId = env.STAGING_BUYER_ID ?? "";
  const readerId = env.STAGING_READER_ID ?? "";
  for (const [name, v] of [
    ["STAGING_ADMIN_ID", adminId],
    ["STAGING_BUYER_ID", buyerId],
    ["STAGING_READER_ID", readerId],
  ] as const) {
    if (!UUID_RE.test(v)) {
      throw new Error(
        `${name} harus UUID valid id akun test staging (auth.users). ` +
          `Dapatkan dari Dashboard Auth staging — jangan pakai placeholder.`,
      );
    }
    if (
      v.toLowerCase() ===
      PLACEHOLDER_IDS[
        name === "STAGING_ADMIN_ID"
          ? "admin"
          : name === "STAGING_BUYER_ID"
            ? "buyer"
            : "reader"
      ].toLowerCase()
    ) {
      throw new Error(`${name} masih placeholder — ganti dengan id akun test staging.`);
    }
  }
  return { url, adminId, buyerId, readerId };
}

export function substituteSeedIds(
  sql: string,
  ids: { adminId: string; buyerId: string; readerId: string },
): string {
  return sql
    .split(PLACEHOLDER_IDS.admin).join(ids.adminId)
    .split(PLACEHOLDER_IDS.buyer).join(ids.buyerId)
    .split(PLACEHOLDER_IDS.reader).join(ids.readerId);
}

async function main(): Promise<void> {
  const { url, adminId, buyerId, readerId } = validateStagingSeedEnv(process.env);
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const raw = readFileSync(path.join(dir, "seed-staging.sql"), "utf8");
  const sqlText = substituteSeedIds(raw, { adminId, buyerId, readerId });
  const sql = postgres(url, { max: 1 });
  try {
    await sql.unsafe(sqlText);
    const counts = await sql`
      select 'kategori' as tabel, count(*)::int as n from public.categories where slug like 'staging-test-%'
      union all select 'artikel', count(*)::int from public.articles where slug like 'staging-test-%'
      union all select 'listing', count(*)::int from public.listings where title like '[STAGING-TEST]%'
      union all select 'lisensi', count(*)::int from public.licenses where buyer_name like '%(staging)%'`;
    for (const r of counts) console.log(`seed staging: ${r.tabel} = ${r.n}`);
    const expect: Record<string, number> = { kategori: 2, artikel: 3, listing: 3, lisensi: 7 };
    const bad = counts.filter((r) => expect[r.tabel as string] !== r.n);
    if (bad.length > 0) {
      console.error("JUMLAH SEED TIDAK SESUAI:", JSON.stringify(bad));
      process.exit(1);
    }
    console.log("seed staging: OK (2 kategori, 3 artikel, 3 listing, 7 lisensi)");
  } finally {
    await sql.end();
  }
}

// Hanya jalan sebagai CLI, bukan saat di-import test.
if (process.argv[1] && process.argv[1].endsWith("seed-staging.ts")) {
  main().catch((e) => {
    console.error("GAGAL seed staging:", (e as Error).message);
    process.exit(1);
  });
}
