// Sesi di client — dibaca dari /api/me/profile (cookie http-only Supabase).
// Menggantikan getSession()/localStorage demo yang dihapus 2026-11-18.
"use client";

import { useCallback, useEffect, useState } from "react";
import type { SessionProfile } from "./auth";

export function useSession(): { session: SessionProfile | null; loading: boolean; refresh: () => void } {
  const [session, setSession] = useState<SessionProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch("/api/me/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => { if (alive) setSession(p as SessionProfile | null); })
      .catch(() => { if (alive) setSession(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { session, loading, refresh };
}

/** Keluar — hapus cookie sesi di server (scope global bila everywhere). */
export async function signOut(everywhere = false): Promise<void> {
  await fetch(`/api/auth/signout${everywhere ? "?everywhere=1" : ""}`, { method: "POST" });
}
