// Guard peran (client) — sesi dibaca dari /api/me/profile (cookie Supabase).
// Auth demo localStorage dihapus 2026-11-18 (replica-backend).
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "@/lib/session-client";
import type { Role } from "@/lib/types";
import { ButtonLink, EmptyState } from "./ui";
import { useLanguage } from "@/components/language-provider";

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
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || loading) return <div aria-busy="true" className="py-8"><div className="skeleton h-64 w-full" /></div>;
  if (!session) {
    return (
      <div className="py-8">
        <EmptyState
          title={t("requireRole.loginTitle")}
          desc={t("requireRole.loginDesc", { title })}
          action={<ButtonLink href="/masuk">{t("auth.signInUp")}</ButtonLink>}
          titleAs="h1"
        />
      </div>
    );
  }
  if (!roles.includes(session.role)) {
    return (
      <div className="py-8">
        <EmptyState
          title={t("requireRole.noPermission")}
          desc={t("requireRole.roleDesc", { title, roles: roles.join(" atau "), account: session.displayName ?? session.email, role: session.role })}
          action={<ButtonLink href="/masuk">{t("requireRole.signInOther")}</ButtonLink>}
          titleAs="h1"
        />
      </div>
    );
  }
  return <>{children}</>;
}
