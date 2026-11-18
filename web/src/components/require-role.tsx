// Guard peran (client) — sesi dibaca dari /api/me/profile (cookie Supabase).
// Auth demo localStorage dihapus 2026-11-18 (replica-backend).
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "@/lib/session-client";
import type { Role } from "@/lib/types";
import { ButtonLink, EmptyState } from "./ui";

export function RequireRole({
  roles,
  children,
  title,
}: {
  roles: Role[];
  children: ReactNode;
  title: string;
}) {
  const { session, loading } = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || loading) return <div aria-busy="true" className="py-8"><div className="skeleton h-64 w-full" /></div>;
  if (!session) {
    return (
      <div className="py-8">
        <EmptyState
          title="Masuk dulu untuk membuka halaman ini."
          desc={`${title} hanya tersedia setelah masuk.`}
          action={<ButtonLink href="/masuk">Masuk / daftar</ButtonLink>}
          titleAs="h1"
        />
      </div>
    );
  }
  if (!roles.includes(session.role)) {
    return (
      <div className="py-8">
        <EmptyState
          title="Kamu tidak punya izin untuk halaman ini."
          desc={`Halaman ${title} membutuhkan peran ${roles.join(" atau ")}. Akunmu saat ini: ${session.displayName ?? session.email} (${session.role}).`}
          action={<ButtonLink href="/masuk">Masuk dengan akun lain</ButtonLink>}
          titleAs="h1"
        />
      </div>
    );
  }
  return <>{children}</>;
}
