// F04 — Daftar + verifikasi; F17 — Reset kata sandi.
import { test, expect } from "@playwright/test";
import { installGuards, expectNoA11yViolations } from "./helpers";

test.describe("F04 daftar + verifikasi (UI + API jujur)", () => {
  test.beforeEach(async ({ page }) => installGuards(page));

  test("F04-H1 /masuk: form tampil, tanpa akun demo / kode OTP", async ({ page }) => {
    await page.goto("/masuk");
    await expect(page.getByRole("heading", { name: "Masuk ke iTAP Belitung" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Kata sandi")).toBeVisible();
    await expect(page.getByRole("button", { name: "Masuk dengan Google" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Belum punya akun? Daftar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Lupa kata sandi?" })).toBeVisible();
    const html = await page.content();
    expect(html).not.toContain("123456");
    expect(html).not.toContain("akun demo");
    await expectNoA11yViolations(page);
  });

  test("F04-H2 /verifikasi: OTP 6 kotak, tanpa kode demo", async ({ page }) => {
    await page.goto("/verifikasi");
    await expect(page.getByRole("heading", { name: "Verifikasi akun" })).toBeVisible();
    for (let i = 1; i <= 6; i++) {
      await expect(page.getByLabel(`Digit ke-${i} dari 6`)).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Verifikasi" })).toBeVisible();
    const html = await page.content();
    expect(html).not.toContain("123456");
    await expectNoA11yViolations(page);
  });

  test("F04-H3 signup body valid -> 503 jujur (P1), bukan 500", async ({ request }) => {
    const res = await request.post("/api/auth/signup", {
      data: { email: "uji@example.com", password: "Rahasia123", displayName: "Uji Coba" },
    });
    expect(res.status()).toBe(503);
    expect(await res.text()).toContain("Supabase belum dikonfigurasi");
  });

  test("F04-H4/H5 email OTP send + verify -> 503 jujur", async ({ request }) => {
    const s = await request.post("/api/auth/email-otp/send", { data: { email: "uji@example.com" } });
    expect(s.status()).toBe(503);
    const v = await request.post("/api/auth/email-otp/verify", { data: { email: "uji@example.com", token: "123456" } });
    expect(v.status()).toBe(503);
  });

  test("F04-H6 whatsapp OTP tanpa login -> 401", async ({ request }) => {
    const res = await request.post("/api/auth/whatsapp-otp/send", { data: { phone: "+6281234567890" } });
    expect(res.status()).toBe(401);
  });

  test("F04-E1/E2/E3 validasi signup -> 400 pesan Indonesia", async ({ request }) => {
    const res = await request.post("/api/auth/signup", {
      data: { email: "bukan-email", password: "x", displayName: "U" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.details.join(" ")).toContain("Alamat email tidak valid");
    expect(body.details.join(" ")).toContain("Kata sandi minimal 8 karakter");
    expect(body.details.join(" ")).toContain("Nama minimal 2 karakter");
  });

  test("F04-E4 OTP bukan 6 digit -> 400", async ({ request }) => {
    const res = await request.post("/api/auth/email-otp/verify", {
      data: { email: "uji@example.com", token: "123" },
    });
    expect(res.status()).toBe(400);
    expect(await res.text()).toContain("Kode harus 6 digit angka");
  });

  test("F04-E5 double-click submit tidak membuat 2 akun (rate limit / 503 tetap)", async ({ page }) => {
    await page.goto("/masuk");
    await page.getByRole("button", { name: "Belum punya akun? Daftar" }).click();
    await page.getByLabel("Nama tampilan").fill("Uji Coba");
    await page.getByLabel("Email").fill("uji@example.com");
    await page.getByLabel("Kata sandi").fill("Rahasia123");
    const submit = page.getByRole("button", { name: "Buat akun" });
    await Promise.all([submit.click(), submit.click().catch(() => undefined)]);
    // Respons 503 yang jujur (P1) — bukan error ganda; guard 5xx di helper
    // memang mengecualikan 503.
    await expect(page.getByText("Supabase belum dikonfigurasi (P1).")).toBeVisible();
  });

  test("F04-E6 rate limit: 6x kirim OTP -> 429", async ({ request }) => {
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await request.post("/api/auth/email-otp/send", { data: { email: "ratelimit@example.com" } });
      codes.push(res.status());
    }
    expect(codes).toContain(429);
  });

  test("F04-E7 refresh di tengah verifikasi", async ({ page }) => {
    await page.goto("/verifikasi");
    await page.reload();
    await expect(page.getByRole("heading", { name: "Verifikasi akun" })).toBeVisible();
  });

  test("F04-E8 mobile 390px /masuk + /verifikasi tanpa overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const url of ["/masuk", "/verifikasi"]) {
      await page.goto(url);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `overflow di ${url}`).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("F17 reset kata sandi", () => {
  test("F17-H1/H2 reset request + confirm -> 503 jujur (P1)", async ({ request }) => {
    const r = await request.post("/api/auth/password-reset/request", { data: { email: "uji@example.com" } });
    expect(r.status()).toBe(503);
    const c = await request.post("/api/auth/password-reset/confirm", { data: { token: "abc", password: "Rahasia123" } });
    expect(c.status()).toBe(503);
  });

  test("F17-E4 password baru < 8 karakter -> 400", async ({ request }) => {
    const res = await request.post("/api/auth/password-reset/confirm", { data: { token: "abc", password: "x" } });
    expect(res.status()).toBe(400);
  });

  test("F17-H3 mode reset tampil dari /masuk", async ({ page }) => {
    installGuards(page);
    await page.goto("/masuk");
    await page.getByRole("button", { name: "Lupa kata sandi?" }).click();
    await expect(page.getByRole("heading", { name: "Lupa kata sandi" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Kirim tautan reset" })).toBeVisible();
  });
});
