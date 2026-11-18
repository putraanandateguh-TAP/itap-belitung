// Persetujuan aturan marketplace (S12): teks aturan ditulis baru dengan
// kata-kata iTAP sendiri (bukan copy Satam), lalu dicatat via API.
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { colors, type } from "../../theme";
import { endpoints } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Card, Muted, PrimaryButton, Screen, SectionTitle } from "../../components/ui";

const RULES = [
  "Jual barang yang memang milikmu dan boleh dijual. Jangan pasang barang curian, palsu, atau terlarang.",
  "Tulis judul, deskripsi, harga, dan kondisi barang dengan jujur. Foto harus foto barang yang sebenarnya.",
  "Harga yang tampil adalah harga yang kamu minta. Pembayaran dan pengiriman diatur langsung dengan pembeli lewat chat — aplikasi tidak menyediakan pembayaran atau rekening bersama.",
  "Nomor penjual tidak ditampilkan ke publik; pembeli menghubungimu lewat chat aplikasi.",
  "Bila barang terjual, tandai terjual. Penawaran terjual disembunyikan dari daftar setelah 24 jam.",
  "Konfirmasi ketersediaan saat diminta. Penawaran yang lama tidak dikonfirmasi bisa dinonaktifkan.",
  "Bersikap sopan di chat. Penipuan, spam, dan ujaran kebencian bisa membuat akunmu dinonaktifkan setelah ditinjau moderator.",
  "Laporan dari pengguna lain ditinjau redaksi. Keputusan moderator bersifat final untuk penawaran yang dilaporkan.",
];

export function RulesScreen() {
  const { profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const accepted = Boolean(profile?.marketplace_rules_accepted_at);

  const accept = async () => {
    setBusy(true);
    try {
      await endpoints.acceptMarketplaceRules();
      await refreshProfile();
      setMessage("Aturan disetujui. Kamu bisa memasang penawaran setelah verifikasi lengkap.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal menyimpan persetujuan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <SectionTitle>Aturan Jual Beli iTAP</SectionTitle>
      <Muted>
        {accepted
          ? "Kamu sudah menyetujui aturan ini."
          : "Baca dan setujui aturan berikut sebelum memasang penawaran atau mengirim pesan pertama."}
      </Muted>
      <Card>
        {RULES.map((r, i) => (
          <Text key={i} style={styles.rule}>
            {i + 1}. {r}
          </Text>
        ))}
      </Card>
      {message ? <Muted>{message}</Muted> : null}
      {!accepted ? (
        <PrimaryButton label="Saya setuju dengan aturan ini" onPress={() => void accept()} loading={busy} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rule: { ...type.base, color: colors.text },
});
