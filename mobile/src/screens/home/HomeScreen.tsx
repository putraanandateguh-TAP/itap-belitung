// Beranda aplikasi (S27): sapaan WIB, kartu cuaca + salat, menu 16 layanan.
// Menu 16 = 13 layanan hub info (recon S28–S41) + 3 kanal utama; CCTV dan
// Statistik isinya belum teramati di recon (placeholder jujur di layarnya).
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { NavigationProp } from "@react-navigation/native";
import { colors, radius, space, type } from "../../theme";
import { greetingWIB } from "../../lib/format";
import { useAuth } from "../../lib/auth";
import { endpoints } from "../../lib/api";
import { useApi } from "../../lib/hooks";
import { Card, Muted, Screen, SectionTitle } from "../../components/ui";
import type { HomeStackParamList, RootTabParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<HomeStackParamList, "Home">;

interface Service {
  label: string;
  route: keyof HomeStackParamList | "channel-berita" | "channel-kuliner" | "channel-wisata";
}

const SERVICES: Service[] = [
  { label: "Cuaca", route: "Weather" },
  { label: "Jadwal Salat", route: "Prayer" },
  { label: "Pesawat & Kapal", route: "Transport" },
  { label: "CCTV", route: "Cctv" },
  { label: "Harga & Stok", route: "Prices" },
  { label: "Harga BBM", route: "Fuel" },
  { label: "Budaya", route: "Culture" },
  { label: "Kreator", route: "Creator" },
  { label: "Penerjemah", route: "Translator" },
  { label: "Gempa", route: "Earthquake" },
  { label: "Statistik", route: "Stats" },
  { label: "Nomor Darurat", route: "Emergency" },
  { label: "AI iTAP", route: "Ai" },
  { label: "Berita", route: "channel-berita" },
  { label: "Kuliner", route: "channel-kuliner" },
  { label: "Wisata", route: "channel-wisata" },
];

export function HomeScreen({ navigation }: Props) {
  const { profile } = useAuth();
  const weather = useApi(() => endpoints.daily("weather"));
  const prayer = useApi(() => endpoints.daily("prayer"));
  const tabNav = navigation.getParent<NavigationProp<RootTabParamList>>();

  const openService = (service: Service) => {
    if (service.route === "channel-berita" || service.route === "channel-kuliner" || service.route === "channel-wisata") {
      const channel = service.route.replace("channel-", "");
      tabNav?.navigate("ChannelTab", { screen: "Channels", params: { channel } });
      return;
    }
    navigation.navigate(service.route as never);
  };

  const name = profile?.display_name ?? "Warga Belitung";
  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.greeting}>
          {greetingWIB()}, {name}
        </Text>
        <Muted>Portal Belitung — berita, kuliner, wisata, dan jual beli warga.</Muted>
      </View>

      <Card>
        <SectionTitle>Cuaca Tanjung Pandan</SectionTitle>
        {weather.loading ? (
          <Muted>Memuat cuaca…</Muted>
        ) : weather.error || !weather.data ? (
          <Muted>
            Data cuaca belum tersedia — cron daily-info-fetch belum mengisi cache, atau API belum
            diatur.
          </Muted>
        ) : (
          <Muted>
            Terakhir diperbarui {weather.data.as_of}
            {weather.data.stale ? " (mungkin sudah usang)" : ""}. Buka halaman Cuaca untuk
            detailnya.
          </Muted>
        )}
      </Card>

      <Card>
        <SectionTitle>Jadwal Salat</SectionTitle>
        {prayer.loading ? (
          <Muted>Memuat jadwal…</Muted>
        ) : prayer.error || !prayer.data ? (
          <Muted>Data jadwal salat belum tersedia.</Muted>
        ) : (
          <Muted>
            Terakhir diperbarui {prayer.data.as_of}
            {prayer.data.stale ? " (mungkin sudah usang)" : ""}. Buka halaman Jadwal Salat untuk
            detailnya.
          </Muted>
        )}
      </Card>

      <SectionTitle>Layanan</SectionTitle>
      <View style={styles.grid}>
        {SERVICES.map((s) => (
          <Pressable
            key={s.label}
            onPress={() => openService(s)}
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
            accessibilityRole="button"
          >
            <Text style={styles.tileLabel}>{s.label}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.xs },
  greeting: { ...type.xl, color: colors.text },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  tile: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: "22%",
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 72,
    padding: space.sm,
  },
  tilePressed: { opacity: 0.8 },
  tileLabel: { ...type.sm, color: colors.text, fontWeight: "600", textAlign: "center" },
});
