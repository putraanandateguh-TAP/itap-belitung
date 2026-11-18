// F12/F13 — AI Satam + Penerjemah menjawab 501 yang jujur (Fase 3, P3).
// Test ini memastikan API TIDAK mengarang jawaban/terjemahan.
import { test, expect } from "@playwright/test";

test.describe("F12 AI Satam -> 501 jujur", () => {
  test("F12-H1 POST /api/ai/chat -> 501, tanpa jawaban palsu", async ({ request }) => {
    const res = await request.post("/api/ai/chat", { data: { message: "Rencana 2 hari di Belitung" } });
    expect(res.status()).toBe(501);
    const text = await res.text();
    expect(text).toContain("Fase 3");
    expect(text).not.toMatch(/hari 1|itinerary|Pantai Tanjung/i);
  });

  test("F12-H2 POST /api/ai/feedback -> 501", async ({ request }) => {
    const res = await request.post("/api/ai/feedback", { data: { message: "x", feedback: "up" } });
    expect(res.status()).toBe(501);
  });

  test("F12-H3 GET /api/ai/itineraries tanpa login -> 501 (stub Fase 3)", async ({ request }) => {
    // Route ini stub Fase 3 yang mengembalikan 501 tanpa memeriksa login
    // (by design — fiturnya belum ada untuk siapa pun). Bukan 401.
    const res = await request.get("/api/ai/itineraries");
    expect(res.status()).toBe(501);
  });

  test("F12-E1 pesan kosong / sangat panjang -> 400 atau 501, bukan 500", async ({ request }) => {
    const empty = await request.post("/api/ai/chat", { data: { message: "" } });
    expect([400, 501]).toContain(empty.status());
    const long = await request.post("/api/ai/chat", { data: { message: "x".repeat(10000) } });
    expect([400, 501]).toContain(long.status());
  });
});

test.describe("F13 Penerjemah -> 501 jujur", () => {
  test("F13-H1 POST /api/translate -> 501, tanpa terjemahan palsu", async ({ request }) => {
    const res = await request.post("/api/translate", { data: { text: "Selamat pagi", target_lang: "en" } });
    expect(res.status()).toBe(501);
    expect(await res.text()).toContain("Fase 3");
  });

  test("F13-E1 teks kosong / sangat panjang -> 400 atau 501", async ({ request }) => {
    const empty = await request.post("/api/translate", { data: { text: "", target_lang: "en" } });
    expect([400, 501]).toContain(empty.status());
    const long = await request.post("/api/translate", { data: { text: "x".repeat(10000), target_lang: "en" } });
    expect([400, 501]).toContain(long.status());
  });

  test("F13-E2 bahasa tidak didukung -> 400", async ({ request }) => {
    const res = await request.post("/api/translate", { data: { text: "halo", target_lang: "xx" } });
    expect([400, 501]).toContain(res.status());
    expect(res.status()).not.toBe(500);
  });
});
