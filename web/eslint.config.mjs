// ESLint flat config (workstream D, 2026-11-18).
// `next lint` sudah deprecated di Next 15 dan tidak ada konfigurasi ESLint
// di repo ini (ia malah membuka prompt interaktif) — jadi `npm run lint`
// kini memanggil CLI ESLint langsung. `eslint-config-next@15.1` masih
// format eslintrc, maka dipakai lewat FlatCompat (jalur migrasi resmi
// Next 15) sampai config tersebut menyediakan flat config native.
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const config = [
  js.configs.recommended,
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "next-env.d.ts",
      "test-results/**",
      "playwright-report/**",
    ],
  },
];

export default config;
