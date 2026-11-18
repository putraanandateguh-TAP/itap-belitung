// Budaya — daftar cerita (S34) + detail cerita (S35): kategori, lirik lagu,
// sumber bacaan. Konten diisi iTAP sendiri.
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CULTURE_CATEGORY_LABELS, colors, radius, space, type } from "../../theme";
import { endpoints } from "../../lib/api";
import { errorMessage, useApi } from "../../lib/hooks";
import { formatDateWIB } from "../../lib/format";
import { Card, Chip, EmptyState, ErrorState, LoadingState, Muted, Screen, SectionTitle } from "../../components/ui";
import type { HomeStackParamList } from "../../navigation/types";

type ListProps = NativeStackScreenProps<HomeStackParamList, "Culture">;
type DetailProps = NativeStackScreenProps<HomeStackParamList, "CultureDetail">;

const CATEGORIES = Object.keys(CULTURE_CATEGORY_LABELS);

export function CultureListScreen({ navigation }: ListProps) {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const { data, loading, error, refresh } = useApi(() => endpoints.culture(category), [category]);
  return (
    <Screen>
      <SectionTitle>Cerita Budaya Belitung</SectionTitle>
      <Muted>Lebih dari 80 cerita budaya — setiap cerita mencantumkan sumber bacaannya.</Muted>
      <View style={styles.chips}>
        <Chip label="Semua" active={!category} onPress={() => setCategory(undefined)} />
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={CULTURE_CATEGORY_LABELS[c]}
            active={category === c}
            onPress={() => setCategory(c)}
          />
        ))}
      </View>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={refresh} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Belum ada cerita budaya"
          body="Cerita budaya diisi oleh iTAP. Coba kategori lain atau kembali lagi nanti."
        />
      ) : (
        data.map((story) => (
          <Pressable
            key={story.id}
            onPress={() => navigation.navigate("CultureDetail", { slug: story.slug })}
            style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Card>
              <Text style={styles.category}>
                {CULTURE_CATEGORY_LABELS[story.category] ?? story.category}
              </Text>
              <Text style={styles.title}>{story.title}</Text>
              <Muted>{formatDateWIB(story.created_at)}</Muted>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

export function CultureDetailScreen({ route }: DetailProps) {
  const { data, loading, error, refresh } = useApi(() => endpoints.cultureStory(route.params.slug));
  return (
    <Screen>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={refresh} />
      ) : !data ? (
        <EmptyState title="Cerita tidak ditemukan" body="Tautan mungkin sudah berubah." />
      ) : (
        <>
          <Text style={styles.detailTitle}>{data.title}</Text>
          <Muted>{CULTURE_CATEGORY_LABELS[data.category] ?? data.category}</Muted>
          <Text style={styles.body}>{data.body}</Text>
          {data.lyrics ? (
            <Card>
              <SectionTitle>Lirik</SectionTitle>
              <Text style={styles.body}>{data.lyrics}</Text>
            </Card>
          ) : null}
          {data.sources.length > 0 ? (
            <Card>
              <SectionTitle>Sumber Bacaan</SectionTitle>
              {data.sources.map((s) => (
                <Text key={s} style={styles.source}>
                  • {s}
                </Text>
              ))}
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  pressable: { borderRadius: radius.lg },
  pressed: { opacity: 0.85 },
  category: { ...type.xs, color: colors.accent, fontWeight: "700" },
  title: { ...type.base, color: colors.text, fontWeight: "600" },
  detailTitle: { ...type.xl, color: colors.text },
  body: { ...type.base, color: colors.text },
  source: { ...type.sm, color: colors.textMuted },
});
