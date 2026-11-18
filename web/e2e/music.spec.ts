// Musik latar iTAP — dipulihkan dari situs lama (site/app.js, blok "Music").
// Tombol toggle, file belitung-bg-64k.mp3, preferensi localStorage 'itap_music',
// dan pemutar yang tidak restart saat navigasi client-side (header di root layout).
import { expect, test } from "@playwright/test";

test("musik latar: toggle, preferensi tersimpan, tetap hidup saat navigasi", async ({ page }) => {
  await page.goto("/");
  const btn = page.getByRole("button", { name: /musik latar/i });
  await expect(btn).toBeVisible();
  await expect(btn).toHaveAttribute("aria-pressed", "false");

  // Elemen media meminta byte-range -> server menjawab 206, bukan 200.
  const mp3 = page.waitForResponse(
    (r) =>
      r.url().includes("/audio/belitung-bg-64k.mp3") &&
      (r.status() === 200 || r.status() === 206),
  );
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "true");
  await expect(btn).toContainText("Musik hidup");
  await mp3;
  await expect(await page.evaluate(() => window.localStorage.getItem("itap_music"))).toBe("on");

  // Navigasi client-side: pemutar tidak restart (tombol tetap hidup).
  await page.getByRole("link", { name: "Kedai Bakso Aci" }).first().click();
  await page.waitForURL("**/kedai");
  const btn2 = page.getByRole("button", { name: /musik latar/i });
  await expect(btn2).toHaveAttribute("aria-pressed", "true");

  await btn2.click();
  await expect(btn2).toHaveAttribute("aria-pressed", "false");
  await expect(await page.evaluate(() => window.localStorage.getItem("itap_music"))).toBe("off");
});
