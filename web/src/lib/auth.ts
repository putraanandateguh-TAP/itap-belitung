// Sesi demo (client-side, localStorage) — BUKAN auth sungguhan.
// Supabase Auth (P1) belum ada. Login di S10 hanya memilih akun demo;
// S11 "verifikasi" memakai kode demo 123456 yang tampil di halaman.
// Semua penanda demo terlihat di UI agar tidak disangka akun nyata.
"use client";

import type { DemoSession, Role } from "./types";

export type { DemoSession } from "./types";

const KEY = "itap-demo-session";

export const DEMO_ACCOUNTS: { label: string; session: DemoSession }[] = [
  { label: "Pembaca", session: { name: "Rina (Pembaca Demo)", email: "rina@contoh.id", role: "reader", verified: false } },
  { label: "Kontributor", session: { name: "Dian (Kontributor Demo)", email: "dian@contoh.id", role: "contributor", verified: true } },
  { label: "Redaksi / Admin", session: { name: "Admin iTAP (Demo)", email: "redaksi@itapbelitung.my.id", role: "admin_portal", verified: true } },
];

export function getSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DemoSession) : null;
  } catch {
    return null;
  }
}

export function setSession(s: DemoSession | null): void {
  if (typeof window === "undefined") return;
  if (s) window.localStorage.setItem(KEY, JSON.stringify(s));
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("itap-session-change"));
}

export function roleLabel(role: Role): string {
  return role === "reader" ? "Pembaca" : role === "contributor" ? "Kontributor" : role === "admin_portal" ? "Admin Portal" : "Superadmin";
}
