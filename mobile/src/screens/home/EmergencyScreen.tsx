// Nomor Darurat (S40): nomor darurat + rumah sakit Belitung.
// Data statis iTAP (sama dengan GET /api/daily/emergency di web) — bila API
// tidak terjangkau, tampilkan daftar bawaan yang sama dan beri tahu sumbernya.
import { Linking, Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, space, type } from "../../theme";
import { endpoints } from "../../lib/api";
import { useApi } from "../../lib/hooks";
import { Card, EmptyState, LoadingState, Muted, Screen, SectionTitle } from "../../components/ui";

const FALLBACK_NUMBERS = [
  { name: "Polres Belitung", number: "110" },
  { name: "Damkar Belitung", number: "113" },
  { name: "Ambulans / RSUD dr. H. Marsidi Judono", number: "118" },
  { name: "SAR / Basarnas Belitung", number: "115" },
  { name: "PLN Belitung", number: "123" },
] as const;

export function EmergencyScreen() {
  const { data, loading } = useApi(() => endpoints.emergency());
  const numbers = data && data.length > 0 ? data : FALLBACK_NUMBERS;
  return (
    <Screen>
      <SectionTitle>Nomor Darurat Belitung</SectionTitle>
      {loading ? <LoadingState label="Memuat…" /> : null}
      {!data ? (
        <Muted>
          Daftar dari server tidak terjangkau — menampilkan daftar darurat standar iTAP. Periksa
          ulang nomor sebelum menelepon dalam keadaan darurat.
        </Muted>
      ) : null}
      {numbers.length === 0 ? (
        <EmptyState title="Tidak ada nomor darurat" body="Coba lagi nanti." />
      ) : (
        numbers.map((entry) => (
          <Pressable
            key={entry.number + entry.name}
            onPress={() => void Linking.openURL(`tel:${entry.number}`)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Card>
              <Text style={styles.name}>{entry.name}</Text>
              <Text style={styles.number}>{entry.number}</Text>
              <Muted>Ketuk untuk menelepon</Muted>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg },
  pressed: { opacity: 0.85 },
  name: { ...type.base, color: colors.text, fontWeight: "600" },
  number: { ...type.xl, color: colors.accent },
});
