// Hook entitlement lisensi (client). Status hidup di memori saja —
// sengaja TANPA localStorage: status FULL tidak boleh diputuskan atau
// dipertahankan client-side (temuan audit K1: flag localStorage).
// `refresh()` dipanggil ulang setelah aktivasi berhasil.
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchEntitlement,
  NO_ENTITLEMENT,
  type Entitlement,
} from "@/lib/license";

export function useLicense() {
  const [entitlement, setEntitlement] = useState<Entitlement>(NO_ENTITLEMENT);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const e = await fetchEntitlement();
    setEntitlement(e);
    setLoading(false);
    return e;
  }, []);

  useEffect(() => {
    let alive = true;
    fetchEntitlement().then((e) => {
      if (alive) {
        setEntitlement(e);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const hasProduct = useCallback(
    (product: string) => entitlement.entitled && entitlement.products.includes(product),
    [entitlement],
  );

  return { ...entitlement, loading, refresh, hasProduct };
}
