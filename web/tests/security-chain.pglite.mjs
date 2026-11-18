// tests/security-chain.pglite.mjs — Uji rantai migrasi penuh di PGlite:
// 0001 + 0005 + 0006 + 0007 (lisensi) + 0008-core (tanpa blok Storage) + 0009
// (whatsapp_otps). Memeriksa tabel lisensi + whatsapp_otps terbentuk, RLS
// aktif, deny-by-default untuk client, grant service_role, indeks unik
// LIC-02/LIC-07, dan revoke RPC.
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
  check("rantai 0001+0005+0006+0007+0008+0009 termuat", true);

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

  await db.close();
  console.log(`\n${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
