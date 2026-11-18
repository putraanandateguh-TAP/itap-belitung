// Kartu penawaran marketplace — ringkasan publik (F03). Detail privat hanya
// tampil di layar detail bila server mengizinkan.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LISTING_STATUS_LABELS, colors, radius, space, type } from "../theme";
import { formatDateWIB, formatRupiah } from "../lib/format";
import type { Listing } from "../types";

export function ListingCard({
  listing,
  onPress,
}: {
  listing: Listing;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={styles.row}>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        <Text style={styles.status}>{LISTING_STATUS_LABELS[listing.status] ?? listing.status}</Text>
      </View>
      <Text style={styles.price}>{formatRupiah(listing.price_cents)}</Text>
      <Text style={styles.meta}>
        {[listing.location_name, formatDateWIB(listing.created_at)].filter(Boolean).join(" · ")}
      </Text>
      <Text style={styles.meta}>
        {listing.views} dilihat · {listing.saves_count} disimpan · {listing.likes_count} disukai
      </Text>
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
  row: { flexDirection: "row", justifyContent: "space-between", gap: space.sm },
  title: { ...type.base, color: colors.text, flex: 1, fontWeight: "600" },
  status: { ...type.xs, color: colors.accent, fontWeight: "700" },
  price: { ...type.lg, color: colors.text },
  meta: { ...type.sm, color: colors.textMuted },
});
