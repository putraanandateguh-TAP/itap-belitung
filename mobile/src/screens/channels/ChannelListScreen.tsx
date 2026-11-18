// Kanal (S02–S04 versi aplikasi): daftar artikel per kanal + pagination.
// Kanal iTAP (sejarah, budaya, legenda) ikut di route yang sama.
import { useState } from "react";
import { View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet } from "react-native";
import { CHANNEL_LABELS, space } from "../../theme";
import { endpoints } from "../../lib/api";
import { errorMessage, useApi } from "../../lib/hooks";
import { ArticleCard } from "../../components/ArticleCard";
import { Chip, EmptyState, ErrorState, GhostButton, LoadingState, PrimaryButton, Screen, SectionTitle } from "../../components/ui";
import type { ChannelStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<ChannelStackParamList, "Channels">;

const CHANNELS = ["berita", "kuliner", "wisata", "sejarah", "budaya", "legenda"];

export function ChannelListScreen({ navigation, route }: Props) {
  const [channel, setChannel] = useState(route.params?.channel ?? "berita");
  const [page, setPage] = useState(1);
  const { data, loading, error, refresh } = useApi(() => endpoints.articles(channel, undefined, page), [channel, page]);

  const pickChannel = (c: string) => {
    setChannel(c);
    setPage(1);
  };

  return (
    <Screen>
      <View style={styles.chips}>
        {CHANNELS.map((c) => (
          <Chip key={c} label={CHANNEL_LABELS[c]} active={channel === c} onPress={() => pickChannel(c)} />
        ))}
      </View>
      <GhostButton label="Cari artikel" onPress={() => navigation.navigate("Search")} />
      <SectionTitle>{CHANNEL_LABELS[channel] ?? channel}</SectionTitle>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={refresh} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="Belum ada artikel di kanal ini"
          body="Artikel diisi oleh iTAP dan kontributor. Coba kanal lain."
        />
      ) : (
        <>
          {data.items.map((a) => (
            <ArticleCard key={a.id} article={a} onPress={() => navigation.navigate("ArticleDetail", { slug: a.slug })} />
          ))}
          <View style={styles.pager}>
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

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  pager: { flexDirection: "row", gap: space.sm, justifyContent: "space-between" },
});
