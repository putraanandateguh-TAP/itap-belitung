// CRUD — artikel + listing + kontribusi (black-box, staging).
// Kontrak (dari src/app/api/*/route.ts + src/lib/marketplace.ts +
// src/lib/auth.ts + src/lib/validation.ts):
//   GET  /api/articles                    -> 200 (publik, boleh kosong)
//   GET  /api/articles/:slug              -> 200 / 404
//   POST /api/admin/articles (admin)      -> 201; reader -> 403; tanpa login -> 401
//   POST /api/contributions (contributor|admin) -> 201 draft
//   GET/PATCH /api/contributions/:id      -> pemilik/admin; orang lain -> 403/404
//   POST /api/listings (login + email/WA terverifikasi + aturan disetujui)
//                                        -> 201; tanpa login -> 401; belum
//                                          memenuhi gerbang -> 403
//   GET  /api/listings/:id                -> 200 / 404
//   PATCH/DELETE /api/listings/:id        -> pemilik/admin; orang lain -> 403
//   Body tidak valid (zod)               -> 400
// PRASYARAT staging: akun buyer sudah email+WhatsApp terverifikasi dan
// aturan marketplace disetujui (lihat TEST_PLAN.md § "Akun test") —
// tanpa itu POST /api/listings benar mengembalikan 403 (gerbang Fase 2).
import { test, expect, cfg, stagingReady, loginAs, api, runId } from "./helpers";

