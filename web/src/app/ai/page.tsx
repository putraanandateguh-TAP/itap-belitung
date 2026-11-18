// AI iTAP (S41, F12) — chat + rencana perjalanan tersimpan.
// Login-gated (arsitektur §3.9: chat AI hanya untuk pengguna masuk).
import type { Metadata } from "next";
import { RequireRole } from "@/components/require-role";
import { AiChat } from "./ai-chat";

export const metadata: Metadata = {
  title: "AI iTAP",
  description:
    "Tanya AI iTAP tentang Belitung — pantai, kuliner, sejarah, dan rencana perjalanan per hari. Jawaban hanya dari konten iTAP yang dikurasi, disertai sumber.",
};

export default function AiPage() {
  return (
    <RequireRole roles={["reader", "contributor", "admin_portal", "superadmin"]} title="AI iTAP">
      <AiChat />
    </RequireRole>
  );
}
