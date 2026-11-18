// F14 — Info harian; F15 — Budaya.
import { test, expect } from "@playwright/test";
import { installGuards, expectNoA11yViolations } from "./helpers";

test.describe("F14 info harian", () => {
  test.beforeEach(async ({ page }) => installGuards(page));

  test("F14-H1 /harga-pangan: 13 komoditas tampil", async ({ page }) => {
    await page.goto("/harga-pangan");
    await expect(page.getByRole("heading", { name: "Harga Pangan Harian" })).toBeVisible();
    await expect(page.getByText("Minyak Goreng Kemasan")).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("F14-H2 /kurs: IHSG/emas tampil", async ({ page }) => {
    await page.goto("/kurs");
    await expect(page.getByRole("heading", { name: "Kurs, IHSG & Emas" })).toBeVisible();
  });

  test("F14-H3 /lowongan: lowongan tampil + cari", async ({ page }) => {
    await page.goto("/lowongan");
    await expect(page.getByRole("heading", { name: "Lowongan Kerja Belitung" })).toBeVisible();
    await expect(page.getByText("Field Officer").first()).toBeVisible();
  });

  test("F14-H4/H5 API info harian yang sudah ada -> 200", async ({ request }) => {
    for (const p of ["/api/daily/emergency", "/api/prices", "/api/rates", "/api/jobs", "/api/products", "/api/services"]) {
      const res = await request.get(p);
      expect(res.status(), p).toBe(200);
    }
    const em = await (await request.get("/api/daily/emergency")).json();
    expect(em.find((e: { number: string }) => e.number === "110")).toBeTruthy();
  });

  test("F14-H6/H7 cuaca/salat/transport/BBM/gempa cache kosong -> 503 jujur", async ({ request }) => {
    for (const p of ["/api/daily/weather", "/api/daily/prayer", "/api/daily/transport", "/api/daily/fuel", "/api/daily/earthquake"]) {
      const res = await request.get(p);
      expect(res.status(), p).toBe(503);
      expect(await res.text(), p).toContain("belum");
    }
  });

  test("F14-E4 mobile + axe di halaman info harian", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/harga-pangan");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expectNoA11yViolations(page);
  });
});

test.describe("F15 budaya", () => {
  test("F15-H1 GET /api/culture -> 200 + [] jujur (konten belum diisi)", async ({ request }) => {
    const res = await request.get("/api/culture");
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test("F15-H2 GET /api/culture/:slug tidak ada -> 404", async ({ request }) => {
    const res = await request.get("/api/culture/apa-saja");
    expect(res.status()).toBe(404);
  });
});
