import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Chromium Playwright v1255 gagal diunduh di VM ini (timeout registry,
// lihat replica/test-plan.md + /tmp/pw-chromium.log). Pakai Chromium 131
// yang sudah ada di cache (~/.cache/ms-playwright/chromium-1148).
const cachedChromium = join(homedir(), ".cache/ms-playwright/chromium-1148/chrome-linux/chrome");

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "e2e/results.json" }]],
  use: {
    baseURL: process.env.ITAP_BASE_URL ?? "http://localhost:3100",
    trace: "retain-on-failure",
    ...(existsSync(cachedChromium) ? { launchOptions: { executablePath: cachedChromium } } : {}),
  },
  // TIDAK ada webServer di sini: jalankan dev server sendiri sebelum tes.
  // Mode seed (sesuai brief replica-test — P1 belum terverifikasi dari VM ini):
  //   DATABASE_URL= NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY=
  //   SUPABASE_SERVICE_ROLE_KEY= CRON_SECRET= NEXT_PUBLIC_SITE_URL=http://localhost:3100
  //   npm run dev -- -p 3100
  // Variabel shell kosong mengalahkan .env.local (Next.js). JANGAN ubah
  // .env.local — file itu berisi kredensial proyek Supabase baru `itap-belitung`.
});
