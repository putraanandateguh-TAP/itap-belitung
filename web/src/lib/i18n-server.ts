// Helper i18n sisi server — membaca preferensi bahasa dari cookie.
// Dipakai komponen server (layout, halaman) agar terjemahan benar sejak
// render pertama (tanpa mismatch hidrasi).
import { cookies } from "next/headers";
import { LANG_COOKIE, normalizeLang, type Lang } from "./i18n";

export async function getServerLang(): Promise<Lang> {
  const store = await cookies();
  return normalizeLang(store.get(LANG_COOKIE)?.value);
}
