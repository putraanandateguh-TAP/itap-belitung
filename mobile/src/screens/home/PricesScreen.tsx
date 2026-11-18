// Harga & Stok (S32): harga pangan harian iTAP (GET /api/prices) — konten
// iTAP sendiri, bukan data Satam.
import { StyleSheet, Text, View } from "react-native";
import { colors, space, type } from "../../theme";
import { endpoints } from "../../lib/api";
import { errorMessage, useApi } from "../../lib/hooks";
import { formatRupiah } from "../../lib/format";
import { Card, EmptyState, ErrorState, LoadingState, Muted, Screen, SectionTitle } from "../../components/ui";

export function PricesScreen() {
  const { data, loading, error, refresh } = useApi(() => endpoints.prices());
  return (
    <Screen>
      <SectionTitle>Harga Pangan Harian</SectionTitle>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={refresh} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="Harga hari ini belum tersedia"
          body="Harga pangan diperbarui harian oleh iTAP. Coba lagi nanti."
        />
      ) : (
        <>
          <Muted>
            {data.market} · {data.source_date} · Sumber: {data.source}
          </Muted>
          {data.items.map((item) => (
            <Card key={item.id}>
              <View style={styles.row}>
                <Text style={styles.name}>{item.commodity}</Text>
                <Text style={styles.price}>{formatRupiah(item.price * 100)}</Text>
              </View>
              <Muted>
                per {item.unit}
                {item.previous_price !== null
                  ? ` · sebelumnya ${formatRupiah(item.previous_price * 100)}`
                  : ""}
                {item.change_note ? ` · ${item.change_note}` : ""}
              </Muted>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", gap: space.sm },
  name: { ...type.base, color: colors.text, flex: 1, fontWeight: "600" },
  price: { ...type.base, color: colors.text, fontWeight: "700" },
});
