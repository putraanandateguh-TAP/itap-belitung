// F02 — Tamu mencari konten (S06).
import { test, expect } from "@playwright/test";
import { installGuards, expectNoA11yViolations } from "./helpers";

test.describe("F02 tamu mencari konten", () => {
  test.beforeEach(async ({ page }) => installGuards(page));

  test("F02-H1 ketik 'pantai' -> hasil tampil + jumlah (aria-live)", async ({ page }) => {
    await page.goto("/cari");
    await page.getByRole("searchbox", { name: "Cari" }).fill("pantai");
    await expect(page.getByRole("link", { name: /Pantai Tanjung Tinggi/ }).first()).toBeVisible();
    await expect(page.locator('[aria-live="polite"]')).toContainText(/hasil untuk/);
    await expectNoA11yViolations(page);
  });

  test("F02-H2 filter kanal wisata + Terapkan", async ({ page }) => {
    await page.goto("/cari?q=pantai");
    await page.getByRole("button", { name: /Filter/ }).click();
    // Label "Kanal" juga dipakai nav header ("Kanal utama") + nav footer —
    // scope ke form pencarian.
    await page.getByRole("search", { name: "Cari konten" }).getByLabel("Kanal").selectOption("wisata");
    await page.getByRole("button", { name: "Terapkan" }).click();
    await expect(page.getByRole("link", { name: /Pantai Tanjung Tinggi/ }).first()).toBeVisible();
  });

  test("F02-H3 klik hasil -> detail artikel", async ({ page }) => {
    await page.goto("/cari?q=pantai");
    await page.getByRole("link", { name: /Pantai Tanjung Tinggi/ }).first().click();
    await expect(page.getByRole("heading", { name: "Pantai Tanjung Tinggi" })).toBeVisible();
  });

  test("F02-E1 tanpa hasil -> empty state jelas", async ({ page }) => {
    await page.goto("/cari");
    await page.getByRole("searchbox", { name: "Cari" }).fill("zzzqqq-tidak-ada");
    await expect(page.getByText("Tidak ada hasil.")).toBeVisible();
  });

  test("F02-E2 input kosong -> prompt, bukan error", async ({ page }) => {
    await page.goto("/cari");
    await expect(page.getByText("Ketik kata kunci untuk mulai mencari.")).toBeVisible();
  });

  test("F02-E8 refresh di tengah pencarian", async ({ page }) => {
    await page.goto("/cari?q=pantai");
    await expect(page.getByRole("link", { name: /Pantai Tanjung Tinggi/ }).first()).toBeVisible();
    await page.reload();
    await expect(page.getByRole("link", { name: /Pantai Tanjung Tinggi/ }).first()).toBeVisible();
  });

  test("F02-E7 filter di HP (390px)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/cari?q=pantai");
    await page.getByRole("button", { name: /Filter/ }).click();
    await expect(page.getByRole("button", { name: "Terapkan" })).toBeVisible();
  });

  test("F02-E10 keyboard only: tab ke search box, ketik, hasil tampil", async ({ page }) => {
    await page.goto("/cari");
    await page.getByRole("searchbox", { name: "Cari" }).focus();
    await page.keyboard.type("pantai");
    await expect(page.getByRole("link", { name: /Pantai Tanjung Tinggi/ }).first()).toBeVisible();
  });
});
