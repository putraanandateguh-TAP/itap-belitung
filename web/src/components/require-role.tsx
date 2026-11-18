// Guard peran (client) — state "no permission" + "belum masuk" untuk halaman
// kontributor/redaksi/pengaturan. Auth di fase ini masih DEMO (localStorage).
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getSession, type DemoSession } from "@/lib/auth";
import { ButtonLink, EmptyState } from "./ui";

export function useSession(): DemoSession | null {
  const [session, setSessionState] = useState<DemoSession | null>(null);
  useEffect(() => {
    const read = () => setSessionState(getSession());
    read();
    window.addEventListener("itap-session-change", read);
    return () => window.removeEventListener("itap-session-change", read);
  }, []);
  return session;
}

export function RequireRole({
  roles,
  children,
  title,
}: {
  roles: DemoSession["role"][];
  children: ReactNode;
  title: string;
}) {
  const session = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div aria-busy="true" className="py-8"><div className="skeleton h-64 w-full" /></div>;
  if (!session) {
    return (
      <div className="py-8">
        <EmptyState
          title="Masuk dulu untuk membuka halaman ini."
          desc={`${title} hanya tersedia setelah masuk. Akun demo tersedia di halaman masuk.`}
          action={<ButtonLink href="/masuk">Masuk / daftar akun demo</ButtonLink>}
        />
      </div>
    );
  }
  if (!roles.includes(session.role)) {
    return (
      <div className="py-8">
        <EmptyState
          title="Kamu tidak punya izin untuk halaman ini."
          desc={`Halaman ${title} membutuhkan peran ${roles.join(" atau ")}. Akunmu saat ini: ${session.name}. Masuk dengan akun demo lain untuk melihatnya.`}
          action={<ButtonLink href="/masuk">Ganti akun demo</ButtonLink>}
        />
      </div>
    );
  }
  return <>{children}</>;
}
