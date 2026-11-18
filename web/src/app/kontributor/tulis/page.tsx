import type { Metadata } from "next";
import EditorPage from "./editor";

export const metadata: Metadata = {
  title: "Tulis cerita baru",
  description: "Editor kontributor iTAP: tulis cerita bilingual ID/EN, galeri, lokasi, simpan draft, kirim ke redaksi.",
};

export default function TulisBaruPage() {
  return <EditorPage />;
}
