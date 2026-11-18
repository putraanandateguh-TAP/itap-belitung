// tests/security-0008.pglite.mjs — Uji logika migrasi 0008_security_fixes.sql
// di Postgres sungguhan (PGlite, in-memory), TANPA Supabase live.
// Memuat 0001 + 0005 + 0006 + 0008 (blok Storage dilepas — storage.* hanya
// ada di Supabase; policy Storage diuji live terpisah, lihat
// web/docs/SECURITY-LIVE-TESTS.md), lalu memainkan ulang tiap skenario
// eksploitasi SEC-01..SEC-17 sebagai peran PostgREST (authenticated) dan
// sebagai jalur server (postgres).
// Jalankan: npm run test:security-0008
// Keluar 0 bila semua cek lolos; 1 bila ada yang gagal.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../drizzle");
const load = (f) => readFileSync(path.join(dir, f), "utf8");

let pass = 0;
let fail = 0;
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

// UUID deterministik untuk pengguna uji.
const U = {
  d: "10000000-0000-0000-0000-000000000001", // pengguna baru (SEC-01)
  e: "10000000-0000-0000-0000-000000000002", // admin_portal (SEC-02)
  s: "10000000-0000-0000-0000-000000000003", // superadmin
  f: "10000000-0000-0000-0000-000000000004", // pengguna biasa
  a: "10000000-0000-0000-0000-000000000005", // penjual listing
  b: "10000000-0000-0000-0000-000000000006", // pembeli
  c: "10000000-0000-0000-0000-000000000007", // korban thread palsu
};

