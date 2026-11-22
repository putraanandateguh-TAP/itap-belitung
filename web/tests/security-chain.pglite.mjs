// tests/security-chain.pglite.mjs — Uji rantai migrasi penuh di PGlite:
// 0001 + 0004 (kategori listing) + 0005 + 0006 + 0007 (lisensi) + 0008-core
// (tanpa blok Storage) + 0009 (whatsapp_otps) + 0011 (SEC-09: view publik
// listings_public + cabut SELECT anon dari tabel listings). Memeriksa tabel
// lisensi + whatsapp_otps terbentuk, RLS aktif, deny-by-default untuk
// client, grant service_role, indeks unik LIC-02/LIC-07, revoke RPC, dan
// SEC-09 (anon tidak bisa baca tabel listings, bisa baca view aktif saja).
// Jalankan: npm run test:security-chain
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../drizzle");
const load = (f) => readFileSync(path.join(dir, f), "utf8");
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

async function main() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth;
    grant usage on schema auth to anon, authenticated, service_role;
    create table auth.users (id uuid primary key, email text);
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
  `);
  const stripExt = (s) => s.split("\n").filter((l) => !/^\s*create extension/i.test(l) && !/gin_trgm_ops/.test(l)).join("\n");
  await db.exec(stripExt(load("0001_init.sql")));
  await db.exec(load("0005_grants.sql"));
  await db.exec(load("0006_service_role_grants.sql"));
  await db.exec(load("0007_license_server_side.sql"));
  const m8 = load("0008_security_fixes.sql");
  await db.exec(m8.slice(0, m8.indexOf("-- SEC-12")) + m8.slice(m8.indexOf("-- SEC-13")));
  await db.exec(load("0009_whatsapp_otps.sql"));
  await db.exec(load("0004_listing_category.sql"));
  await db.exec(load("0011_sec09_listings_public.sql"));
  check("rantai 0001+0004+0005+0006+0007+0008+0009+0011 termuat", true);

  const one = async (sql, p) => (await db.query(sql, p)).rows[0];

  // Tabel lisensi + whatsapp_otps ada.
  const t = await one(`select count(*)::int n from information_schema.tables where table_schema='public' and table_name in ('licenses','license_activations','license_attempts','license_audit_log','whatsapp_otps')`);
  check("5 tabel baru (4 lisensi + whatsapp_otps) ada", t.n === 5, `dapat ${t.n}`);
  const all = await one(`select count(*)::int n from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`);
  check("total 33 tabel (28 + 5)", all.n === 33, `dapat ${all.n}`);

  // RLS aktif di tabel baru.
  const rls = await one(`select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relrowsecurity and c.relname in ('licenses','license_activations','license_attempts','license_audit_log','whatsapp_otps')`);
  check("RLS aktif di 5 tabel baru", rls.n === 5, `dapat ${rls.n}`);

  // Deny-by-default: licenses & whatsapp_otps tanpa policy SELECT untuk client
  // biasa. Satu policy SELECT admin (license_audit_log_select_admin, USING
  // current_user_role() IN admin) adalah sah — bukan kebocoran.
  const pol = await one(`select count(*)::int n from pg_policies where schemaname='public' and tablename in ('licenses','license_attempts','license_audit_log','whatsapp_otps') and (roles::text like '%anon%' or roles::text like '%authenticated%') and cmd = 'SELECT' and coalesce(qual, '') not like '%admin_portal%'`);
  check("tidak ada policy SELECT client non-admin di licenses/attempts/audit_log/whatsapp_otps", pol.n === 0, `dapat ${pol.n}`);

  // Indeks unik LIC-02 + LIC-07.
  const idx = await db.query(`select indexname from pg_indexes where schemaname='public' and indexname in ('licenses_legacy_hash_product_idx','license_activations_active_device_idx')`);
  check("indeks unik LIC-02 + LIC-07 ada", idx.rows.length === 2, JSON.stringify(idx.rows.map((r) => r.indexname)));

  // Grant service_role di tabel baru (SEC-13/LIC-04).
  await db.exec("set role service_role");
  const g = await db.query(`select * from public.licenses limit 0`);
  check("service_role bisa akses tabel licenses (grant OK)", !!g);
  await db.exec("reset role");

  // RPC dicabut dari PUBLIC (SEC-03/SEC-14) — cek lewat ACL.
  const acl = await one(`select proacl::text a from pg_proc where proname = 'award_contribution_point'`);
  check("award_contribution_point tidak lagi PUBLIC", !/PUBLIC/.test(acl.a ?? "") || /service_role/.test(acl.a ?? ""), acl.a ?? "");
  const acl2 = await one(`select proacl::text a from pg_proc where proname = 'increment_article_views'`);
  check("increment_article_views tidak lagi PUBLIC", !/PUBLIC/.test(acl2.a ?? "") || /service_role/.test(acl2.a ?? ""), acl2.a ?? "");

  // Policy RLS total (58 di 0001 + 6 storage di 0002 — storage tidak dimuat di
  // PGlite — + 0007: hitung yang termuat dan pastikan >= 58).
  const polAll = await one(`select count(*)::int n from pg_policies where schemaname='public'`);
  check("policy RLS public >= 58 (0001) + lisensi", polAll.n >= 58, `dapat ${polAll.n}`);

  // Constraint unik email (SEC-17).
  const uq = await one(`select count(*)::int n from pg_constraint where conname = 'profiles_email_unique'`);
  check("constraint profiles_email_unique ada", uq.n === 1, `dapat ${uq.n}`);

  // Trigger pengaman ada.
  const trg = await db.query(`select tgname from pg_trigger where tgname in ('profiles_insert_role_guard','profiles_sensitive_columns_guard','contributor_profile_guard','listings_counters_guard','chat_threads_listing_active') and not tgisinternal`);
  check("5 trigger pengaman ada", trg.rows.length === 5, JSON.stringify(trg.rows.map((r) => r.tgname)));

  // SEC-09 (migrasi 0011): view publik listings_public tanpa koordinat
  // persis + cabut SELECT anon dari tabel listings.
  const vw = await one(`select count(*)::int n from information_schema.views where table_schema='public' and table_name='listings_public'`);
  check("view listings_public ada", vw.n === 1, `dapat ${vw.n}`);
  const vwCols = await db.query(`select column_name from information_schema.columns where table_schema='public' and table_name='listings_public'`);
  const vwColNames = vwCols.rows.map((r) => r.column_name);
  check("view tanpa location_lat/location_lng/seller_id/description", !vwColNames.includes("location_lat") && !vwColNames.includes("location_lng") && !vwColNames.includes("seller_id") && !vwColNames.includes("description"), vwColNames.join(","));
  check("view memuat kolom publik (id/title/price_cents/location_name/status)", ["id", "title", "price_cents", "location_name", "status"].every((c) => vwColNames.includes(c)), vwColNames.join(","));
  const anonTable = await one(`select has_table_privilege('anon', 'public.listings', 'SELECT') as ok`);
  check("anon tidak punya SELECT di tabel listings", anonTable.ok === false, `has_privilege=${anonTable.ok}`);
  const anonView = await one(`select has_table_privilege('anon', 'public.listings_public', 'SELECT') as ok`);
  check("anon punya SELECT di view listings_public", anonView.ok === true, `has_privilege=${anonView.ok}`);
  const authView = await one(`select has_table_privilege('authenticated', 'public.listings_public', 'SELECT') as ok`);
  check("authenticated punya SELECT di view listings_public", authView.ok === true, `has_privilege=${authView.ok}`);

  // Perilaku sebagai anon: baca tabel DITOLAK, baca view hanya baris aktif
  // dan tanpa koordinat persis.
  await db.exec(`insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'penjual@uji.local')`);
  await db.exec(`insert into public.profiles (id, email) values ('22222222-2222-2222-2222-222222222222', 'penjual@uji.local')`);
  await db.exec(`insert into public.listings (id, seller_id, title, price_cents, location_name, location_lat, location_lng, status) values
    ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Barang aktif uji', 100000, 'Tanjungpandan', -2.75, 107.65, 'aktif'),
    ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Barang nonaktif uji', 50000, 'Membalong', -2.95, 107.45, 'dinonaktifkan')`);
  try {
    await db.exec("set role anon");
    let anonTableErr = "";
    try { await db.query(`select * from public.listings limit 1`); } catch (e) { anonTableErr = e.message; }
    check("anon SELECT tabel listings ditolak (permission denied)", /permission denied/i.test(anonTableErr), anonTableErr);
    const anonViewRows = await db.query(`select * from public.listings_public`);
    check("anon SELECT view hanya 1 baris aktif", anonViewRows.rows.length === 1, `dapat ${anonViewRows.rows.length}`);
    check("baris view tanpa kunci location_lat/location_lng", anonViewRows.rows.length === 1 && !("location_lat" in anonViewRows.rows[0]) && !("location_lng" in anonViewRows.rows[0]), JSON.stringify(Object.keys(anonViewRows.rows[0] ?? {})));
  } finally {
    await db.exec("reset role");
  }

  await db.close();
  console.log(`\n${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
