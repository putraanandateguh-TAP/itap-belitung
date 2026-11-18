// F03/F05/F06/F07/F08 — Marketplace API (tanpa login; UI M3 belum ada).
// F03-H1 & F03-E1 & F03-N2: saat ini GAGAL dengan 500 (BUG-001) — test ini
// ditulis dulu sebagai failing test, lalu diperbaiki di Step 5.
import { test, expect } from "@playwright/test";

test.describe("F03 marketplace API publik", () => {
  test("F03-H1 GET /api/listings -> 200 daftar publik (boleh kosong)", async ({ request }) => {
    const res = await request.get("/api/listings");
    expect(res.status(), await res.text()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test("F03-E1 GET /api/listings/:id tidak ada -> 404, bukan 500", async ({ request }) => {
    const res = await request.get("/api/listings/tidak-ada");
    expect(res.status()).toBe(404);
  });

  test("F03-N2 GET /api/listings?page=999 -> 200, bukan 500", async ({ request }) => {
    const res = await request.get("/api/listings?page=999");
    expect(res.status()).toBe(200);
  });
});

test.describe("F05/F06/F07/F08 marketplace tulis tanpa login -> 401", () => {
  test("F05-H1 POST /api/listings tanpa login -> 401", async ({ request }) => {
    const res = await request.post("/api/listings", {
      data: { title: "Sepeda bekas", description: "Masih bagus", price_cents: 500000 },
    });
    expect(res.status()).toBe(401);
  });

  test("F06-H1/H2 bookmark + thread tanpa login -> 401", async ({ request }) => {
    const b = await request.post("/api/listings/abc/bookmark", { data: { type: "save" } });
    expect(b.status()).toBe(401);
    const t = await request.post("/api/threads", { data: { listing_id: "abc" } });
    expect(t.status()).toBe(401);
  });

  test("F07-H1 confirm tanpa login -> 401; cron tanpa secret -> 503 jujur", async ({ request }) => {
    const c = await request.post("/api/listings/abc/confirm");
    expect(c.status()).toBe(401);
    const r = await request.get("/api/cron/availability-reminders");
    expect(r.status()).toBe(503);
    const s = await request.get("/api/cron/sold-listing-cleanup");
    expect(s.status()).toBe(503);
  });

  test("F08-H1/H2/H3/H4 lapor + blokir + admin tanpa login -> 401", async ({ request }) => {
    const rep = await request.post("/api/listings/abc/report", { data: { reason: "spam" } });
    expect(rep.status()).toBe(401);
    const blk = await request.post("/api/users/abc/block");
    expect(blk.status()).toBe(401);
    for (const p of ["/api/admin/reports", "/api/admin/moderation-words", "/api/admin/articles", "/api/admin/categories", "/api/admin/contributors"]) {
      const res = await request.get(p);
      expect(res.status(), p).toBe(401);
    }
  });
});
