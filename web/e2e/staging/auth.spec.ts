// AUTH — signup / login / token tidak valid (black-box, staging).
// Kontrak (dari src/app/api/auth/signup/route.ts + src/lib/validation.ts):
//   POST /api/auth/signup {email, password>=8, displayName>=2} -> 200 {ok:true}
//   body tidak valid -> 400 {error, details[] (bahasa Indonesia)}
//   tanpa Supabase -> 503 (tidak boleh terjadi di staging yang sehat)
//   rate limit signup: 5/15 menit per IP (lib/rate-limit.ts) — file ini
//   HANYA memakai <=3 panggilan signup agar tidak menabrak batas itu.
// Login memakai Supabase Auth password grant (lihat helpers.login).
// CATATAN: bila "Confirm email" AKTIF di staging, akun hasil signup
// TIDAK BISA login sebelum verifikasi — test signup di sini hanya
// menegaskan respons signup, BUKAN login akun baru (lihat TEST_PLAN.md).
import { test, expect, cfg, stagingReady, loginAs, api, runId } from "./helpers";

test.describe("staging — autentikasi", () => {
  test.skip(!stagingReady, "env staging belum lengkap (STAGING_* di .env.staging.local)");

  test("AUTH-01 signup body valid -> 200 ok:true (akun dummy baru)", async ({ request }) => {
    const email = `daftar-${runId}@staging-test.invalid`;
    const res = await api(request, "POST", "/api/auth/signup", {
      data: { email, password: "Staging123", displayName: "Pendaftar Staging Test" },
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = (await res.json()) as { ok?: boolean; needsVerification?: boolean; userId?: string };
    expect(body.ok).toBe(true);
    expect(typeof body.needsVerification).toBe("boolean");
  });

  test("AUTH-02 signup body tidak valid -> 400 dengan pesan Indonesia", async ({ request }) => {
    const res = await api(request, "POST", "/api/auth/signup", {
      data: { email: "bukan-email", password: "x", displayName: "U" },
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { details?: string[] };
    const joined = (body.details ?? []).join(" ");
    expect(joined).toContain("Alamat email tidak valid");
    expect(joined).toContain("Kata sandi minimal 8 karakter");
    expect(joined).toContain("Nama minimal 2 karakter");
  });

  test("AUTH-03 signup body kosong / JSON rusak -> 400, bukan 500", async ({ request }) => {
    const res = await api(request, "POST", "/api/auth/signup", { rawBody: "{bukan-json" });
    expect(res.status()).toBe(400);
  });

  test("AUTH-04 login akun buyer staging -> 200 + JWT", async ({ request }) => {
    const token = await loginAs(request, cfg.buyer);
    expect(token.split(".").length).toBe(3); // JWT: header.payload.signature
  });

  test("AUTH-05 login password salah -> 400 (Supabase Auth menolak)", async ({ request }) => {
    const res = await request.post(`${cfg.supabaseUrl}/auth/v1/token?grant_type=password`, {
      headers: { apikey: cfg.anonKey, "Content-Type": "application/json" },
      data: { email: cfg.buyer.email, password: "PasswordSalah123" },
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBeTruthy();
  });

  test("AUTH-06 JWT palsu ke endpoint terproteksi -> 401", async ({ request }) => {
    const res = await api(request, "GET", "/api/license/entitlement", {
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJwYWxzdSJ9.palsu",
    });
    expect(res.status()).toBe(401);
  });

  test("AUTH-07 tanpa token ke endpoint terproteksi -> 401", async ({ request }) => {
    const res = await api(request, "GET", "/api/license/entitlement");
    expect(res.status()).toBe(401);
  });

  test("AUTH-08 token buyer berlaku untuk /api/me/profile (200)", async ({ request }) => {
    const token = await loginAs(request, cfg.buyer);
    const res = await api(request, "GET", "/api/me/profile", { token });
    expect(res.status(), await res.text()).toBe(200);
  });
});