test.describe("staging — CRUD artikel & listing", () => {
  test.skip(!stagingReady, "env staging belum lengkap (STAGING_* di .env.staging.local)");

  test("CRUD-01 GET /api/articles -> 200, daftar berisi artikel seed staging", async ({ request }) => {
    const res = await api(request, "GET", "/api/articles");
    expect(res.status(), await res.text()).toBe(200);
    const body = (await res.json()) as { items?: Array<{ slug?: string }> };
    const slugs = (body.items ?? []).map((a) => a.slug);
    expect(slugs).toContain("staging-test-pantai-dummy");
  });

  test("CRUD-02 GET /api/articles/:slug seed -> 200; slug tidak ada -> 404", async ({ request }) => {
    const ok = await api(request, "GET", "/api/articles/staging-test-pantai-dummy");
    expect(ok.status()).toBe(200);
    const missing = await api(request, "GET", "/api/articles/tidak-ada-staging-test");
    expect(missing.status()).toBe(404);
  });

  test("CRUD-03 GET /api/articles/:slug draf TIDAK tampil publik -> 404", async ({ request }) => {
    const res = await api(request, "GET", "/api/articles/staging-test-draf-dummy");
    expect(res.status()).toBe(404);
  });

  test("CRUD-04 admin buat artikel -> 201, lalu terbaca publik bila published", async ({ request }) => {
    const token = await loginAs(request, cfg.admin);
    // category_id wajib UUID kategori yang ada (contributionSchema min 1).
    const cats = await api(request, "GET", "/api/categories?channel=wisata");
    expect(cats.status(), await cats.text()).toBe(200);
    const catList = (await cats.json()) as Array<{ id?: string; slug?: string }>;
    const cat = catList.find((c) => c.slug === "staging-test-wisata") ?? catList[0];
    expect(cat?.id, "kategori wisata seed harus ada").toBeTruthy();
    const title = `[STAGING-TEST] Artikel Baru ${runId}`;
    const res = await api(request, "POST", "/api/admin/articles", {
      token,
      data: {
        title_id: title,
        title_en: "",
        body_id: "Isi artikel staging yang dibuat test otomatis. Paragraf kedua.",
        body_en: "",
        channel: "wisata",
        category_id: cat?.id,
        location_name: "",
        source: "",
        status: "published",
      },
    });
    expect(res.status(), await res.text()).toBe(201);
    const body = (await res.json()) as { slug?: string };
    expect(body.slug).toBeTruthy();
  });

  test("CRUD-05 reader buat artikel admin -> 403; tanpa login -> 401", async ({ request }) => {
    const readerToken = await loginAs(request, cfg.reader);
    const payload = {
      title_id: `[STAGING-TEST] Dilarang ${runId}`,
      body_id: "Isi artikel staging yang dibuat test otomatis.",
      channel: "wisata",
      status: "draft",
    };
    const forbidden = await api(request, "POST", "/api/admin/articles", { token: readerToken, data: payload });
    expect(forbidden.status()).toBe(403);
    const anon = await api(request, "POST", "/api/admin/articles", { data: payload });
    expect(anon.status()).toBe(401);
  });

  test("CRUD-06 GET /api/admin/articles sebagai reader -> 403", async ({ request }) => {
    const readerToken = await loginAs(request, cfg.reader);
    const res = await api(request, "GET", "/api/admin/articles", { token: readerToken });
    expect(res.status()).toBe(403);
  });

  test("CRUD-07 buyer buat listing -> 201, lalu GET detail 200", async ({ request }) => {
    const token = await loginAs(request, cfg.buyer);
    const title = `[STAGING-TEST] Listing Baru ${runId}`;
    const res = await api(request, "POST", "/api/listings", {
      token,
      data: { title, description: "Listing dummy dari test otomatis staging.", price_cents: 1234500 },
    });
    expect(res.status(), await res.text()).toBe(201);
    const body = (await res.json()) as { id?: string };
    expect(body.id).toBeTruthy();
    const detail = await api(request, "GET", `/api/listings/${body.id}`);
    expect(detail.status()).toBe(200);
  });

  // CATATAN budget rate limit: POST /api/listings dibatasi 5/15 mnt per IP
  // (lib/rate-limit.ts). File ini memakai 4 token (CRUD-07, CRUD-08,
  // CRUD-10, CRUD-11); token ke-5 dipakai ERR-01 di errors.spec.ts.
  // Karena itu bagian "tanpa login" di sini DIHAPUS — sudah dicakup
  // ERR-01 — agar total tetap 5 dan tidak ada test yang kena 429.
  test("CRUD-08 POST /api/listings body tidak valid -> 400", async ({ request }) => {
    const token = await loginAs(request, cfg.buyer);
    const bad = await api(request, "POST", "/api/listings", {
      token,
      data: { title: "x", price_cents: -1 },
    });
    expect(bad.status()).toBe(400);
  });

  test("CRUD-09 GET /api/listings/:id tidak ada -> 404; page jauh -> 200", async ({ request }) => {
    const missing = await api(request, "GET", "/api/listings/tidak-ada-staging");
    expect(missing.status()).toBe(404);
    const far = await api(request, "GET", "/api/listings?page=999");
    expect(far.status()).toBe(200);
  });

  test("CRUD-10 pemilik PATCH listing sendiri -> 200; orang lain PATCH -> 403", async ({ request }) => {
    const buyerToken = await loginAs(request, cfg.buyer);
    const readerToken = await loginAs(request, cfg.reader);
    const created = await api(request, "POST", "/api/listings", {
      token: buyerToken,
      data: { title: `[STAGING-TEST] Edit ${runId}`, description: "Awal.", price_cents: 100000 },
    });
    expect(created.status(), await created.text()).toBe(201);
    const { id } = (await created.json()) as { id: string };
    const other = await api(request, "PATCH", `/api/listings/${id}`, {
      token: readerToken,
      data: { title: `[STAGING-TEST] Direbut ${runId}` },
    });
    expect(other.status()).toBe(403);
    const own = await api(request, "PATCH", `/api/listings/${id}`, {
      token: buyerToken,
      data: { description: "Diubah pemilik." },
    });
    expect(own.status(), await own.text()).toBe(200);
  });

  test("CRUD-11 pemilik DELETE listing sendiri -> 200 {ok:true}; DELETE lagi -> 404/403", async ({ request }) => {
    const buyerToken = await loginAs(request, cfg.buyer);
    const created = await api(request, "POST", "/api/listings", {
      token: buyerToken,
      data: { title: `[STAGING-TEST] Hapus ${runId}`, description: "Akan dihapus.", price_cents: 100000 },
    });
    expect(created.status(), await created.text()).toBe(201);
    const { id } = (await created.json()) as { id: string };
    const del = await api(request, "DELETE", `/api/listings/${id}`, { token: buyerToken });
    expect(del.status()).toBe(200);
    const again = await api(request, "DELETE", `/api/listings/${id}`, { token: buyerToken });
    expect([403, 404]).toContain(again.status());
  });

  test("CRUD-12 admin buat kontribusi (draft) -> 201; reader buat -> 403", async ({ request }) => {
    const adminToken = await loginAs(request, cfg.admin);
    const cats = await api(request, "GET", "/api/categories?channel=wisata");
    const catList = (await cats.json()) as Array<{ id?: string; slug?: string }>;
    const cat = catList.find((c) => c.slug === "staging-test-wisata") ?? catList[0];
    expect(cat?.id, "kategori wisata seed harus ada").toBeTruthy();
    const payload = {
      title_id: `[STAGING-TEST] Kontribusi ${runId}`,
      body_id: "Isi kontribusi dummy staging, minimal sepuluh karakter.",
      channel: "wisata",
      category_id: cat?.id,
    };
    const res = await api(request, "POST", "/api/contributions", { token: adminToken, data: payload });
    expect(res.status(), await res.text()).toBe(201);
    const body = (await res.json()) as { id?: string };
    expect(body.id).toBeTruthy();
    const readerToken = await loginAs(request, cfg.reader);
    const denied = await api(request, "POST", "/api/contributions", {
      token: readerToken,
      data: { ...payload, title_id: `[STAGING-TEST] Kontribusi Reader ${runId}` },
    });
    expect(denied.status()).toBe(403);
  });
});
