// Audit situs 23 Nov 2026: rute lama, SEO dasar, data terstruktur.
import { test, expect } from "@playwright/test";

test.describe("Audit 23 Nov 2026", () => {
  for (const [from, to] of [["/akun", "/pengaturan"], ["/kasir", "/kedai"], ["/u/contoh-tamu", "/undangan"], ["/favicon.ico", "/icon.png"]]) {
    test(`rute lama ${from} dialihkan ke ${to}`, async ({ request }) => {
      const res = await request.get(from, { maxRedirects: 0 });
      expect([307, 308]).toContain(res.status());
      expect(new URL(res.headers()["location"], "http://x").pathname).toBe(to);
    });
  }

  test("/undangan halaman jujur, noindex", async ({ page }) => {
    const res = await page.goto("/undangan");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Undangan Digital");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("sitemap tanpa halaman internal + memuat info harian", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).not.toContain("/redaksi");
    expect(xml).not.toContain("/kontributor");
    expect(xml).toContain("/info-harian");
  });

  test("beranda & kedai punya canonical + JSON-LD", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThan(0);
    await page.goto("/kedai");
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(ld).toContain("Restaurant");
    expect(ld).toContain("11:00");
    await expect(page.getByText("Jl. Permata VI Blok H25")).toBeVisible();
  });

  test("entitlement tanpa login -> 200 entitled:false", async ({ request }) => {
    const res = await request.get("/api/license/entitlement");
    expect(res.status()).toBe(200);
    expect((await res.json()).entitled).toBe(false);
  });
});
