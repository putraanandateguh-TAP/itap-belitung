// Lapor / blokir (S26): laporkan konten atau blokir akun. Laporan ditinjau
// moderator (S22); blokir bersifat per akun.
import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { endpoints } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Card, Field, GhostButton, Muted, PrimaryButton, Screen, SectionTitle } from "../../components/ui";
import type { AccountStackParamList, MarketStackParamList } from "../../navigation/types";

type Props =
  | NativeStackScreenProps<MarketStackParamList, "Report">
  | NativeStackScreenProps<AccountStackParamList, "Report">;

const REASONS = ["Penipuan", "Barang tidak sesuai deskripsi", "Spam", "Konten tidak pantas", "Lainnya"];

export function ReportScreen({ route, navigation }: Props) {
  const { targetType, targetId, label } = route.params;
  const { session } = useAuth();
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submitReport = async () => {
    if (!session) {
      setMessage("Masuk dulu untuk melaporkan.");
      return;
    }
    setBusy(true);
    try {
      await endpoints.reportListing(targetId, `${reason}${detail.trim() ? `: ${detail.trim()}` : ""}`);
      setMessage("Laporan terkirim. Moderator akan meninjaunya.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal mengirim laporan.");
    } finally {
      setBusy(false);
    }
  };

  const block = async () => {
    if (targetType !== "account") {
      setMessage("Blokir hanya tersedia untuk akun, bukan untuk penawaran.");
      return;
    }
    if (!session) {
      setMessage("Masuk dulu untuk memblokir.");
      return;
    }
    setBusy(true);
    try {
      await endpoints.blockUser(targetId);
      setMessage("Akun diblokir.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal memblokir.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <SectionTitle>Laporkan</SectionTitle>
      <Card>
        <Muted>
          Target: {label} ({targetType === "listing" ? "penawaran" : targetType === "account" ? "akun" : "komentar"})
        </Muted>
        <Muted>Laporan ditinjau moderator. Bila terbukti melanggar, materi bisa disembunyikan atau akun dinonaktifkan.</Muted>
      </Card>
      {REASONS.map((r) => (
        <GhostButton key={r} label={`${reason === r ? "✓ " : ""}${r}`} onPress={() => setReason(r)} />
      ))}
      <Field label="Detail (opsional)" value={detail} onChangeText={setDetail} placeholder="Jelaskan singkat…" multiline />
      {message ? <Muted>{message}</Muted> : null}
      <PrimaryButton label="Kirim laporan" onPress={() => void submitReport()} loading={busy} />
      {targetType === "account" ? (
        <GhostButton label="Blokir akun ini" onPress={() => void block()} />
      ) : null}
      <GhostButton label="Kembali" onPress={() => navigation.goBack()} />
    </Screen>
  );
}
