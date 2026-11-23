// AI iTAP (S41, F12) — chat + rencana perjalanan tersimpan.
// Login-gated (arsitektur §3.9: chat AI hanya untuk pengguna masuk).
import type { Metadata } from "next";
import { RequireRole } from "@/components/require-role";
import { AiChat } from "./ai-chat";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "AI iTAP",
  description:
    "Tanya AI iTAP tentang Belitung — pantai, kuliner, sejarah, dan rencana perjalanan per hari. Jawaban mengutamakan konten iTAP yang dikurasi, disertai sumber.",
};

export default async function AiPage() {
  const lang = await getServerLang();
  return (
    <RequireRole roles={["reader", "contributor", "admin_portal", "superadmin"]} title={t(lang, "ai.title")}>
      <AiChat />
    </RequireRole>
  );
}
