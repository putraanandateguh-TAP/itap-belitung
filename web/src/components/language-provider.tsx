// Provider bahasa antarmuka (client).
// Bahasa awal dipasok server dari cookie (layout) agar cocok dengan render
// server. Ganti bahasa: simpan cookie + localStorage, perbarui state, lalu
// router.refresh() supaya komponen server ikut me-render ulang.
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, LANG_STORAGE, t, type Lang } from "@/lib/i18n";

interface LanguageCtx {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** t(key, vars?) dalam bahasa aktif. */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<LanguageCtx>({
  lang: "id",
  setLang: () => undefined,
  t: (key: string, vars?: Record<string, string | number>) => t("id", key, vars),
});

export function LanguageProvider({ initialLang, children }: { initialLang: Lang; children: ReactNode }) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>(initialLang);
  const appliedStored = useRef(false);

  const setLang = useCallback(
    (next: Lang) => {
      if (next === lang) return;
      setLangState(next);
      try {
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
        window.localStorage.setItem(LANG_STORAGE, next);
      } catch {
        // Penyimpanan diblokir — state tetap berubah untuk sesi ini.
      }
      router.refresh();
    },
    [lang, router],
  );

  // Fallback localStorage: bila server tidak menerima cookie bahasa
  // (mis. cookie dihapus), terapkan preferensi tersimpan di perangkat lalu
  // tulis cookie-nya supaya render server berikutnya ikut.
  useEffect(() => {
    if (appliedStored.current) return;
    appliedStored.current = true;
    try {
      if (/(?:^|;\s*)itap_lang=/.test(document.cookie)) return;
      const raw = window.localStorage.getItem(LANG_STORAGE);
      if (raw !== "en" && raw !== "id") return;
      if (raw !== initialLang) setLang(raw);
    } catch {
      // Abaikan — tetap pakai bahasa awal dari server.
    }
    // Hanya saat mount; setLang stabil untuk nilai awal ini.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<LanguageCtx>(
    () => ({
      lang,
      setLang,
      t: (key: string, vars?: Record<string, string | number>) => t(lang, key, vars),
    }),
    [lang, setLang],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLanguage(): LanguageCtx {
  return useContext(Ctx);
}
