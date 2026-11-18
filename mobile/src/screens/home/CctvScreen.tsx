// CCTV (S31) — menu ada di recon, isinya tidak teramati. Placeholder jujur:
// bukan data palsu, dan diputuskan di M5 sebelum diisi.
import { EmptyState, Notice, Screen } from "../../components/ui";

export function CctvScreen() {
  return (
    <Screen>
      <Notice>
        Layanan CCTV belum tersedia. Di recon, menu ini tercatat ada tetapi isinya tidak teramati,
        jadi belum ada sumber data yang bisa ditampilkan.
      </Notice>
      <EmptyState
        title="Belum ada kamera yang bisa ditampilkan"
        body="Bila iTAP nanti menyediakan tautan CCTV publik Belitung, layar ini akan menampilkan daftarnya di sini."
      />
    </Screen>
  );
}
