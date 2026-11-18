// Statistik (S39) — menu ada di recon, isinya tidak teramati. Placeholder
// jujur, diputuskan di M5.
import { EmptyState, Notice, Screen } from "../../components/ui";

export function StatsScreen() {
  return (
    <Screen>
      <Notice>
        Layanan Statistik belum tersedia. Di recon, menu ini tercatat ada tetapi isinya tidak
        teramati, jadi belum ada angka yang bisa ditampilkan.
      </Notice>
      <EmptyState
        title="Belum ada statistik yang bisa ditampilkan"
        body="Statistik portal (mis. jumlah artikel atau penawaran) akan tampil di sini setelah diputuskan sumber datanya."
      />
    </Screen>
  );
}
