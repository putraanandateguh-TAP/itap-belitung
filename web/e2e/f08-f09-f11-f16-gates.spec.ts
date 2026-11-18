// F08/F09/F11/F16 — Gate otorisasi halaman terproteksi (tanpa login).
import { test, expect } from "@playwright/test";
import { installGuards, expectNoA11yViolations } from "./helpers";

const GATED = [
  { url: "/redaksi", caseId: "F11-H1", title: "Ruang Redaksi" },
  { url: "/kontributor", caseId: "F09-H1", title: "Dashboard kontributor" },
  { url: "/kontributor/tulis", caseId: "F09-H2", title: "Editor kontributor" },
  { url: "/pengaturan", caseId: "F16-H1", title: "Pengaturan akun" },
  { url: "/hapus-akun", caseId: "F16-H2", title: "Hapus akun" },
];

test.describe("Gate halaman terproteksi (tanpa login)", () => {
  test.beforeEach(async ({ page }) => installGuards(page));

  for (const g of GATED) {
    test(`${g.caseId} ${g.url} -> gate "Masuk dulu"`, async ({ page }) => {
      await page.goto(g.url);
      await expect(page.getByText("Masuk dulu untuk membuka halaman ini.")).toBeVisible();
      // exact:true — footer juga punya tautan "Masuk / Daftar" (huruf D besar).
      await expect(page.getByRole("link", { name: "Masuk / daftar", exact: true })).toBeVisible();
      await expectNoA11yViolations(page);
    });
  }

  test("F09-H3/F16-H3/F16-H4 API terproteksi tanpa login -> 401", async ({ request }) => {
    for (const p of ["/api/contributions", "/api/me/listings", "/api/me/saved", "/api/me/points", "/api/me/contributor", "/api/me/threads"]) {
      const res = await request.get(p);
      expect(res.status(), p).toBe(401);
    }
    const del = await request.delete("/api/me");
    expect(del.status()).toBe(401);
  });

  test("F16-H3b GET /api/me/profile tanpa login -> 200 null, bukan 401 (BUG-002)", async ({ request }) => {
    // useSession() memanggil endpoint ini di SETIAP halaman (site-chrome);
    // 401 membuat Chrome mencatat console error di setiap kunjungan anonim.
    // Pola whoami: anonim -> 200 + null; PATCH tetap 401.
    const res = await request.get("/api/me/profile");
    expect(res.status()).toBe(200);
    expect(await res.json()).toBeNull();
  });

  test("F16-H3c PATCH /api/me/profile tanpa login -> tetap 401", async ({ request }) => {
    const res = await request.patch("/api/me/profile", { data: { displayName: "X" } });
    expect(res.status()).toBe(401);
  });
});
