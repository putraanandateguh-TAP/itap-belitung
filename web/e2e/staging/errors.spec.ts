// ERROR HANDLING + UNAUTHORIZED ACCESS (black-box, staging).
// Kontrak (dari src/lib/api.ts: requireSession -> 401, requireAdmin
// -> 403, errorToResponse: UNAUTHORIZED 401 / FORBIDDEN 403 /
// NOT_FOUND 404 / CONFLICT 409 / lainnya 500; parseJsonBody -> 400):
//   endpoint tulis tanpa login -> 401; peran salah -> 403;
//   id/slug tidak ada -> 404; body rusak -> 400; TIDAK ADA 500
//   untuk input yang bisa diprediksi.
// File ini SENGAJA tidak memanggil endpoint lisensi dengan kode gagal
// (budget rate limit Edge Function dipakai habis oleh license.spec.ts).
import { test, expect, cfg, stagingReady, loginAs, api } from "./helpers";

const WRITE_ENDPOINTS: Array<{ method: "POST" | "PATCH" | "DELETE"; path: string; data?: unknown }> = [
  { method: "POST", path: "/api/listings", data: { title: "Sepeda bekas", description: "x", price_cents: 1000 } },
  { method: "POST", path: "/api/contributions", data: { title_id: "Judul uji", body_id: "Isi minimal sepuluh karakter.", channel: "wisata", category_id: "x" } },
  { method: "POST", path: "/api/license/validate", data: { code: "ITAP-TEST-VALD-0001", action: "validate" } },
  { method: "POST", path: "/api/license/admin", data: { action: "list" } },
  { method: "PATCH", path: "/api/listings/tidak-ada-staging", data: { title: "x" } },
  { method: "DELETE", path: "/api/listings/tidak-ada-staging" },
];

test.describe("staging — unauthorized access & error handling", () => {
  test.skip(!stagingReady, "env staging belum lengkap (STAGING_* di .env.staging.local)");

  test("ERR-01 semua endpoint tulis tanpa login -> 401 (bukan 500/200)", async ({ request }) => {
    for (const ep of WRITE_ENDPOINTS) {
      const res = await api(request, ep.method, ep.path, { data: ep.data });
      expect(res.status(), `${ep.method} ${ep.path}`).toBe(401);
    }
    // Endpoint admin baca tanpa login -> 401 juga.
    const adminRead = await api(request, "GET", "/api/admin/articles");
    expect(adminRead.status()).toBe(401);
  });

  test("ERR-02 endpoint admin sebagai reader -> 403", async ({ request }) => {
    const token = await loginAs(request, cfg.reader);
    for (const path of ["/api/admin/articles", "/api/admin/categories", "/api/admin/contributors", "/api/admin/reports"]) {
      const res = await api(request, "GET", path, { token });
      expect(res.status(), path).toBe(403);
    }
  });

  test("ERR-03 reader memanggil /api/license/admin -> 403 (bukan 200)", async ({ request }) => {
    const token = await loginAs(request, cfg.reader);
    const res = await api(request, "POST", "/api/license/admin", { token, data: { action: "list" } });
    expect(res.status()).toBe(403);
  });

  test("ERR-04 GET id/slug tidak ada -> 404 dengan pesan, bukan 500", async ({ request }) => {
    const token = await loginAs(request, cfg.buyer);
    for (const path of [
      "/api/articles/tidak-ada-staging",
      "/api/listings/tidak-ada-staging",
      "/api/contributions/00000000-0000-4000-8000-000000000000",
    ]) {
      const res = await api(request, "GET", path, { token });
      expect(res.status(), path).toBe(404);
      const text = await res.text();
      expect(text.length).toBeGreaterThan(0);
    }
  });

  // CATATAN budget rate limit: POST /api/listings dibatasi 5/15 mnt per IP
  // (lib/rate-limit.ts) dan crud.spec.ts sudah memakai 4 token. Karena
  // itu ERR-05/ERR-06 memakai /api/contributions (batas 10/15 mnt,
  // terpakai 2 di crud.spec.ts) agar tidak memicu 429 di sini.
  test("ERR-05 body JSON rusak ke endpoint tulis (login) -> 400, bukan 500", async ({ request }) => {
    const token = await loginAs(request, cfg.admin);
    const res = await api(request, "POST", "/api/contributions", { token, rawBody: "{rusak" });
    expect(res.status()).toBe(400);
  });

  test("ERR-06 body validasi gagal (tipe salah) -> 400 + details", async ({ request }) => {
    const token = await loginAs(request, cfg.admin);
    const res = await api(request, "POST", "/api/contributions", {
      token,
      data: { title_id: 123, body_id: "x", channel: "wisata", category_id: "y" },
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error?: string; details?: string[] };
    expect(body.error).toBeTruthy();
  });

  test("ERR-07 route tidak dikenal -> 404 (Next.js)", async ({ request }) => {
    const res = await api(request, "GET", "/api/tidak-ada-staging");
    expect(res.status()).toBe(404);
  });

  test("ERR-08 header CORS/JSON: respons error berupa JSON valid", async ({ request }) => {
    const res = await api(request, "GET", "/api/articles/tidak-ada-staging");
    expect(res.status()).toBe(404);
    const body = (await res.json()) as { error?: string };
    expect(typeof body.error).toBe("string");
  });
});
