import type { Metadata } from "next";
import EditorPage from "../editor";

export const metadata: Metadata = {
  title: "Ubah kiriman",
  description: "Ubah draf atau kiriman kontributor. Kiriman yang sedang ditinjau redaksi terkunci.",
};

export default async function UbahKirimanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditorPage contributionId={id} />;
}
