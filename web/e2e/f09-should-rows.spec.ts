// W5 parity-should-rows — F1 kirim info warga + F2 riwayat revisi + diff.
// Mode seed: tidak ada sesi login (Supabase P1 belum live), jadi:
// - Alur anonim diverifikasi apa adanya (gate jujur + API 401).
// - Alur login diverifikasi di LEVEL UI dengan sesi + respons API yang
//   di-mock lewat page.route (Playwright) — data-layer aslinya sudah
//   diverifikasi 15/15 lewat /tmp/verify-should-rows.ts (tsx, mode seed).
// - Payload revisi yang di-mock adalah fixture NYATA dari data-layer seed
//   (e2e/fixtures/w5-revisions.json, dihasilkan ~/workspace/w5-verify-should-rows.ts),
//   bukan karangan.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { installGuards, expectNoA11yViolations } from "./helpers";

const REVISIONS_FIXTURE = JSON.parse(readFileSync("e2e/fixtures/w5-revisions.json", "utf-8"));

const READER_SESSION = {
  id: "u-warga", email: "warga@contoh.id", displayName: "Warga",
  role: "reader", verified: true, emailVerified: true,
  whatsappVerified: false, marketplaceRulesAccepted: false,
};
const CONTRIBUTOR_SESSION = {
  id: "u-dian", email: "dian@contoh.id", displayName: "Dian (Kontributor Demo)",
  role: "contributor", verified: true, emailVerified: true,
  whatsappVerified: true, marketplaceRulesAccepted: true,
};

// Dashboard kontributor seed (bentuk dari data-seed getContributorDashboard),
// dengan satu kiriman yang id-nya cocok dengan fixture revisi.
const CONTRIBUTOR_DASHBOARD = {
  total_views: 1240, approved_count: 1, pending_count: 1, draft_count: 1, points_total: 2,
  submissions: [
    {
      id: "c-fixture", title_id: "Uji revisi W5", title_en: "",
      body_id: "Paragraf satu asli.\n\nParagraf dua diubah total.\n\nParagraf tiga baru.",
      body_en: "", channel: "wisata", category_id: "pantai-pulau",
      location_name: "Tanjung Pandan", source: "", status: "published",
      views: 12, note_from_editor: null, updated_at: "2026-11-18T13:27:22.051Z",
    },
  ],
};

test.describe("W5 F1 — Kirim info warga", () => {
  test.beforeEach(async ({ page }) => installGuards(page));

  test("F1-H1 hub Info Harian menautkan ke /info-harian/kirim", async ({ page }) => {
    await page.goto("/info-harian");
    const link = page.getByRole("link", { name: /kirim info warga/i });
    await expect(link).toBeVisible({ timeout: 30000 });
    expect(await link.getAttribute("href")).toBe("/info-harian/kirim");
    await expectNoA11yViolations(page);
  });

  test("F1-H2 anonim -> gate jujur (bukan form)", async ({ page }) => {
    await page.goto("/info-harian/kirim");
    await expect(page.getByText("Masuk dulu untuk membuka halaman ini.")).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole("link", { name: "Masuk / daftar", exact: true })).toBeVisible();
    await expect(page.getByLabel("Informasi yang ingin dibagikan")).toHaveCount(0);
    await expectNoA11yViolations(page);
  });

  test("F1-H3 API tanpa login -> 401 (jujur)", async ({ request }) => {
    const res = await request.post("/api/info-submissions", { data: { text: "Jadwal kapal feri berubah: berangkat 08.00 dan 14.00." } });
    expect(res.status()).toBe(401);
    const rev = await request.get("/api/contributions/c-1/revisions");
    expect(rev.status()).toBe(401);
  });

  test("F1-H4 form: validasi min 10 karakter + kirim sukses (sesi/API di-mock)", async ({ page }) => {
    await page.route("**/api/me/profile", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(READER_SESSION) }));
    await page.route("**/api/info-submissions", (route) => route.fulfill({
      status: 201, contentType: "application/json",
      body: JSON.stringify({ id: "is-mock", user_id: "u-warga", user_name: "Warga", text: "x", status: "pending", curated_for_ai: false, created_at: new Date().toISOString() }),
    }));
    await page.goto("/info-harian/kirim");
    const box = page.getByLabel("Informasi yang ingin dibagikan");
    await expect(box).toBeVisible();
    await box.fill("pendek");
    await expect(page.getByText("Informasi minimal 10 karakter.")).toBeVisible();
    await expect(page.getByText(/\/ 5000 karakter/)).toBeVisible();
    await box.fill("Jadwal kapal feri Tanjung Pandan – Pulau Leebong berubah: berangkat 08.00 dan 14.00 setiap hari.");
    await page.getByRole("button", { name: "Kirim ke redaksi" }).click();
    await expect(page.getByText("Kirimanmu masuk antrean kurasi redaksi.")).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("F1-H5 form: error server tampil jujur (sesi/API di-mock, 403)", async ({ page }) => {
    await page.route("**/api/me/profile", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(READER_SESSION) }));
    await page.route("**/api/info-submissions", (route) => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "Kirim info butuh email terverifikasi." }) }));
    await page.goto("/info-harian/kirim");
    await page.getByLabel("Informasi yang ingin dibagikan").fill("Jadwal kapal feri berubah: berangkat 08.00 dan 14.00.");
    await page.getByRole("button", { name: "Kirim ke redaksi" }).click();
    await expect(page.getByText("Kirim info butuh email terverifikasi.")).toBeVisible({ timeout: 30000 });
  });
});

