// F01 — Tamu membaca berita (S01 -> S02/S03/S04 -> S05).
import { test, expect } from "@playwright/test";
import { installGuards, expectNoA11yViolations } from "./helpers";

test.describe("F01 tamu membaca berita", () => {
  test.beforeEach(async ({ page }) => installGuards(page));

  test("F01-H1 beranda -> detail artikel pertama", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Kabar terbaru" })).toBeVisible();
    await page.getByRole("link", { name: /Pantai Tanjung Tinggi/ }).first().click();
    await expect(page.getByRole("heading", { name: "Pantai Tanjung Tinggi" })).toBeVisible();
    await expect(page.getByText("4 Nov 2026 · Sijuk, Belitung · 1,4 rb dibaca")).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("F01-H2/H3 semua kanal tampil", async ({ page }) => {
    for (const [channel, title] of [
      ["berita", "Berita"],
      ["kuliner", "Kuliner"],
      ["wisata", "Wisata"],
      ["sejarah", "Sejarah"],
      ["budaya", "Budaya"],
      ["legenda", "Legenda"],
    ] as const) {
      await page.goto(`/kanal/${channel}`);
      await expect(page.getByRole("heading", { name: title, exact: true }).first()).toBeVisible();
      await expect(page.getByText(/Menampilkan/)).toBeVisible();
    }
    await expectNoA11yViolations(page);
  });

  test("F01-H4 rekomendasi terkait bisa diklik", async ({ page }) => {
    await page.goto("/artikel/pantai-tanjung-tinggi");
    await expect(page.getByRole("heading", { name: "Artikel terkait" })).toBeVisible();
    await page.getByRole("link", { name: /Pantai Tanjung Kelayang/ }).first().click();
    await expect(page.getByRole("heading", { name: "Pantai Tanjung Kelayang" })).toBeVisible();
  });

  test("F01-H5 artikel agregasi punya tautan sumber asli", async ({ page }) => {
    await page.goto("/kanal/berita");
    await page.getByRole("link", { name: /Peringati HUT Polairud/ }).first().click();
    // Tombolnya berbunyi "Baca di {nama sumber}" (mis. "Baca di trasberita.com"),
    // bukan "Baca di sumber asli".
    await expect(page.getByRole("link", { name: /Baca di / })).toBeVisible();
  });

  test("F01-E1 artikel yang sudah diterjemahkan tidak menampilkan banner 'belum diterjemahkan'; toggle EN menampilkan judul Inggris", async ({ page }) => {
    // Dulu (sebelum W2 menerjemahkan 54/54 artikel seed) pantai-tanjung-tinggi
    // belum punya title_en sehingga banner "Artikel ini belum tersedia dalam
    // bahasa Inggris" tampil. Kini artikel itu sudah diterjemahkan: banner
    // TIDAK boleh tampil, dan toggle EN menampilkan judul Inggris.
    // Jalur banner-nya sendiri tetap ada di ArticleContent (tampil bila
    // title_en null) dan terverifikasi W2-followup 19/19.
    await page.goto("/artikel/pantai-tanjung-tinggi");
    await expect(page.getByText("Artikel ini belum tersedia dalam bahasa Inggris")).toHaveCount(0);
    await page.getByRole("button", { name: "English", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Tanjung Tinggi Beach" })).toBeVisible();
  });

  test("F01-E2/E3 artikel tanpa foto & tanpa koordinat", async ({ page }) => {
    await page.goto("/artikel/pantai-tanjung-tinggi");
    await expect(page.getByText("Belum ada foto untuk artikel ini")).toBeVisible();
    await expect(page.getByText("Koordinat peta belum tersedia")).toBeVisible();
  });

  test("F01-E4 slug tidak ada -> 404, bukan 500", async ({ page }) => {
    const res = await page.goto("/artikel/tidak-ada");
    expect(res?.status()).toBe(404);
  });

  test("F01-N1 kanal tidak dikenal -> 404", async ({ page }) => {
    const res = await page.goto("/kanal/tidak-ada");
    expect(res?.status()).toBe(404);
  });

  test("F01-E6/E7 refresh + back di tengah alur", async ({ page }) => {
    // "Pantai Tanjung Pendam" ada di halaman 1 kanal wisata (Tanjung Tinggi
    // ada di halaman 2 — pagination 9/halaman, diurutkan terbaru dulu).
    await page.goto("/kanal/wisata");
    // Tunggu hidrasi selesai: klik Link Next.js sebelum hidrasi bisa
    // tertelan (race) sehingga navigasi tidak terjadi dan expect berikutnya
    // lolos semu terhadap halaman kanal.
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: /Pantai Tanjung Pendam/ }).first().click();
    await expect(page).toHaveURL(/artikel\/pantai-tanjung-pendam/);
    await expect(page.getByRole("heading", { name: "Pantai Tanjung Pendam" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Pantai Tanjung Pendam" })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/kanal\/wisata/);
    await expect(page.getByRole("heading", { name: "Wisata", exact: true })).toBeVisible();
  });

  test("F01-E8 mobile 390px: beranda + kanal + detail tanpa overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const url of ["/", "/kanal/berita", "/artikel/pantai-tanjung-tinggi"]) {
      await page.goto(url);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `overflow horizontal di ${url}`).toBeLessThanOrEqual(0);
    }
    await expectNoA11yViolations(page);
  });

  test("F01-E10 axe scan beranda", async ({ page }) => {
    await page.goto("/");
    await expectNoA11yViolations(page);
  });
});
