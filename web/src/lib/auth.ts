// Auth + otorisasi iTAP Belitung — Supabase Auth (menggantikan auth demo).
//
// YANG DIHAPUS 2026-11-18 (replica-backend): sesi localStorage, akun demo
// (Rina/Dian/Admin), dan kode OTP demo `123456` yang tampil di halaman.
// Sesi kini cookie http-only milik Supabase Auth; peran dibaca dari
// profiles.role; hapus akun lewat Edge Function service-role (F16).
//
// SATU fungsi otorisasi: `can()` — semua route/server action menanyakan
// fungsi ini sebelum baca/tulis. RLS di schema.sql adalah pertahanan kedua
// untuk akses langsung via Supabase client.
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "./db";
import { profiles } from "./db/schema";
import type { Role } from "./types";

export type { Role } from "./types";

export interface SessionProfile {
  id: string;
  email: string;
  displayName: string | null;
  role: Role;
  /** true bila email DAN whatsapp terverifikasi (gerbang marketplace Fase 2) */
  verified: boolean;
  emailVerified: boolean;
  whatsappVerified: boolean;
  marketplaceRulesAccepted: boolean;
}

export function roleLabel(role: Role): string {
  return role === "reader" ? "Pembaca"
    : role === "contributor" ? "Kontributor"
    : role === "admin_portal" ? "Admin Portal" : "Superadmin";
}

export const ADMIN_ROLES: Role[] = ["admin_portal", "superadmin"];
export const isAdmin = (p: SessionProfile | null | undefined): boolean =>
  !!p && ADMIN_ROLES.includes(p.role);
export const isSuperadmin = (p: SessionProfile | null | undefined): boolean =>
  p?.role === "superadmin";

export type Action =
  | "comment.create"
  | "contribution.create"
  | "contribution.edit"
  | "contribution.submit"
  | "contribution.review"
  | "article.create"
  | "article.review"
  | "category.manage"
  | "contributor.manage"
  | "report.create"
  | "report.review"
  | "moderation-word.manage"
  | "listing.create"
  | "listing.edit"
  | "listing.moderate"
  | "thread.create"
  | "message.send"
  | "info.submit"
  | "info.review"
  | "profile.edit"
  | "admin.read";

/**
 * Satu fungsi otorisasi: "bolehkah user ini melakukan aksi ini pada record ini?"
 * `record` membawa ownerId / status bila relevan. Mengembalikan boolean —
 * route yang menolak memakai 403 dengan pesan yang sama.
 */
export function can(
  user: SessionProfile | null | undefined,
  action: Action,
  record?: { ownerId?: string | null; status?: string | null },
): boolean {
  if (!user) return false;
  const owner = record?.ownerId ? record.ownerId === user.id : false;
  switch (action) {
    case "comment.create":
    case "report.create":
    case "info.submit":
      return user.emailVerified;
    case "contribution.create":
      return user.role === "contributor" || isAdmin(user);
    case "contribution.edit":
    case "contribution.submit":
      if (isAdmin(user)) return true;
      if (!owner || user.role !== "contributor") return false;
      // Terkunci saat review (recon F09); admin boleh kapan saja.
      return record?.status !== "review";
    case "contribution.review":
    case "article.review":
    case "category.manage":
    case "contributor.manage":
    case "report.review":
    case "info.review":
    case "article.create":
    case "admin.read":
    case "listing.moderate":
      return isAdmin(user);
    case "moderation-word.manage":
      return isSuperadmin(user);
    case "listing.create":
      // Gerbang Fase 2: email + WhatsApp terverifikasi + aturan disetujui.
      return user.emailVerified && user.whatsappVerified && user.marketplaceRulesAccepted;
    case "listing.edit":
      return owner || isAdmin(user);
    case "thread.create":
      return user.emailVerified && user.whatsappVerified;
    case "message.send":
      return owner; // owner = peserta thread (dicek route via thread)
    case "profile.edit":
      return owner || isAdmin(user);
    default:
      return false;
  }
}

/** Profil sesi dari Supabase Auth + tabel profiles. Null bila belum masuk / DB belum ada (P1). */
export async function getCurrentProfile(): Promise<SessionProfile | null> {
  const { getAuthUser } = await import("./supabase/server");
  const authUser = await getAuthUser();
  if (!authUser || !isDbConfigured()) return null;
  try {
    const db = getDb();
    const rows = await db.select().from(profiles).where(eq(profiles.id, authUser.id)).limit(1);
    const p = rows[0];
    if (!p) return null;
    const emailVerified = Boolean(authUser.email_confirmed_at);
    const whatsappVerified = Boolean(p.whatsappVerifiedAt);
    return {
      id: p.id,
      email: p.email,
      displayName: p.displayName,
      role: p.role as Role,
      emailVerified,
      whatsappVerified,
      verified: emailVerified && whatsappVerified,
      marketplaceRulesAccepted: Boolean(p.marketplaceRulesAcceptedAt),
    };
  } catch {
    return null;
  }
}

/** Bentuk profil dari baris profiles (dipakai seed + route admin). */
export function toSessionProfile(
  p: typeof profiles.$inferSelect,
  emailVerified = false,
): SessionProfile {
  const whatsappVerified = Boolean(p.whatsappVerifiedAt);
  return {
    id: p.id,
    email: p.email,
    displayName: p.displayName,
    role: p.role as Role,
    emailVerified,
    whatsappVerified,
    verified: emailVerified && whatsappVerified,
    marketplaceRulesAccepted: Boolean(p.marketplaceRulesAcceptedAt),
  };
}
