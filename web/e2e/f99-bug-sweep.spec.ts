// F99 — Smoke test sapuan bug 19 Nov 2026 (branch fix/bug-sweep-19-nov).
// Dijalankan dalam mode seed (dev server port 3100, tanpa DATABASE_URL).
import { test, expect } from "@playwright/test";
import { installGuards, expectNoA11yViolations } from "./helpers";

test.describe("F99 sapuan bug 19 Nov", () => {
  test.beforeEach(async ({ page }) => installGuards(page));

  test("F99-1 beranda: tidak ada artikel yang diduplikasi antar seksi", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Kabar terbaru" })).toBeVisible();
    const hrefs = await page.locator('a[href^="/artikel/"]').evaluateAll((els) =>
      els.map((e) => (e as HTMLAnchorElement).getAttribute("href")),
    );
    const slugs = hrefs.filter((h): h is string => !!h);
    expect(slugs.length).toBeGreaterThan(0);
    // Satu kartu Artikel merender 2 tautan ke artikel yang sama (gambar +
    // judul), jadi satu slug boleh muncul max 2x. Sebelum perbaikan, satu
    // artikel muncul di 2-3 seksi = 4-6x (mis. Polairud 3 kartu = 6 tautan).
    const counts = new Map<string, number>();
    for (const s of slugs) counts.set(s, (counts.get(s) ?? 0) + 1);
    for (const [s, n] of counts) expect(n, s).toBeLessThanOrEqual(2);
  });

  test("F99-2 nav: 'Budaya' hanya sekali di header; footer benar kolomnya", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "Budaya", exact: true })).toHaveCount(1);
    await expect(header.getByRole("link", { name: "Budaya", exact: true })).toHaveAttribute("href", "/kanal/budaya");
    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: "Budaya Belitung" })).toHaveAttribute("href", "/budaya");
    await expect(footer.getByRole("link", { name: "Budaya", exact: true })).toHaveAttribute("href", "/kanal/budaya");
    // Kolom "Info Harian" di footer tidak lagi memuat tautan Budaya.
    const dailyNav = footer.locator('nav[aria-label="Info Harian"]');
    await expect(dailyNav.getByRole("link", { name: "Budaya", exact: true })).toHaveCount(0);
    await expectNoA11yViolations(page);
  });

  test("F99-3 lowongan: judul lebar penuh, lokasi hanya sekali per kartu", async ({ page }) => {
    await page.goto("/lowongan");
    await expect(page.locator("h1")).toContainText("Lowongan Kerja");
    const cards = page.locator("ul.grid > li");
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    const dup = await cards.evaluateAll((lis) =>
      lis.map((li) => {
        const first = li.firstElementChild?.tagName;
        const ps = [...li.querySelectorAll("p")];
        const locP = ps.find((p) => p.querySelector("svg"));
        const loc = locP ? (locP.textContent ?? "").trim() : "";
        // Lokasi boleh muncul hanya di SATU <p> (baris MapPin) — bukan di
        // Badge header (dihapus) maupun di tempat lain.
        const inParas = loc ? ps.filter((p) => (p.textContent ?? "").trim() === loc).length : 0;
        return { first, loc, inParas };
      }),
    );
    for (const d of dup) {
      expect(d.first).toBe("H2");
      expect(d.inParas).toBe(1);
    }
  });

  test("F99-4 harga pangan: tanggal WIB + tautan sumber hidup", async ({ page }) => {
    await page.goto("/harga-pangan");
    await expect(page.locator("h1")).toContainText("Harga Pangan");
    await expect(page.locator('a[href=""]')).toHaveCount(0);
    const sourceLink = page.getByRole("link", { name: /Lihat sumber data/ });
    await expect(sourceLink).toHaveAttribute("href", "https://adat.belitung.go.id/komoditas");
    const mainText = await page.locator("main").innerText();
    expect(mainText).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(mainText).toMatch(/Nov 2026/);
    expect(mainText).not.toContain("Invalid Date");
  });

  test("F99-5 kurs: tidak ada timestamp ISO mentah", async ({ page }) => {
    await page.goto("/kurs");
    await expect(page.locator("h1")).toContainText("Kurs");
    const body = await page.locator("main").innerText();
    expect(body).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(body).not.toContain("Invalid Date");
    expect(body).toMatch(/Nov 2026/);
  });

  test("F99-6 kedai: daftar menu versi teks dengan harga asli", async ({ page }) => {
    await page.goto("/kedai");
    await expect(page.locator("h1")).toContainText("Kedai");
    const textMenu = page.locator('section[aria-labelledby="menu-title"] ul').first();
    await expect(textMenu.locator("li")).toHaveCount(6);
    // formatRupiah id-ID merender "Rp 18.000" (spasi/NBSP sesudah Rp) —
    // normalisasi spasi dulu sebelum mencocokkan.
    const rawText = await textMenu.innerText();
    const text = rawText.replace(/[\u00a0\u202f]/g, " ");
    expect(text).toContain("Seblak Original");
    expect(text).toContain("Baso Aci Daging Cincang");
    expect(text).toContain("Lumpia Basah");
    expect(text.match(/Rp ?18\.000/g)?.length).toBe(5);
    expect(text).toContain("Rp 15.000");
  });

  test("F99-7 produk: teks internal hilang; status lisensi tidak menggantung", async ({ page }) => {
    await page.goto("/produk");
    await expect(page.getByRole("heading", { name: "Status lisensi saya" })).toBeVisible();
    const body = await page.locator("main").innerText();
    expect(body).not.toContain("Supabase Edge Function");
    expect(body).not.toContain("cron daily-info-fetch");
    // Tanpa Supabase live (seed), entitlement gagal cepat -> status akhir muncul.
    await expect(page.getByText(/Belum ada lisensi FULL aktif/)).toBeVisible({ timeout: 15_000 });
  });

  test("F99-8 artikel: breadcrumb Berita ke /kanal/berita; redirect lama bekerja", async ({ page }) => {
    // Artikel kanal berita (Polairud) — bukan pantai-tanjung-tinggi yang
    // kanalnya wisata sehingga breadcrumb-nya "Wisata".
    await page.goto("/artikel/kabar-peringati-hut-polairud-ke-76-polres-belitung-gelar-tabur-bun");
    const crumb = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(crumb.getByRole("link", { name: "Berita" })).toHaveAttribute("href", "/kanal/berita");
    await page.goto("/berita");
    await expect(page).toHaveURL(/\/kanal\/berita$/);
    await page.goto("/daftar");
    await expect(page).toHaveURL(/\/masuk$/);
    await page.goto("/wisata");
    await expect(page).toHaveURL(/\/kanal\/wisata$/);
    await page.goto("/kuliner");
    await expect(page).toHaveURL(/\/kanal\/kuliner$/);
  });

  test("F99-9 widget cuaca/salat: pesan ramah, tanpa jargon internal", async ({ page }) => {
    await page.goto("/");
    const body = await page.locator("main").innerText();
    expect(body).not.toContain("cron daily-info-fetch");
    expect(body).not.toContain("(P1)");
    await page.goto("/info-harian/cuaca");
    const cuaca = await page.locator("main").innerText();
    expect(cuaca).not.toContain("cron daily-info-fetch");
    expect(cuaca).not.toContain("(P1)");
  });
});

test.describe("F99 audit pengunjung 23 Nov", () => {
  for (const path of ["/ketentuan", "/penerjemah", "/info-harian", "/ai", "/pengaturan", "/verifikasi"]) {
    test(`F99-A ${path}: tanpa kode internal (P1–P4 / Fase N)`, async ({ page }) => {
      await page.goto(path);
      const text = await page.locator("main").innerText();
      expect(text).not.toMatch(/\bP[1-4]\b|\bFase \d|\bPhase \d|kunci Gemini/);
    });
  }
  test("F99-B penerjemah: tombol suara tidak lagi 'belum tersedia'", async ({ page }) => {
    await page.goto("/penerjemah");
    await expect(page.getByText("Suara / Foto (belum tersedia)")).toHaveCount(0);
  });
});