async function main() {
  const db = new PGlite();

  // Peran PostgREST + skema auth minimal (seperti yang disediakan Supabase).
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth;
    grant usage on schema auth to anon, authenticated, service_role;
    create table auth.users (id uuid primary key, email text);
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
  `);
  // Muat skema + grants + perbaikan (tanpa blok Storage 0008).
  // PGlite tidak menyediakan pgcrypto/pg_trgm (Supabase menyediakannya) —
  // lewati baris create extension + indeks trigram, seperti
  // scripts/validate-schema-local.mjs.
  const stripExt = (s) => s.split("\n").filter((l) => !/^\s*create extension/i.test(l) && !/gin_trgm_ops/.test(l)).join("\n");
  await db.exec(stripExt(load("0001_init.sql")));
  await db.exec(load("0005_grants.sql"));
  await db.exec(load("0006_service_role_grants.sql"));
  const m8 = load("0008_security_fixes.sql");
  const core = m8.slice(0, m8.indexOf("-- SEC-12")) + m8.slice(m8.indexOf("-- SEC-13"));
  await db.exec(core);
  check("migrasi 0001+0005+0006+0008 termuat", true);

  const asRole = async (role, sub) => {
    await db.exec(`set role ${role}`);
    await db.exec(`select set_config('request.jwt.claim.sub', '${sub ?? ""}', false)`);
  };
  const asPostgres = async () => { await db.exec("reset role"); await db.exec("select set_config('request.jwt.claim.sub', '', false)"); };
  const q = async (sql, params) => db.query(sql, params);
  const tryQ = async (sql, params) => { try { const r = await q(sql, params); return { ok: true, rows: r.rows }; } catch (e) { return { ok: false, err: String(e.message) }; } };

  // Akun Auth untuk semua pengguna uji.
  await asPostgres();
  for (const [k, id] of Object.entries(U)) {
    await q(`insert into auth.users (id, email) values ($1, $2)`, [id, `${k}@uji.local`]);
  }

  // ---- SEC-01: INSERT profil role=superadmin sebagai pengguna baru ----
  await asRole("authenticated", U.d);
  let r = await tryQ(`insert into public.profiles (id, email, role) values ($1, 'd@uji.local', 'superadmin') returning role`, [U.d]);
  check("SEC-01 insert superadmin -> tersimpan sebagai reader (bukan superadmin)", r.ok && r.rows[0]?.role === "reader", r.err ?? JSON.stringify(r.rows));
  await asPostgres();
  r = await q(`select role from public.profiles where id = $1`, [U.d]);
  check("SEC-01 role di DB benar-benar reader", r.rows[0]?.role === "reader");

  // ---- SEC-02: admin_portal UPDATE role sendiri -> superadmin ----
  await asPostgres();
  await q(`insert into public.profiles (id, email, role) values ($1, 'e@uji.local', 'admin_portal')`, [U.e]);
  await q(`insert into public.profiles (id, email, role) values ($1, 's@uji.local', 'superadmin')`, [U.s]);
  await asRole("authenticated", U.e);
  r = await tryQ(`update public.profiles set role = 'superadmin' where id = $1`, [U.e]);
  check("SEC-02 admin_portal promosi diri -> DITOLAK", !r.ok, r.err ?? "lolos!");
  // admin_portal mengubah role pengguna LAIN ke contributor -> boleh.
  r = await tryQ(`update public.profiles set role = 'contributor' where id = $1`, [U.d]);
  check("SEC-02 admin_portal ubah role orang lain ke contributor -> diizinkan", r.ok, r.err ?? "");
  // admin_portal menetapkan superadmin ke orang lain -> ditolak.
  r = await tryQ(`update public.profiles set role = 'superadmin' where id = $1`, [U.d]);
  check("SEC-02 admin_portal tetapkan superadmin ke orang lain -> DITOLAK", !r.ok, r.err ?? "lolos!");
  // superadmin mengubah role siapa pun -> boleh.
  await asRole("authenticated", U.s);
  r = await tryQ(`update public.profiles set role = 'contributor' where id = $1`, [U.d]);
  check("SEC-02 superadmin ubah role -> diizinkan", r.ok, r.err ?? "");
  // Jalur server (postgres) tetap boleh mengubah role (route admin via Drizzle).
  await asPostgres();
  r = await tryQ(`update public.profiles set role = 'reader' where id = $1`, [U.d]);
  check("SEC-02 jalur server ubah role -> diizinkan", r.ok, r.err ?? "");

  // ---- SEC-05: UPDATE whatsapp_verified_at sendiri ----
  await asRole("authenticated", U.d);
  r = await tryQ(`update public.profiles set whatsapp_verified_at = now() where id = $1`, [U.d]);
  check("SEC-05 isi whatsapp_verified_at sendiri -> DITOLAK", !r.ok, r.err ?? "lolos!");
  r = await tryQ(`update public.profiles set display_name = 'Dodo' where id = $1`, [U.d]);
  check("SEC-05 ubah display_name sendiri -> diizinkan", r.ok, r.err ?? "");

  // ---- SEC-03: RPC award_contribution_point ----
  await asRole("authenticated", U.f);
  r = await tryQ(`select public.award_contribution_point($1, 'article', gen_random_uuid())`, [U.f]);
  check("SEC-03 RPC sebagai user biasa -> DITOLAK (permission denied)", !r.ok && /permission denied/i.test(r.err ?? ""), r.err ?? "lolos!");
  await asRole("anon", null);
  r = await tryQ(`select public.award_contribution_point($1, 'article', gen_random_uuid())`, [U.f]);
  check("SEC-03 RPC sebagai anon -> DITOLAK", !r.ok, r.err ?? "lolos!");
  // Jalur server: artikel published -> poin masuk; artikel draft -> tidak.
  await asPostgres();
  await q(`insert into public.profiles (id, email, role) values ($1, 'f@uji.local', 'reader')`, [U.f]);
  await q(`insert into public.articles (id, author_id, channel, slug, title_id, body_id, status) values (gen_random_uuid(), $1, 'wisata', 'art-pub', 'T', 'B', 'published') returning id`, [U.f]).then(async (res) => {
    const artPub = res.rows[0].id;
    await q(`select public.award_contribution_point($1, 'article', $2)`, [U.f, artPub]);
    const pts = await q(`select points_total from public.contributor_profiles where user_id = $1`, [U.f]);
    check("SEC-03 RPC server untuk artikel published -> poin 1", pts.rows[0]?.points_total === 1, JSON.stringify(pts.rows));
  });
  const artDraft = (await q(`insert into public.articles (author_id, channel, slug, title_id, body_id, status) values ($1, 'wisata', 'art-draft', 'T', 'B', 'draft') returning id`, [U.f])).rows[0].id;
  await q(`select public.award_contribution_point($1, 'article', $2)`, [U.f, artDraft]);
  const pts2 = await q(`select count(*)::int as n from public.contribution_points where source_id = $1`, [artDraft]);
  check("SEC-03 RPC server untuk artikel draft -> TIDAK ada poin", pts2.rows[0]?.n === 0, JSON.stringify(pts2.rows));

  // ---- SEC-14: RPC increment_*_views ----
  await asRole("authenticated", U.f);
  r = await tryQ(`select public.increment_article_views(gen_random_uuid())`);
  check("SEC-14 RPC views sebagai user -> DITOLAK", !r.ok, r.err ?? "lolos!");
  await asPostgres();
  const artId = (await q(`select id from public.articles where slug = 'art-pub'`)).rows[0].id;
  await q(`select public.increment_article_views($1)`, [artId]);
  const v = await q(`select views from public.articles where id = $1`, [artId]);
  check("SEC-14 RPC views via server -> views 1", v.rows[0]?.views === 1, JSON.stringify(v.rows));

  // ---- SEC-04: contributor_profiles ----
  // Pakai pengguna D (sudah punya profil, belum punya baris contributor —
  // baris F sudah dibuat RPC SEC-03, jadi F tidak bisa dipakai untuk INSERT).
  await asRole("authenticated", U.d);
  r = await tryQ(`insert into public.contributor_profiles (user_id, verification_status, auto_approve, points_total) values ($1, 'verified', true, 9999) returning verification_status, auto_approve, points_total`, [U.d]);
  check("SEC-04 insert verified/poin 9999 -> dipaksa default (unverified/false/0)", r.ok && r.rows[0]?.verification_status === "unverified" && r.rows[0]?.auto_approve === false && r.rows[0]?.points_total === 0, r.err ?? JSON.stringify(r.rows));
  r = await tryQ(`update public.contributor_profiles set points_total = 9999 where user_id = $1`, [U.d]);
  check("SEC-04 update points_total sendiri -> DITOLAK", !r.ok, r.err ?? "lolos!");
  r = await tryQ(`update public.contributor_profiles set institution = 'Kampus' where user_id = $1`, [U.d]);
  check("SEC-04 update institution sendiri -> diizinkan", r.ok, r.err ?? "");

  // ---- SEC-07: info_submissions status=approved ----
  await asRole("authenticated", U.f);
  r = await tryQ(`insert into public.info_submissions (user_id, text, status) values ($1, 'x', 'approved')`, [U.f]);
  check("SEC-07 insert info approved -> DITOLAK", !r.ok, r.err ?? "lolos!");
  r = await tryQ(`insert into public.info_submissions (user_id, text, status) values ($1, 'x', 'pending') returning id`, [U.f]);
  check("SEC-07 insert info pending -> diizinkan", r.ok, r.err ?? "");

  // ---- SEC-08: reports status=disemissed + moderator_note ----
  r = await tryQ(`insert into public.reports (reporter_id, target_type, target_id, reason, status, moderator_note) values ($1, 'listing', gen_random_uuid(), 'spam', 'dismissed', 'palsu')`, [U.f]);
  check("SEC-08 insert laporan dismissed+note -> DITOLAK", !r.ok, r.err ?? "lolos!");
  r = await tryQ(`insert into public.reports (reporter_id, target_type, target_id, reason) values ($1, 'listing', gen_random_uuid(), 'spam') returning status`, [U.f]);
  check("SEC-08 insert laporan biasa -> status open", r.ok && r.rows[0]?.status === "open", r.err ?? JSON.stringify(r.rows));

  // ---- SEC-10: chat_threads seller palsu ----
  await asPostgres();
  await q(`insert into public.profiles (id, email, role) values ($1, 'a@uji.local', 'reader')`, [U.a]);
  await q(`insert into public.profiles (id, email, role) values ($1, 'b@uji.local', 'reader')`, [U.b]);
  await q(`insert into public.profiles (id, email, role) values ($1, 'c@uji.local', 'reader')`, [U.c]);
  const listingId = (await q(`insert into public.listings (seller_id, title, price_cents, status) values ($1, 'Barang', 1000, 'aktif') returning id`, [U.a])).rows[0].id;
  await asRole("authenticated", U.b);
  r = await tryQ(`insert into public.chat_threads (listing_id, buyer_id, seller_id) values ($1, $2, $3)`, [listingId, U.b, U.c]);
  check("SEC-10 thread dengan seller palsu -> DITOLAK", !r.ok, r.err ?? "lolos!");
  r = await tryQ(`insert into public.chat_threads (listing_id, buyer_id, seller_id) values ($1, $2, $3) returning id`, [listingId, U.b, U.a]);
  check("SEC-10 thread dengan seller benar -> diizinkan", r.ok, r.err ?? "");

  // ---- SEC-15: article_revisions artikel orang lain ----
  r = await tryQ(`insert into public.article_revisions (article_id, editor_id, changes) values ($1, $2, '{}')`, [artId, U.b]);
  check("SEC-15 revisi artikel orang lain -> DITOLAK", !r.ok, r.err ?? "lolos!");
  await asRole("authenticated", U.f);
  r = await tryQ(`insert into public.article_revisions (article_id, editor_id, changes) values ($1, $2, '{}')`, [artId, U.f]);
  check("SEC-15 revisi artikel sendiri (penulis) -> diizinkan", r.ok, r.err ?? "");

  // ---- SEC-16: counter listing ----
  await asRole("authenticated", U.a);
  r = await tryQ(`update public.listings set views = 999 where id = $1`, [listingId]);
  check("SEC-16 penjual ubah views sendiri -> DITOLAK", !r.ok, r.err ?? "lolos!");
  r = await tryQ(`update public.listings set title = 'Barang Baru' where id = $1`, [listingId]);
  check("SEC-16 penjual ubah judul sendiri -> diizinkan", r.ok, r.err ?? "");
  await asPostgres();
  r = await tryQ(`select public.increment_listing_views($1)`, [listingId]);
  const lv = await q(`select views from public.listings where id = $1`, [listingId]);
  check("SEC-16 RPC views via server -> views 1", r.ok && lv.rows[0]?.views === 1, r.err ?? JSON.stringify(lv.rows));

  // ---- SEC-17: email unik ----
  await asPostgres();
  r = await tryQ(`insert into public.profiles (id, email, role) values (gen_random_uuid(), 'd@uji.local', 'reader')`);
  check("SEC-17 email duplikat -> DITOLAK (unique)", !r.ok, r.err ?? "lolos!");

  // ---- Alur sah tetap jalan (regresi RLS dua pengguna, ringkas) ----
  await asRole("authenticated", U.b);
  r = await tryQ(`insert into public.articles (author_id, channel, slug, title_id, body_id, status) values ($1, 'wisata', 'draf-b', 'T', 'B', 'draft') returning id`, [U.b]);
  check("REGRESI user bisa buat draf sendiri", r.ok, r.err ?? "");
  r = await q(`select id from public.articles where author_id = $1 and status = 'draft'`, [U.f]);
  check("REGRESI user tidak melihat draf orang lain", r.rows.length === 0, `dapat ${r.rows.length}`);
  await asRole("anon", null);
  r = await q(`select id from public.articles where status = 'published'`);
  check("REGRESI anon baca artikel published", r.rows.length >= 1, `dapat ${r.rows.length}`);
  r = await tryQ(`select id from public.profiles where id = $1`, [U.f]);
  check("REGRESI anon tidak baca profiles (permission denied)", !r.ok && /permission denied/i.test(r.err ?? ""), r.err ?? "lolos!");

  await db.close();
  console.log(`\n${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
