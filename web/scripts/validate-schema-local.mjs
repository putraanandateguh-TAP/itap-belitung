// Validasi lokal schema.sql memakai PGlite (Postgres in-process, dev-only).
// BUKAN pengganti migrasi di Supabase sungguhan: Supabase menyediakan skema
// `auth` (auth.users, auth.uid()) secara native; di sini kita membuat stub
// minimal agar file migrasi bisa dieksekusi end-to-end dan trigger/fungsi
// bisa diuji. Jalankan: `node scripts/validate-schema-local.mjs`
// Keluar 0 = schema.sql dieksekusi penuh tanpa error + uji trigger lolos.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const rawSql = readFileSync(path.join(root, "replica/schema.sql"), "utf8");
// PGlite tidak menyediakan ekstensi pgcrypto/pg_trgm; Supabase menyediakannya
// secara native (dan gen_random_uuid() adalah fungsi inti PG13+). Untuk
// validasi lokal, lewati baris `create extension` + indeks trigram — keduanya
// tetap ada di schema.sql dan jalan di Supabase.
const sql = rawSql
  .split("\n")
  .filter((l) => !/^\s*create extension/i.test(l) && !/gin_trgm_ops/.test(l))
  .join("\n");

const db = new PGlite();
const failures = [];
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(name);
}

try {
  // Stub skema auth Supabase (di Supabase asli ini sudah ada).
  await db.exec(`
    create schema if not exists auth;
    create table if not exists auth.users (id uuid primary key);
    create or replace function auth.uid() returns uuid language sql stable as
      $$ select current_setting('app.test_uid', true)::uuid $$;
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
    end $$;
  `);
  await db.exec(`select set_config('app.test_uid', '11111111-1111-1111-1111-111111111111', false)`);

  await db.exec(sql);
  check("schema.sql dieksekusi penuh", true);

  const tables = await db.query(
    `select count(*)::int as n from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`);
  check("28 tabel dibuat", tables.rows[0].n === 28, `dapat ${tables.rows[0].n}`);
  const rls = await db.query(
    `select count(*)::int as n from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relrowsecurity and c.relkind='r'`);
  check("RLS aktif di 28 tabel", rls.rows[0].n === 28, `dapat ${rls.rows[0].n}`);
  const policies = await db.query(`select count(*)::int as n from pg_policies where schemaname='public'`);
  check("policy RLS dibuat", policies.rows[0].n >= 40, `dapat ${policies.rows[0].n}`);

  // --- Uji trigger/fungsi (sebagai owner, RLS di-bypass — yang diuji logika DB) ---
  const U1 = "11111111-1111-1111-1111-111111111111";
  const U2 = "22222222-2222-2222-2222-222222222222";
  await db.exec(`insert into auth.users values ('${U1}'), ('${U2}')`);
  await db.exec(`insert into public.profiles (id, email) values ('${U1}', 'penjual@contoh.id'), ('${U2}', 'pembeli@contoh.id')`);
  const listing = await db.query(
    `insert into public.listings (seller_id, title, price_cents) values ('${U1}', 'Sepeda Bekas (uji)', 50000000) returning id`);
  const listingId = listing.rows[0].id;
  const thread = await db.query(
    `insert into public.chat_threads (listing_id, buyer_id, seller_id) values ('${listingId}', '${U2}', '${U1}') returning id`);
  const threadId = thread.rows[0].id;

  // Pengirim bukan peserta harus ditolak trigger message_sender_guard.
  let blocked = false;
  try {
    await db.query(`insert into public.messages (thread_id, sender_id, text) values ('${threadId}', '33333333-3333-3333-3333-333333333333', 'x')`);
  } catch { blocked = true; }
  check("trigger: pengirim bukan peserta ditolak", blocked);
  await db.query(`insert into public.messages (thread_id, sender_id, text) values ('${threadId}', '${U2}', 'Masih ada?')`);
  check("trigger: peserta boleh kirim pesan", true);

  // Listing terjual tidak bisa kembali aktif.
  await db.query(`update public.listings set status='terjual' where id='${listingId}'`);
  let soldBlocked = false;
  try { await db.query(`update public.listings set status='aktif' where id='${listingId}'`); } catch { soldBlocked = true; }
  check("trigger: terjual -> aktif ditolak", soldBlocked);

  // Thread baru untuk listing tidak aktif ditolak.
  let threadBlocked = false;
  try {
    await db.query(`insert into public.chat_threads (listing_id, buyer_id, seller_id) values ('${listingId}', '44444444-4444-4444-4444-444444444444', '${U1}')`);
  } catch { threadBlocked = true; }
  check("trigger: thread untuk listing tidak aktif ditolak", threadBlocked);

  // Poin idempotent: award 2x untuk karya yang sama = tetap 1 baris, total 1.
  const art = await db.query(
    `insert into public.articles (author_id, channel, slug, title_id, body_id, status) values ('${U1}', 'wisata', 'uji-poin', 'Uji', 'Isi', 'published') returning id`);
  await db.query(`select public.award_contribution_point('${U1}', 'article', '${art.rows[0].id}')`);
  await db.query(`select public.award_contribution_point('${U1}', 'article', '${art.rows[0].id}')`);
  const pts = await db.query(`select count(*)::int as n, (select points_total from public.contributor_profiles where user_id='${U1}') as total from public.contribution_points where user_id='${U1}'`);
  check("fungsi: poin idempotent (1 baris, total 1)", pts.rows[0].n === 1 && pts.rows[0].total === 1, JSON.stringify(pts.rows[0]));

  // View counter atomic.
  await db.query(`select public.increment_article_views('${art.rows[0].id}')`);
  await db.query(`select public.increment_article_views('${art.rows[0].id}')`);
  const views = await db.query(`select views from public.articles where id='${art.rows[0].id}'`);
  check("fungsi: increment_article_views atomic (2)", views.rows[0].views === 2);

  // Restore listing terhapus >14 hari ditolak; <=14 hari diizinkan.
  const old = await db.query(
    `insert into public.listings (seller_id, title, price_cents, status, deleted_at) values ('${U1}', 'Lama', 100, 'dihapus', now() - interval '15 days') returning id`);
  let restoreBlocked = false;
  try { await db.query(`update public.listings set status='aktif' where id='${old.rows[0].id}'`); } catch { restoreBlocked = true; }
  check("trigger: restore >14 hari ditolak", restoreBlocked);
} catch (e) {
  check("schema.sql dieksekusi penuh", false, e.message);
}

await db.close();
if (failures.length) { console.error(`\n${failures.length} uji GAGAL: ${failures.join(", ")}`); process.exit(1); }
console.log("\nSemua uji validasi skema LOKAL lolos. Ini TIDAK membuktikan migrasi di Supabase (P1) — jalankan scripts/migrate.ts setelah proyek dibuat.");
