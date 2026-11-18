// Uji E2E auth melawan Supabase live (proyek itap-belitung) + dev server lokal.
// - Membaca SEMUA secret dari web/.env.local saat runtime; TIDAK ada secret hardcode.
// - Membuat 2 akun uji terisolasi (@itap.local), menguji reset + signup/verifikasi,
//   lalu MENGHAPUS keduanya. Jangan pernah jalankan terhadap akun admin.
// - Jalankan: node scripts/test-auth-e2e.mjs  (dari direktori web, dev server jalan di :3103)
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

// Tukarkan token fragment (#access_token/#refresh_token dari link email)
// menjadi cookie sesi aplikasi, persis seperti yang dilakukan browser client
// di halaman /masuk saat pengguna mendarat dari link reset.
async function cookieFromFragmentTokens(accessToken, refreshToken) {
  const jar = new Map();
  const browser = createBrowserClient(SUPA_URL, ANON, {
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (list) => { for (const { name, value } of list) { if (!value) jar.delete(name); else jar.set(name, value); } },
    },
  });
  const { error } = await browser.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) return { error: error.message, cookie: "" };
  return { cookie: [...jar.entries()].map(([n, v]) => `${n}=${v}`).join("; ") };
}

const SKIP_EMAIL_SEND = process.env.SKIP_EMAIL_SEND === "1"; // lewati langkah yang mengirim email asli (kuota email Supabase habis); sudah terbukti di run sebelumnya
const BASE = process.env.E2E_BASE ?? "http://127.0.0.1:3103";
const SITE = "https://itapbelitung.my.id";

// --- muat .env.local (tanpa mencetak nilainya) ---
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
}
const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !ANON || !SERVICE) { console.error("FATAL: .env.local belum lengkap (URL/ANON/SERVICE)"); process.exit(2); }

