// Helper bersama semua spec replica-test: gagal bila ada console error,
// gagal bila ada respons 5xx, dan axe scan per layar.
//
// Pengecualian yang disengaja (terdokumentasi, bukan menutupi bug):
// - Console "Failed to load resource" untuk status 4xx: halaman error
//   (mis. 404) memang sengaja mengembalikan 4xx, dan Chrome mencatatnya
//   sebagai console error. Yang dijaga adalah 5xx + error JS.
// - Respons 501/503: jawaban jujur "fitur belum tersedia" (AI Fase 3,
//   Supabase P1 belum ada). Yang dijaga adalah 500/502/504.
import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export function installGuards(page: Page) {
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    // Halaman error yang disengaja (4xx) + jawaban jujur "belum tersedia"
    // (501/503) memang tercatat Chrome sebagai "Failed to load resource";
    // yang dijaga adalah error JS + 5xx tak terduga.
    if (/Failed to load resource:.*status of (4\d\d|501|503)/.test(text)) return;
    throw new Error(`console error: ${text}`);
  });
  page.on("response", (res) => {
    const status = res.status();
    if (status >= 500 && status !== 501 && status !== 503) {
      throw new Error(`${status} on ${res.url()}`);
    }
  });
}

export async function expectNoA11yViolations(page: Page) {
  const a11y = await new AxeBuilder({ page }).analyze();
  expect(a11y.violations, JSON.stringify(a11y.violations, null, 2)).toEqual([]);
}
