// Tampilan snapshot info harian — bentuk payload cron belum tentu sama antar
// sumber, jadi render dibuat defensif: waktu salat bila bisa dikenali,
// lalu pasangan kunci/nilai sederhana. Tanpa snapshot: pesan jujur.
import { StyleSheet, Text, View } from "react-native";
import { extractPrayerTimes, snapshotPrimitives } from "../lib/format";
import { colors, space, type } from "../theme";
import type { DailySnapshot } from "../types";
import { Card, Muted } from "./ui";

export function SnapshotView({ snapshot }: { snapshot: DailySnapshot }) {
  const prayers = extractPrayerTimes(snapshot.payload);
  const primitives = snapshotPrimitives(snapshot.payload);
  return (
    <View style={{ gap: space.lg }}>
      <Card>
        <Text style={styles.label}>Terakhir diperbarui</Text>
        <Text style={styles.value}>{snapshot.as_of}</Text>
        {snapshot.stale ? (
          <Muted>Data ini mungkin sudah usang — cron belum mengambil data terbaru.</Muted>
        ) : null}
        {snapshot.note ? <Muted>{snapshot.note}</Muted> : null}
      </Card>
      {prayers.length > 0 ? (
        <Card>
          <Text style={styles.label}>Jadwal salat</Text>
          {prayers.map((p) => (
            <View key={p.name} style={styles.row}>
              <Text style={styles.value}>{p.name}</Text>
              <Text style={styles.value}>{p.time}</Text>
            </View>
          ))}
        </Card>
      ) : null}
      {primitives.length > 0 ? (
        <Card>
          {primitives.map((p) => (
            <View key={p.label} style={styles.row}>
              <Text style={styles.label}>{p.label}</Text>
              <Text style={[styles.value, styles.wrap]}>{p.value}</Text>
            </View>
          ))}
        </Card>
      ) : prayers.length === 0 ? (
        <Card>
          <Muted>
            Data tersimpan tapi tidak ada isi yang bisa ditampilkan. Coba lagi setelah cron
            mengambil data terbaru.
          </Muted>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...type.sm, color: colors.textMuted },
  value: { ...type.base, color: colors.text },
  wrap: { flex: 1, textAlign: "right" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: space.sm },
});
