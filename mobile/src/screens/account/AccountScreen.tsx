// Akun aplikasi (S44): login, verifikasi, pengaturan, hapus akun.
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, space, type } from "../../theme";
import { useAuth } from "../../lib/auth";
import { Card, EmptyState, GhostButton, Muted, PrimaryButton, Screen, SectionTitle } from "../../components/ui";
import type { AccountStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<AccountStackParamList, "Account">;

export function AccountScreen({ navigation }: Props) {
  const { session, profile, signOut } = useAuth();

  if (!session) {
    return (
      <Screen>
        <EmptyState
          title="Kamu belum masuk"
          body="Masuk untuk memasang penawaran, chat penjual, menyimpan barang, dan menjadi Kreator."
        />
        <PrimaryButton label="Masuk / Daftar" onPress={() => navigation.navigate("Login")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.name}>{profile?.display_name ?? session.user.email ?? "Pengguna iTAP"}</Text>
        <Muted>{session.user.email}</Muted>
        <Muted>Peran: {profile?.role ?? "reader"}</Muted>
        <Muted>
          Email: {profile?.email_verified ? "terverifikasi" : "belum terverifikasi"} · WhatsApp:{" "}
          {profile?.whatsapp_verified ? "terverifikasi" : "belum terverifikasi"}
        </Muted>
        <Muted>
          Aturan marketplace:{" "}
          {profile?.marketplace_rules_accepted_at ? "disetujui" : "belum disetujui"}
        </Muted>
      </Card>
      <SectionTitle>Menu</SectionTitle>
      <View style={{ gap: space.sm }}>
        <GhostButton label="Verifikasi akun" onPress={() => navigation.navigate("Verify")} />
        <GhostButton label="Aturan Marketplace" onPress={() => navigation.navigate("Rules")} />
        <GhostButton label="Penawaranku" onPress={() => navigation.navigate("MyListings")} />
        <GhostButton label="Tersimpan / Disukai" onPress={() => navigation.navigate("Saved")} />
        <GhostButton label="Notifikasi" onPress={() => navigation.navigate("Notifications")} />
        <GhostButton label="Pengaturan" onPress={() => navigation.navigate("Settings")} />
        <GhostButton label="Hapus akun" onPress={() => navigation.navigate("DeleteAccount")} />
        <PrimaryButton label="Keluar" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { ...type.lg, color: colors.text },
});
