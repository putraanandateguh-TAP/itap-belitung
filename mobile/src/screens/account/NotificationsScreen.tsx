// Notifikasi (S43): status push yang jujur. Tanpa proyek Firebase (P4)
// tidak ada token FCM dan tidak ada notifikasi push — layar ini menampilkan
// status itu, bukan daftar notifikasi palsu.
import { useState } from "react";
import { Card, EmptyState, GhostButton, Muted, Notice, Screen, SectionTitle } from "../../components/ui";
import { isApiConfigured, isSupabaseConfigured } from "../../lib/config";

export function NotificationsScreen() {
  const [checked, setChecked] = useState(false);
  return (
    <Screen>
      <SectionTitle>Notifikasi</SectionTitle>
      <Notice>
        Notifikasi push belum aktif. Aplikasi ini belum terhubung ke proyek Firebase (P4), jadi
        tidak ada token FCM yang terdaftar dan tidak ada notifikasi chat bersuara yang bisa
        dikirim. Pendaftaran token (`POST /api/devices`) sudah disiapkan sebagai stub di
        `src/lib/devices.ts` dan baru dipakai setelah P4 selesai.
      </Notice>
      <Card>
        <Muted>API web: {isApiConfigured ? "teratur" : "belum diatur (EXPO_PUBLIC_API_URL kosong)"}</Muted>
        <Muted>Supabase Auth: {isSupabaseConfigured ? "teratur" : "belum diatur (P1)"}</Muted>
        <Muted>Firebase / FCM: belum ada proyek (P4)</Muted>
      </Card>
      <GhostButton
        label="Periksa status lagi"
        onPress={() => setChecked(true)}
      />
      {checked ? <Muted>Status di atas dibaca dari konfigurasi aplikasi saat ini.</Muted> : null}
      <EmptyState
        title="Belum ada notifikasi"
        body="Setelah push aktif, notifikasi chat dan pengingat ketersediaan akan tampil di sini."
      />
    </Screen>
  );
}
