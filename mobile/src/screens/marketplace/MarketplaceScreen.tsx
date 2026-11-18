// Marketplace — daftar penawaran publik (S07): ringkasan + filter kata kunci.
// GET /api/listings mengembalikan Paginated<Listing> { items, page, ... }
// (bukan array langsung) — layar memakai data.items + pagination, seperti kanal.
import { useState } from "react";
import { View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { endpoints } from "../../lib/api";
import { errorMessage, useApi } from "../../lib/hooks";
import { ListingCard } from "../../components/ListingCard";
import { EmptyState, ErrorState, Field, GhostButton, LoadingState, PrimaryButton, Screen } from "../../components/ui";
import { space } from "../../theme";
import type { MarketStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<MarketStackParamList, "Marketplace">;

export function MarketplaceScreen({ navigation }: Props) {
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const { data, loading, error, refresh } = useApi(
    () => endpoints.listings(appliedQ, page),
    [appliedQ, page],
  );

  return (
    <Screen>
      <Field label="Cari barang" value={q} onChangeText={setQ} placeholder="Mis. sepeda, kulkas…" />
      <PrimaryButton
        label="Cari"
        onPress={() => {
          setPage(1);
          setAppliedQ(q.trim() || undefined);
        }}
      />
      <GhostButton label="Pasang penawaran" onPress={() => navigation.navigate("ListingForm", {})} />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={refresh} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="Belum ada penawaran"
          body="Marketplace iTAP mulai dari nol — belum ada barang yang dipasang. Jadilah yang pertama."
        />
      ) : (
        <>
          {data.items.map((l) => (
            <ListingCard key={l.id} listing={l} onPress={() => navigation.navigate("ListingDetail", { id: l.id })} />
          ))}
          <View style={{ flexDirection: "row", gap: space.sm, justifyContent: "space-between" }}>
            <PrimaryButton label="Sebelumnya" disabled={page <= 1} onPress={() => setPage((p) => Math.max(1, p - 1))} />
            <PrimaryButton
              label="Berikutnya"
              disabled={page >= data.total_pages}
              onPress={() => setPage((p) => p + 1)}
            />
          </View>
        </>
      )}
    </Screen>
  );
}
