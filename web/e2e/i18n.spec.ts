// i18n ID/EN (parity W1) — verifikasi fungsional: cookie itap_lang=en
// menerjemahkan header/nav/beranda/halaman kunci + bertahan setelah reload.
import { expect, test } from "@playwright/test";

test("header + home translate to EN with itap_lang=en cookie and persist after reload", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Jual Beli" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Info Harian" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Berita" }).first()).toBeVisible();

  await page.context().addCookies([{ name: "itap_lang", value: "en", url: "http://localhost:3100" }]);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Marketplace" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Daily Info" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "News" }).first()).toBeVisible();

  // persists after reload (cookie, no re-set)
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Marketplace" }).first()).toBeVisible();

  // localStorage fallback: clear cookie, set localStorage, reload
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.setItem("itap_lang", "en"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Marketplace" }).first()).toBeVisible();

  await page.screenshot({ path: "e2e/i18n-home-en.png", fullPage: false });
});

test("key pages render EN chrome", async ({ page }) => {
  await page.context().addCookies([{ name: "itap_lang", value: "en", url: "http://localhost:3100" }]);

  await page.goto("/info-harian", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Belitung Daily Info" })).toBeVisible();

  await page.goto("/kedai", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Kedai/ })).toBeVisible();

  await page.goto("/masuk", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Sign in to iTAP/i })).toBeVisible();

  await page.goto("/cari?q=pantai", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Search iTAP Belitung" })).toBeVisible();

  await page.goto("/budaya", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Belitung Culture" })).toBeVisible();

  await page.goto("/harga-pangan", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Belitung Daily Food Prices" })).toBeVisible();
});
