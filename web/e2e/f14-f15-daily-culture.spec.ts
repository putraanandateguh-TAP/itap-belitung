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
    await expect(page.getByText("Sales TO - CV. Arjuna Prima Manggar").first()).toBeVisible();
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
  test("F15-H1 GET /api/culture -> 200 + 5 cerita seed asli KB (M5)", async ({ request }) => {
    const res = await request.get("/api/culture");
    expect(res.status()).toBe(200);
    const items = await res.json();
    expect(items.length).toBe(5);
    expect(items.map((s: { slug: string }) => s.slug).sort()).toEqual(
      ["bahasa-melayu-belitung", "buang-jong", "makan-bedulang", "maras-taun", "seni-campak-belitung"],
    );
    // Tidak ada lirik karangan di seed: semua null.
    expect(items.every((s: { lyrics: string | null }) => s.lyrics === null)).toBe(true);
  });

  test("F15-H2 GET /api/culture/:slug tidak ada -> 404", async ({ request }) => {
    const res = await request.get("/api/culture/apa-saja");
    expect(res.status()).toBe(404);
  });

  test("F15-H3 GET /api/culture/maras-taun -> 200 + sumber bacaan", async ({ request }) => {
    const res = await request.get("/api/culture/maras-taun");
    expect(res.status()).toBe(200);
    const s = await res.json();
    expect(s.title).toBe("Maras Taun");
    expect(s.category).toBe("upacara");
    expect(s.sources.length).toBeGreaterThan(0);
  });

  test("F15-H4 /budaya: daftar + filter kategori + detail (M5)", async ({ page }) => {
    await page.goto("/budaya");
    await expect(page.getByRole("heading", { name: "Budaya Belitung" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Makan Bedulang", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Bahasa Melayu Belitung", exact: true })).toBeVisible();
    await page.goto("/budaya?category=lagu");
    await expect(page.getByText("Belum ada cerita di kategori ini")).toBeVisible();
    await page.goto("/budaya/maras-taun");
    await expect(page.getByRole("heading", { name: "Maras Taun" })).toBeVisible();
    await expect(page.getByText("Lirik belum tersedia untuk cerita ini")).toBeVisible();
    await expect(page.getByText("Sumber bacaan")).toBeVisible();
    await expectNoA11yViolations(page);
  });
});

test.describe("F14 hub info harian (M5)", () => {
  test.beforeEach(async ({ page }) => installGuards(page));

  test("F14-M5-1 /info-harian + 6 subhalaman -> 200, pesan jujur saat cache kosong", async ({ page }) => {
    await page.goto("/info-harian");
    await expect(page.getByRole("heading", { name: "Info Harian Belitung" })).toBeVisible();
    for (const [path, heading, empty] of [
      ["/info-harian/cuaca", "Cuaca Tanjung Pandan", "Cuaca belum tersedia"],
      ["/info-harian/salat", "Jadwal Salat", "Jadwal salat belum tersedia"],
      ["/info-harian/transport", "Pesawat & Kapal", "Jadwal pesawat & kapal belum tersedia"],
      ["/info-harian/bbm", "Harga BBM", "Harga BBM belum tersedia"],
      ["/info-harian/gempa", "Gempa", "Info gempa belum tersedia"],
      ["/info-harian/darurat", "Nomor Darurat", null],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      if (empty) await expect(page.getByText(empty)).toBeVisible();
    }
    // Darurat: data statis — nomor 110 tampil + tautan tel:.
    await expect(page.getByRole("link", { name: "110" })).toHaveAttribute("href", "tel:110");
    await expectNoA11yViolations(page);
  });

  test("F14-M5-2 beranda S01: kartu cuaca + salat tampil (mode belum tersedia)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Cuaca Tanjung Pandan" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Jadwal salat" })).toBeVisible();
    await expect(page.getByText("Cuaca belum tersedia — cron daily-info-fetch belum mengisi cache (P1).")).toBeVisible();
  });

  test("F14-M5-3 mobile 390px: hub + cuaca tanpa overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const p of ["/info-harian", "/info-harian/cuaca", "/budaya"]) {
      await page.goto(p);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, p).toBeLessThanOrEqual(0);
    }
  });
});
