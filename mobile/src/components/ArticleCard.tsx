// Kartu artikel — dipakai kanal, pencarian, beranda, rekomendasi.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CHANNEL_LABELS, colors, radius, space, type } from "../theme";
import { formatDateWIB } from "../lib/format";
import type { Article } from "../types";

export function ArticleCard({
  article,
  onPress,
}: {
  article: Article;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={styles.metaRow}>
        <Text style={styles.channel}>{CHANNEL_LABELS[article.channel] ?? article.channel}</Text>
        <Text style={styles.date}>{formatDateWIB(article.published_at)}</Text>
      </View>
      <Text style={styles.title} numberOfLines={3}>
        {article.title_id}
      </Text>
      {article.location_name ? <Text style={styles.location}>{article.location_name}</Text> : null}
      <Text style={styles.views}>{article.views} kali dibaca</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.xs,
    padding: space.lg,
  },
  pressed: { opacity: 0.85 },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  channel: { ...type.xs, color: colors.accent, fontWeight: "700" },
  date: { ...type.xs, color: colors.textMuted },
  title: { ...type.base, color: colors.text, fontWeight: "600" },
  location: { ...type.sm, color: colors.textMuted },
  views: { ...type.xs, color: colors.textMuted },
});
