// Pencarian (S06 versi aplikasi): ketik (debounce), filter urutan + kanal.
import { useEffect, useState } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CHANNEL_LABELS, space } from "../../theme";
import { endpoints } from "../../lib/api";
import { errorMessage, useApi } from "../../lib/hooks";
import { ArticleCard } from "../../components/ArticleCard";
import { Chip, EmptyState, ErrorState, Field, LoadingState, Screen } from "../../components/ui";
import type { ChannelStackParamList, HomeStackParamList } from "../../navigation/types";
import { asSharedNavigation } from "../../navigation/types";

type Props =
  | NativeStackScreenProps<ChannelStackParamList, "Search">
  | NativeStackScreenProps<HomeStackParamList, "Search">;

const SORTS = [
  { value: "terbaru", label: "Terbaru" },
  { value: "terpopuler", label: "Terpopuler" },
  { value: "banyak-dicari", label: "Banyak dicari" },
] as const;

export function SearchScreen({ navigation }: Props) {
  const nav = asSharedNavigation(navigation);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState<string>("terbaru");
  const [channel, setChannel] = useState<string | undefined>(undefined);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  const { data, loading, error, refresh } = useApi(
    () => endpoints.search(debounced, sort, channel),
    [debounced, sort, channel],
  );

  return (
    <Screen>
      <Field label="Cari artikel" value={query} onChangeText={setQuery} placeholder="Mis. pantai, mie belitung…" autoFocus />
      <View style={styles.chips}>
        {SORTS.map((s) => (
          <Chip key={s.value} label={s.label} active={sort === s.value} onPress={() => setSort(s.value)} />
        ))}
      </View>
      <View style={styles.chips}>
        <Chip label="Semua kanal" active={!channel} onPress={() => setChannel(undefined)} />
        {Object.keys(CHANNEL_LABELS).map((c) => (
          <Chip key={c} label={CHANNEL_LABELS[c]} active={channel === c} onPress={() => setChannel(c)} />
        ))}
      </View>
      {!debounced ? (
        <EmptyState title="Mulai mengetik untuk mencari" body="Hasil muncul setelah kamu berhenti mengetik." />
      ) : loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={refresh} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="Tidak ada hasil" body={`Tidak ada artikel untuk "${debounced}". Coba kata kunci lain.`} />
      ) : (
        data.items.map((a) => (
          <ArticleCard
            key={a.id}
            article={a}
            onPress={() => nav.navigate("ArticleDetail", { slug: a.slug })}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
