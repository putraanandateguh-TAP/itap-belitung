// Detail rencana perjalanan tersimpan (S41, F12).
import type { Metadata } from "next";
import { RequireRole } from "@/components/require-role";
import { ItineraryDetail } from "./itinerary-detail";

export const metadata: Metadata = {
  title: "Rencana perjalanan · AI iTAP",
  description: "Rencana perjalanan per hari yang dibuat AI iTAP dari konten iTAP yang dikurasi.",
};

export default async function ItineraryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireRole roles={["reader", "contributor", "admin_portal", "superadmin"]} title="Rencana perjalanan">
      <ItineraryDetail id={id} />
    </RequireRole>
  );
}
