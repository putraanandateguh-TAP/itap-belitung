// Uji alur reset kata sandi /masuk di browser headless SUNGGUHAN (W3-followup-2).
// - Buat akun uji terkonfirmasi, sign-in (sesi LAMA), generateLink recovery,
//   hop Supabase /auth/v1/verify via fetch (terbukti redirect + fragment),
//   lalu buka URL hasil redirect di Chromium (persis yang diterima browser
//   saat klik link email): buktikan form "Buat kata sandi baru" tampil,
//   isi password baru -> POST /api/auth/password-reset/confirm 200 ->
//   sign-in password baru OK, password lama ditolak, sesi lama dicabut.
// - Uji negatif: #error=access_denied (tautan kedaluwarsa), token fragment
//   palsu, ?code= palsu -> error ramah, form kata sandi baru TIDAK tampil.
// - Hapus akun uji; verifikasi akhir hanya admin tersisa.
// - Baca secret dari web/.env.local worktree parity-auth; TIDAK ada secret dicetak.
// - Chromium VM tidak bisa CONNECT langsung ke egress: pakai forwarder CONNECT
//   lokal 127.0.0.1:8899 (w3followup-forwarder.mjs, harus jalan) +
//   ignoreHTTPSErrors. Localhost di-bypass.
// Jalankan dari direktori web: node scripts/test-reset-browser.mjs (dev server :3103 jalan)
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const BASE = process.env.E2E_BASE ?? "http://127.0.0.1:3103";
// .env.local dibaca relatif dari scripts/ (pola sama seperti test-auth-e2e.mjs).
const envPath = new URL("../.env.local", import.meta.url);
const env = {};
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
}
const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !ANON || !SERVICE) { console.error("FATAL: .env.local belum lengkap"); process.exit(2); }