test.describe("W5 F2 — Riwayat revisi + diff (sesi/API di-mock, payload fixture nyata)", () => {
  test.beforeEach(async ({ page }) => installGuards(page));

  test("F2-H1 dashboard kontributor: riwayat tampil + diff antar versi bekerja", async ({ page }) => {
    test.setTimeout(180000);
    await page.route("**/api/me/profile", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTRIBUTOR_SESSION) }));
    await page.route("**/api/me/contributor", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTRIBUTOR_DASHBOARD) }));
    await page.route("**/api/me/points", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }));
    await page.route("**/api/contributions/*/revisions", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(REVISIONS_FIXTURE) }));
    await page.goto("/kontributor", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Dashboard kontributor" })).toBeVisible({ timeout: 30000 });
    await page.getByRole("button", { name: "Riwayat revisi" }).click();
    await expect(page.getByRole("heading", { name: /Riwayat revisi: Uji revisi W5/ })).toBeVisible();
    await expect(page.getByText("Draf dibuat.")).toBeVisible();
    await expect(page.getByText("Dikirim ke redaksi.")).toBeVisible();
    await expect(page.getByText("Bagus, terbit.")).toBeVisible();
    // Pasangan yang isinya berubah bergantung urutan milidetik create/edit —
    // coba tiap tombol diff sampai ketemu pasangan yang benar-benar berubah
    // (ada baris berwarna: tambah hijau / hapus merah).
    const diffButtons = page.getByRole("button", { name: "Lihat perubahan dari versi sebelumnya" });
    await expect(diffButtons).toHaveCount(3);
    let foundChangedPair = false;
    for (let i = 0; i < 3; i++) {
      await diffButtons.nth(i).click();
      if (await page.getByLabel("Perbandingan isi antar versi").locator(".bg-success-soft, .bg-danger-soft").first().isVisible().catch(() => false)) {
        foundChangedPair = true;
        break;
      }
    }
    expect(foundChangedPair).toBe(true);
    await expect(page.getByText("Paragraf tiga baru.")).toBeVisible();
    await expect(page.getByText("Paragraf dua asli.")).toBeVisible();
    await expect(page.getByText("Paragraf dua diubah total.")).toBeVisible();
    await expect(page.getByText(/Hijau \(\+\) = ditambahkan/)).toBeVisible();
    await expectNoA11yViolations(page);
  });
});
