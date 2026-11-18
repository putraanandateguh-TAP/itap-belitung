// Marketplace — daftar penawaran publik (S07): ringkasan + filter kata kunci.
import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { endpoints } from "../../lib/api";
import { errorMessage, useApi } from "../../lib/hooks";
import { ListingCard } from "../../components/ListingCard";
import { EmptyState, ErrorState, Field, GhostButton, LoadingState, PrimaryButton, Screen } from "../../components/ui";
import type { MarketStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<MarketStackParamList, "Marketplace">;

export function MarketplaceScreen({ navigation }: Props) {
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState<string | undefined>(undefined);
  const { data, loading, error, refresh } = useApi(() => endpoints.listings(appliedQ), [appliedQ]);

  return (
    <Screen>
      <Field label="Cari barang" value={q} onChangeText={setQ} placeholder="Mis. sepeda, kulkas…" />
      <PrimaryButton label="Cari" onPress={() => setAppliedQ(q.trim() || undefined)} />
      <GhostButton label="Pasang penawaran" onPress={() => navigation.navigate("ListingForm", {})} />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={refresh} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Belum ada penawaran"
          body="Marketplace iTAP mulai dari nol — belum ada barang yang dipasang. Jadilah yang pertama."
        />
      ) : (
        data.map((l) => (
          <ListingCard key={l.id} listing={l} onPress={() => navigation.navigate("ListingDetail", { id: l.id })} />
        ))
      )}
    </Screen>
  );
}