const admin = createClient(SUPA_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = () => createClient(SUPA_URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
const rand = (n = 8) => randomBytes(n).toString("hex");
const pass = () => "Pw!" + randomBytes(9).toString("base64").replace(/[^A-Za-z0-9]/g, "x").slice(0, 14);

let failures = 0;
let skipped = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? " — " + extra : ""}`);
  if (!ok) failures++;
}
function skip(name, why) {
  console.log(`SKIP  ${name} — ${why}`);
  skipped++;
}

const tag = rand(6);
const emailA = `parity-reset-${tag}@itap.local`;
const pwOld = pass();
const pwNew = pass();
let userA = null;
let browser = null;

try {
  const cachedChromium = join(homedir(), ".cache/ms-playwright/chromium-1148/chrome-linux/chrome");
  browser = await chromium.launch({ ...(existsSync(cachedChromium) ? { executablePath: cachedChromium } : {}), proxy: { server: "http://127.0.0.1:8899", bypass: "localhost,127.0.0.1" } });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));

  // 1. akun uji terkonfirmasi + sesi lama
  const cA = await admin.auth.admin.createUser({ email: emailA, password: pwOld, email_confirm: true, user_metadata: { display_name: "Parity Reset" } });
  check("1a. akun uji dibuat (email_confirm=true)", !cA.error, cA.error?.message ?? "");
  userA = cA.data.user;
  const sOld = await anon().auth.signInWithPassword({ email: emailA, password: pwOld });
  check("1b. sign-in password lama berhasil (sesi lama diperoleh)", !sOld.error, sOld.error?.message ?? "");
  const oldAccess = sOld.data.session?.access_token ?? null;

  // 1c. jalur asli pengguna: minta link reset via route aplikasi (mengirim 1 email).
  //      Bila Supabase menolak karena rate limit email, SKIP — sudah PASS di run W3.
  const rReq = await fetch(`${BASE}/api/auth/password-reset/request`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: emailA }) });
  const bReq = await rReq.json().catch(() => ({}));
  if (rReq.status === 200 && bReq.ok === true) {
    check("1c. POST /api/auth/password-reset/request -> 200 ok:true", true);
  } else if (String(bReq.error ?? "").toLowerCase().includes("rate limit")) {
    skip("1c. POST /api/auth/password-reset/request (rate limit email Supabase)", `status=${rReq.status}`);
  } else {
    check("1c. POST /api/auth/password-reset/request -> 200 ok:true", false, `status=${rReq.status} ${JSON.stringify(bReq)}`);
  }

  // 2. generateLink recovery + hop /verify (fetch, terbukti redirect + fragment)
  const link = await admin.auth.admin.generateLink({ type: "recovery", email: emailA, options: { redirectTo: `${BASE}/masuk?reset=1` } });
  check("2a. Admin generateLink recovery (redirectTo dev lokal)", !link.error, link.error?.message ?? "link diperoleh");
  const actionLink = link.data?.properties?.action_link ?? "";
  const hop = await fetch(actionLink, { redirect: "manual" });
  const hopLoc = hop.headers.get("location") ?? "";
  const hopToLocal = hopLoc.startsWith(`${BASE}/masuk?reset=1#`) && hopLoc.includes("access_token=");
  check("2b. hop /auth/v1/verify -> redirect ke dev /masuk?reset=1#access_token=…", hopToLocal, `status=${hop.status} loc=${hopLoc.slice(0, 60)}…`);
  const frag = new URL(hopLoc).hash.slice(1);
  check("2c. fragment berisi access_token + refresh_token + type=recovery", frag.includes("access_token=") && frag.includes("refresh_token=") && frag.includes("type=recovery"), "");

  // 3. BUKA di browser sungguhan (simulasi klik link email).
  let confirmStatus = null;
  page.on("response", (res) => {
    if (res.url().includes("/api/auth/password-reset/confirm")) confirmStatus = res.status();
  });
  await page.goto(`${BASE}/masuk?reset=1#${frag}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  const heading = page.getByRole("heading", { name: "Buat kata sandi baru" });
  await heading.waitFor({ timeout: 60000 });
  check("3a. browser: form 'Buat kata sandi baru' tampil dari tautan implicit", true);
  const urlAfter = page.url();
  check("3b. browser: token dibersihkan dari URL (tanpa access_token)", !urlAfter.includes("access_token"), urlAfter);
  await page.fill("#password", pwNew);
  await page.fill("#password2", pwNew);
  await page.getByRole("button", { name: "Simpan kata sandi baru" }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 30000 });
  check("3c. browser: setelah simpan, dialihkan ke beranda /", page.url() === `${BASE}/`, page.url());
  check("3d. browser: POST /api/auth/password-reset/confirm -> 200", confirmStatus === 200, `status=${confirmStatus}`);

  // 4. Verifikasi hasil lewat API: password baru OK, lama ditolak, sesi lama dicabut.
  const sNew = await anon().auth.signInWithPassword({ email: emailA, password: pwNew });
  check("4a. sign-in password BARU berhasil", !sNew.error, sNew.error?.message ?? "");
  const sOldPw = await anon().auth.signInWithPassword({ email: emailA, password: pwOld });
  check("4b. sign-in password LAMA ditolak", !!sOldPw.error, sOldPw.error?.message ?? "");
  if (oldAccess) {
    const chk = await anon().auth.getUser(oldAccess);
    check("4c. sesi LAMA dicabut (getUser token lama ditolak)", !!chk.error || !chk.data.user, chk.error?.message ?? "masih valid!");
  } else {
    check("4c. sesi LAMA dicabut", false, "tidak ada token lama");
  }

  // 5. Uji negatif di browser — HARUS di context baru (tanpa cookie): context
  //    utama masih menyimpan sesi recovery asli dari langkah 3; getSession()
  //    akan menemukannya dan form kata sandi baru tampil — itu perilaku benar
  //    (pengguna yang sudah login memang boleh ganti kata sandi), bukan error.
  const ctxNeg = await browser.newContext({ ignoreHTTPSErrors: true });
  const errText = "Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru.";
  // 5a. tautan kedaluwarsa persis seperti yang dikirim Supabase (#error=access_denied)
  const p2 = await ctxNeg.newPage();
  await p2.goto(`${BASE}/masuk?reset=1#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await p2.getByText(errText).first().waitFor({ timeout: 60000 });
  check("5a. #error=access_denied (kedaluwarsa) -> error ramah", true);
  check("5b. form kata sandi baru TIDAK tampil setelah tautan kedaluwarsa", (await p2.getByRole("heading", { name: "Buat kata sandi baru" }).count()) === 0, "");
  await p2.close();
  // 5c. token fragment palsu -> setSession gagal -> error ramah
  const p3 = await ctxNeg.newPage();
  const fakeJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  await p3.goto(`${BASE}/masuk?reset=1#access_token=${fakeJwt}&refresh_token=palsu123&type=recovery`, { waitUntil: "domcontentloaded", timeout: 120000 });
  // Cabang tanpa-sesi (?reset=1) memakai teks "Tautan reset tidak valid…"
  // (dengan kata "reset") — dibuktikan via probe: setSession gagal
  // ("Refresh token is not valid") lalu error tampil di halaman.
  await p3.getByText("Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru.").first().waitFor({ timeout: 60000 });
  check("5c. token fragment palsu -> error ramah", true);
  await p3.close();
  // 5d. ?code= palsu -> error ramah
  const p4 = await ctxNeg.newPage();
  await p4.goto(`${BASE}/masuk?reset=1&code=00000000-0000-0000-0000-000000000000`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await p4.getByText(errText).first().waitFor({ timeout: 60000 });
  check("5d. ?code= palsu -> error ramah", true);
  await p4.close();
  await ctxNeg.close();
} catch (e) {
  console.error("ERROR tak terduga:", e instanceof Error ? e.message : String(e));
  failures++;
} finally {
  if (browser) await browser.close();
  if (userA) {
    const d = await admin.auth.admin.deleteUser(userA.id);
    check(`cleanup. hapus akun uji ${userA.email}`, !d.error, d.error?.message ?? "");
  }
  const { data: after } = await admin.auth.admin.listUsers({ perPage: 50 });
  const remaining = after?.users ?? [];
  check("cleanup. hanya 1 user tersisa (admin)", remaining.length === 1, `${remaining.length} user tersisa: ${remaining.map((u) => u.email).join(", ")}`);
}

console.log(failures === 0 ? `\nSEMUA UJI LOLOS${skipped ? ` (${skipped} SKIP)` : ""}` : `\n${failures} UJI GAGAL`);
process.exit(failures === 0 ? 0 : 1);
