// Pengaturan akun (S18): profil, lokasi, bahasa. Hapus akun (S25): hapus
// akun + semua data terkait (Edge Function service-role, F16).
import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../lib/auth";
import { endpoints } from "../../lib/api";
import { clearTranslationHistory } from "../../lib/translation-history";
import { Card, Field, GhostButton, Muted, Notice, PrimaryButton, Screen, SectionTitle } from "../../components/ui";
import type { AccountStackParamList } from "../../navigation/types";

type SettingsProps = NativeStackScreenProps<AccountStackParamList, "Settings">;
type DeleteProps = NativeStackScreenProps<AccountStackParamList, "DeleteAccount">;

export function SettingsScreen({ navigation }: SettingsProps) {
  const { profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp_number ?? "");
  const [location, setLocation] = useState(profile?.location_name ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    try {
      await endpoints.updateProfile({
        display_name: name.trim() || undefined,
        whatsapp_number: whatsapp.trim() || undefined,
        location_name: location.trim() || undefined,
      });
      await refreshProfile();
      setMessage("Pengaturan disimpan.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  const setLanguage = async (lang: "id" | "en") => {
    try {
      await endpoints.updateProfile({ language_pref: lang });
      await refreshProfile();
      setMessage(`Bahasa diubah ke ${lang === "id" ? "Indonesia" : "English"}.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal mengubah bahasa.");
    }
  };

  return (
    <Screen>
      <SectionTitle>Profil</SectionTitle>
      <Field label="Nama tampilan" value={name} onChangeText={setName} />
      <Field label="Nomor WhatsApp" value={whatsapp} onChangeText={setWhatsapp} placeholder="08xxxxxxxxxx" keyboardType="phone-pad" />
      <Field label="Lokasi (nama wilayah)" value={location} onChangeText={setLocation} placeholder="Mis. Tanjung Pandan" />
      <Muted>
        Titik lokasi (koordinat) bersifat opsional dan hanya dipakai untuk penawaranmu — tambah,
        ubah, atau hapus kapan saja.
      </Muted>
      {message ? <Muted>{message}</Muted> : null}
      <PrimaryButton label="Simpan pengaturan" onPress={() => void save()} loading={busy} />
      <SectionTitle>Bahasa</SectionTitle>
      <GhostButton label="Bahasa Indonesia" onPress={() => void setLanguage("id")} />
      <GhostButton label="English" onPress={() => void setLanguage("en")} />
      <Muted>Bahasa saat ini: {profile?.language_pref === "en" ? "English" : "Indonesia"}</Muted>
      <GhostButton label="Hapus akun…" onPress={() => navigation.navigate("DeleteAccount")} />
    </Screen>
  );
}

export function DeleteAccountScreen({ navigation }: DeleteProps) {
  const { signOut } = useAuth();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await endpoints.deleteAccount();
      await clearTranslationHistory();
      await signOut();
      navigation.navigate("Account");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal menghapus akun.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <SectionTitle>Hapus Akun</SectionTitle>
      <Notice>
        Tindakan ini tidak bisa dibatalkan. Yang ikut terhapus: penawaranmu, percakapan, kontribusi
        dan draft, kiriman, tanggapan, poin, revisi, sesi login, registrasi push, dan riwayat
        penerjemah di perangkat ini.
      </Notice>
      {message ? <Muted>{message}</Muted> : null}
      {step === 1 ? (
        <Card>
          <Muted>
            Bila kamu yakin, lanjut ke konfirmasi akhir. Bila hanya ingin berhenti sementara,
            cukup keluar dari akun.
          </Muted>
          <PrimaryButton label="Lanjut — saya mengerti risikonya" onPress={() => setStep(2)} danger />
          <GhostButton label="Batal" onPress={() => navigation.goBack()} />
        </Card>
      ) : (
        <Card>
          <Muted>
            Konfirmasi akhir: ketuk tombol di bawah untuk menghapus akunmu beserta semua data di
            atas.
          </Muted>
          <PrimaryButton label="Ya, hapus akunku selamanya" onPress={() => void confirmDelete()} loading={busy} danger />
          <GhostButton label="Batal" onPress={() => navigation.goBack()} />
        </Card>
      )}
    </Screen>
  );
}
