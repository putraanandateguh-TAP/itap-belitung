// Hook pemuatan data: loading / data / error + muat ulang. Dipakai semua
// layar agar state kosong, loading, dan error ditangani dengan cara yang sama.
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./api";

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | Error | null;
  refresh: () => void;
}

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [tick, setTick] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (!cancelled && mounted.current) setData(result);
      })
      .catch((e: unknown) => {
        if (!cancelled && mounted.current) {
          setError(e instanceof Error ? e : new Error("Gagal memuat data."));
        }
      })
      .finally(() => {
        if (!cancelled && mounted.current) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, refresh };
}

export function errorMessage(e: Error | ApiError | null): string {
  if (!e) return "";
  if (e instanceof ApiError && e.status === 501) {
    return "Fitur ini belum tersedia di server (menunggu Fase 3).";
  }
  if (e instanceof ApiError && e.status === 503) {
    return e.message;
  }
  return e.message;
}