const admin = createClient(SUPA_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = () => createClient(SUPA_URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

const rand = (n = 8) => randomBytes(n).toString("hex");
const pass = () => "Pw!" + randomBytes(9).toString("base64").replace(/[^A-Za-z0-9]/g, "x").slice(0, 14);
let failures = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? " — " + extra : ""}`);
  if (!ok) failures++;
}
async function jfetch(path, opts = {}) {
  const res = await fetch(BASE + path, opts);
  const text = await res.text();
  let body = null; try { body = JSON.parse(text); } catch { /* html */ }
  return { res, body, text };
}
function cookiesFrom(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  return raw.map((c) => c.split(";")[0]).join("; ");
}
// Tukarkan code recovery/signup lewat route callback aplikasi (server-side exchange).
async function exchangeViaCallback(code, next) {
  const res = await fetch(`${BASE}/api/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`, { redirect: "manual" });
  const loc = res.headers.get("location") ?? "";
  return { status: res.status, location: loc, cookie: cookiesFrom(res) };
}
// Ikuti hop Supabase /auth/v1/verify (token_hash) -> redirect_to + fragment
// #access_token/#refresh_token. Ini persis yang terjadi saat pengguna mengklik
// link di email reset/verifikasi (aliran implicit, BUKAN ?code=).
async function tokensFromActionLink(link) {
  const res = await fetch(link, { redirect: "manual" });
  const loc = res.headers.get("location") ?? "";
  const frag = new URLSearchParams((new URL(loc).hash || "#").slice(1));
  return { status: res.status, location: loc, accessToken: frag.get("access_token"), refreshToken: frag.get("refresh_token") };
}
function parseActionLink(link) {
  const u = new URL(link);
  const frag = new URLSearchParams((u.hash || "#").slice(1));
  return {
    code: u.searchParams.get("code"),
    tokenHash: u.searchParams.get("token_hash") ?? u.searchParams.get("token"),
    type: u.searchParams.get("type"),
    accessToken: frag.get("access_token"),
    refreshToken: frag.get("refresh_token"),
  };
}

const tag = rand(6);
const emailA = `parity-test-${tag}a@itap.local`; // alur reset
const emailB = `parity-test-${tag}b@itap.local`; // alur signup -> verifikasi
const pwAOld = pass(); const pwANew = pass(); const pwB = pass();
let userA = null, userB = null;

try {
  // ---------- 0. baseline ----------
  const { data: before } = await admin.auth.admin.listUsers({ perPage: 50 });
  const baselineIds = new Set((before?.users ?? []).map((u) => u.id));
  check("baseline: jumlah user tercatat", true, `${before?.users?.length ?? "?"} user`);
  const adminId = [...baselineIds][0];

  // ---------- 1. RESET E2E ----------
  // 1a. buat akun uji A terkonfirmasi
  const cA = await admin.auth.admin.createUser({ email: emailA, password: pwAOld, email_confirm: true, user_metadata: { display_name: "Parity Test A" } });
  check("1a. akun uji A dibuat (email_confirm=true)", !cA.error, cA.error ? cA.error.message : `id=${String(cA.data.user?.id).slice(0, 8)}…`);
  userA = cA.data.user;
  // 1b. sign-in sebagai A -> sesi LAMA
  const sOld = await anon().auth.signInWithPassword({ email: emailA, password: pwAOld });
  check("1b. sign-in A (password lama) berhasil", !sOld.error, sOld.error?.message ?? "sesi lama diperoleh");
  const oldAccess = sOld.data.session?.access_token;
  // 1c. minta link reset via route aplikasi (jalur asli pengguna; mengirim email asli)
  if (SKIP_EMAIL_SEND) { console.log("SKIP  1c. POST /api/auth/password-reset/request (SKIP_EMAIL_SEND; sudah PASS di run sebelumnya)"); }
  else {
    const rReq = await jfetch("/api/auth/password-reset/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: emailA }) });
    check("1c. POST /api/auth/password-reset/request -> 200 ok:true", rReq.res.status === 200 && rReq.body?.ok === true, `status=${rReq.res.status}`);
  }
  // 1d. generateLink recovery (mesin code-exchange yang sama, tanpa butuh inbox)
  const link = await admin.auth.admin.generateLink({ type: "recovery", email: emailA, options: { redirectTo: `${SITE}/masuk?reset=1` } });
  check("1d. Admin generateLink recovery", !link.error, link.error?.message ?? "link diperoleh");
  const parts = parseActionLink(link.data?.properties?.action_link ?? "");
  check("1d. action_link mengandung token_hash recovery", !!parts.tokenHash, parts.tokenHash ? "token_hash=<disembunyikan>" : "tidak ada token");
  // 1d2. ikuti hop /verify Supabase persis seperti klik link email -> token fragment
  const hop = await tokensFromActionLink(link.data?.properties?.action_link ?? "");
  check("1d2. hop /auth/v1/verify -> redirect ke /masuk?reset=1#access_token=…", !!hop.accessToken && hop.location.startsWith(`${SITE}/masuk?reset=1#`), `status=${hop.status}`);
  // 1e. tukar token fragment jadi cookie sesi aplikasi (cara browser client di /masuk)
  const sess = await cookieFromFragmentTokens(hop.accessToken, hop.refreshToken);
  check("1e. token fragment -> cookie sesi aplikasi", !sess.error && !!sess.cookie, sess.error ?? "cookie diperoleh");
  const ex = { cookie: sess.cookie ?? "" };
  // 1f. confirm: set password baru dengan sesi hasil exchange
  const rConf = await jfetch("/api/auth/password-reset/confirm", { method: "POST", headers: { "content-type": "application/json", cookie: ex.cookie }, body: JSON.stringify({ token: "recovery-session", password: pwANew }) });
  check("1f. POST /api/auth/password-reset/confirm -> 200 ok:true", rConf.res.status === 200 && rConf.body?.ok === true, `status=${rConf.res.status} ${JSON.stringify(rConf.body ?? {})}`);
  // 1g. sign-in password baru HARUS berhasil; password lama HARUS gagal
  const sNew = await anon().auth.signInWithPassword({ email: emailA, password: pwANew });
  check("1g. sign-in A (password BARU) berhasil", !sNew.error, sNew.error?.message ?? "");
  const sOldPw = await anon().auth.signInWithPassword({ email: emailA, password: pwAOld });
  check("1g. sign-in A (password LAMA) ditolak", !!sOldPw.error, sOldPw.error?.message ?? "");
  // 1h. sesi LAMA dicabut (signOut scope others saat confirm)
  let oldSessionDead = false;
  if (oldAccess) {
    const chk = await anon().auth.getUser(oldAccess);
    oldSessionDead = !!chk.error || !chk.data.user;
    check("1h. sesi LAMA tidak lagi berlaku (getUser ditolak)", oldSessionDead, chk.error?.message ?? "masih valid!");
  } else { check("1h. sesi LAMA tidak lagi berlaku", false, "tidak ada token lama"); }

  // ---------- 2. UJI NEGATIF ----------
  const badEx = await exchangeViaCallback("00000000-0000-0000-0000-000000000000", "/masuk?reset=1");
  check("2a. callback code palsu -> redirect ?error=oauth-gagal", badEx.location.includes("error=oauth-gagal"), `status=${badEx.status} loc=${badEx.location}`);
  const rConfNo = await jfetch("/api/auth/password-reset/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: "palsu", password: pass() }) });
  check("2b. confirm tanpa sesi -> 400", rConfNo.res.status === 400, `status=${rConfNo.res.status}`);
  const rGhost = await jfetch("/api/auth/password-reset/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: `parity-nobody-${tag}@itap.local` }) });
  check("2c. request reset email tak terdaftar -> 200 ok:true (tidak membocorkan)", rGhost.res.status === 200 && rGhost.body?.ok === true, `status=${rGhost.res.status}`);

  // ---------- 3. SIGNUP -> VERIFIKASI EMAIL E2E ----------
  let rSignup = null; let signupOk = false;
  if (SKIP_EMAIL_SEND) { console.log("SKIP  3a. POST /api/auth/signup (SKIP_EMAIL_SEND; gagal di run sebelumnya karena 'email rate limit exceeded' dari Supabase, bukan bug aplikasi)"); }
  else {
    rSignup = await jfetch("/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: emailB, password: pwB, displayName: "Parity Test B" }) });
    signupOk = rSignup.res.status === 200 && rSignup.body?.ok === true;
    if (!signupOk) {
      // Sekali percobaan ulang setelah jeda — Supabase membatasi laju pengiriman email.
      console.log("      signup percobaan 1 gagal, jeda 90 dtk lalu coba lagi…");
      await new Promise((r) => setTimeout(r, 90000));
      rSignup = await jfetch("/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: emailB, password: pwB, displayName: "Parity Test B" }) });
      signupOk = rSignup.res.status === 200 && rSignup.body?.ok === true;
    }
    check("3a. POST /api/auth/signup -> 200 ok:true needsVerification", signupOk, `status=${rSignup.res.status} ${JSON.stringify(rSignup.body ?? {})}`);
  }
  if (!signupOk && !SKIP_EMAIL_SEND) {
    // Diagnostik: panggil signUp langsung via anon client agar pesan error asli terlihat.
    // (Mengirim email juga — dilewati bila SKIP_EMAIL_SEND.)
    const direct = await anon().auth.signUp({ email: emailB, password: pwB, options: { data: { display_name: "Parity Test B" }, emailRedirectTo: `${SITE}/verifikasi` } });
    console.log(`      diagnosa signUp langsung: ${direct.error ? "ERROR " + direct.error.message : "OK user=" + String(direct.data.user?.id).slice(0, 8) + "… session=" + !!direct.data.session}`);
    if (!direct.error && direct.data.user) { userB = direct.data.user; }
  }
  if (!signupOk && !userB) {
    const cB = await admin.auth.admin.createUser({ email: emailB, password: pwB, email_confirm: false, user_metadata: { display_name: "Parity Test B" } });
    check("3a-fallback. akun uji B dibuat via Admin API (email_confirm=false)", !cB.error, cB.error?.message ?? "");
    userB = cB.data.user;
  } else if (signupOk) {
    const { data } = await admin.auth.admin.listUsers({ perPage: 50 });
    userB = (data?.users ?? []).find((u) => u.email === emailB) ?? null;
  }
  const beforeVerify = userB ? (await admin.auth.admin.getUserById(userB.id)).data.user : null;
  check("3b. B belum terkonfirmasi sebelum verifikasi", beforeVerify && !beforeVerify.email_confirmed_at, beforeVerify ? `confirmed_at=${beforeVerify.email_confirmed_at}` : "user tidak ditemukan");
  const linkB = await admin.auth.admin.generateLink({ type: "signup", email: emailB, options: { redirectTo: `${SITE}/verifikasi` } });
  check("3c. Admin generateLink signup", !linkB.error, linkB.error?.message ?? "link diperoleh");
  const partsB = parseActionLink(linkB.data?.properties?.action_link ?? "");
  let verified = false;
  if (partsB.code) {
    const exB = await exchangeViaCallback(partsB.code, "/verifikasi");
    check("3d. tukar code signup via /api/auth/callback -> redirect /verifikasi", exB.location.includes("/verifikasi"), `status=${exB.status} loc=${exB.location}`);
  } else if (partsB.tokenHash) {
    const v = await anon().auth.verifyOtp({ token_hash: partsB.tokenHash, type: "signup" });
    check("3d. verifyOtp token_hash signup", !v.error, v.error?.message ?? "");
  } else { check("3d. tukar code signup", false, "tidak ada code/token_hash di link"); }
  const afterVerify = userB ? (await admin.auth.admin.getUserById(userB.id)).data.user : null;
  verified = !!afterVerify?.email_confirmed_at;
  check("3e. B menjadi terkonfirmasi (email_confirmed_at terisi)", verified, afterVerify ? `confirmed_at=${afterVerify.email_confirmed_at}` : "user tidak ditemukan");
  const sB = await anon().auth.signInWithPassword({ email: emailB, password: pwB });
  check("3f. sign-in B setelah verifikasi berhasil", !sB.error, sB.error?.message ?? "");

  // ---------- 4. GATE PERAN (penyelidikan, seed-mode) ----------
  // Sesi live B (reader) dipakai ke route admin di server seed-mode.
  const cookieB = sB.data.session ? await (async () => {
    // ambil cookie sesi via callback-style: login ulang lewat callback tidak mungkin;
    // pakai sesi dari exchange code signup di atas bila ada — di sini uji GET tanpa sesi dulu,
    // lalu POST dengan Authorization Bearer (route memakai cookie, jadi Bearer diabaikan -> 401/503).
    return "";
  })() : "";
  void cookieB;
  const gNoAuth = await jfetch("/api/admin/moderation-words", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ word: "parityprobe", action: "block" }) });
  check("4a. POST /api/admin/moderation-words tanpa sesi -> 401/503 (bukan 403 peran)", [401, 503].includes(gNoAuth.res.status), `status=${gNoAuth.res.status} ${JSON.stringify(gNoAuth.body ?? {})}`);
  // Sesi B via cookie: tukar code signup kedua tidak mungkin (sekali pakai) — pakai
  // generateLink recovery B untuk mendapat cookie sesi, lalu panggil route admin.
  const linkB2 = await admin.auth.admin.generateLink({ type: "recovery", email: emailB, options: { redirectTo: `${SITE}/masuk?reset=1` } });
  const hopB2 = await tokensFromActionLink(linkB2.data?.properties?.action_link ?? "");
  if (hopB2.accessToken) {
    const sessB2 = await cookieFromFragmentTokens(hopB2.accessToken, hopB2.refreshToken);
    const gB = await jfetch("/api/admin/moderation-words", { method: "POST", headers: { "content-type": "application/json", cookie: sessB2.cookie }, body: JSON.stringify({ word: "parityprobe", action: "block" }) });
    check("4b. POST moderation-words sbg user live (reader) di server SEED -> 503 profil (gate peran tak teramati)", gB.res.status === 503, `status=${gB.res.status} ${JSON.stringify(gB.body ?? {})}`);
  } else { check("4b. POST moderation-words sbg user live di server SEED", false, "tidak ada token recovery B"); }
} catch (e) {
  console.error("ERROR tak terduga:", e instanceof Error ? e.message : String(e));
  failures++;
} finally {
  // ---------- 5. CLEANUP ----------
  for (const u of [userA, userB]) {
    if (!u) continue;
    const d = await admin.auth.admin.deleteUser(u.id);
    check(`cleanup. hapus akun uji ${u.email}`, !d.error, d.error?.message ?? "");
  }
  const { data: after } = await admin.auth.admin.listUsers({ perPage: 50 });
  const remaining = after?.users ?? [];
  check("cleanup. hanya 1 user tersisa (admin)", remaining.length === 1, `${remaining.length} user tersisa`);
}

console.log(failures === 0 ? "\nSEMUA UJI LOLOS" : `\n${failures} UJI GAGAL`);
process.exit(failures === 0 ? 0 : 1);
