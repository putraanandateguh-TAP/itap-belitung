// Detail penawaran (S08 publik / S09 privat): ringkasan untuk pengunjung,
// detail penuh + kontak penjual hanya bila server mengizinkan (pembeli
// terverifikasi / pemilik / admin). Simpan/suka, chat, lapor.
import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, space, type } from "../../theme";
import { endpoints } from "../../lib/api";
import { errorMessage, useApi } from "../../lib/hooks";
import { useAuth } from "../../lib/auth";
import { formatDateWIB, formatRupiah } from "../../lib/format";
import { Card, EmptyState, ErrorState, GhostButton, LoadingState, Muted, PrimaryButton, Screen, SectionTitle } from "../../components/ui";
import type { ChatStackParamList, MarketStackParamList } from "../../navigation/types";
import { asSharedNavigation } from "../../navigation/types";

type Props =
  | NativeStackScreenProps<MarketStackParamList, "ListingDetail">
  | NativeStackScreenProps<ChatStackParamList, "ListingDetail">;

export function ListingDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const nav = asSharedNavigation(navigation);
  const { session, profile } = useAuth();
  const { data, loading, error, refresh } = useApi(() => endpoints.listing(id), [id]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const full = Boolean(data?.description !== undefined);
  const isOwner = profile && data?.seller_id === profile.id;

  const startChat = async () => {
    if (!session) {
      setNotice("Masuk dulu untuk chat dengan penjual.");
      return;
    }
    setBusy(true);
    try {
      const thread = await endpoints.createThread(id);
      nav.navigate("ChatRoom", { threadId: thread.id, listingTitle: data?.title, listingId: id });
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Gagal membuka chat.");
    } finally {
      setBusy(false);
    }
  };

  const save = async (type: "save" | "like") => {
    if (!session) {
      setNotice("Masuk dulu untuk menyimpan penawaran.");
      return;
    }
    try {
      await endpoints.bookmark(id, type);
      setNotice(type === "save" ? "Penawaran disimpan." : "Penawaran disukai.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Gagal menyimpan.");
    }
  };

  return (
    <Screen>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={refresh} />
      ) : !data ? (
        <EmptyState title="Penawaran tidak ditemukan" body="Mungkin sudah dihapus penjual." />
      ) : (
        <>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.price}>{formatRupiah(data.price_cents)}</Text>
          <Muted>
            {data.location_name ?? "Lokasi tidak dicantumkan"} · {formatDateWIB(data.created_at)} ·{" "}
            {data.views} dilihat · {data.saves_count} disimpan · {data.likes_count} disukai
          </Muted>
          {full ? (
            <Card>
              <SectionTitle>Deskripsi</SectionTitle>
              <Text style={styles.body}>{data.description ?? ""}</Text>
              {data.seller_contact ? (
                <Muted>Kontak penjual (tersamar di luar chat): {data.seller_contact}</Muted>
              ) : null}
              {data.location_lat !== null && data.location_lat !== undefined ? (
                <GhostButton
                  label="Lihat titik penjual di peta"
                  onPress={() => void Linking.openURL(`https://maps.google.com/?q=${data.location_lat},${data.location_lng}`)}
                />
              ) : null}
            </Card>
          ) : (
            <Card>
              <Muted>
                Detail penuh (deskripsi, kontak penjual, titik lokasi) hanya untuk pembeli yang
                sudah login dan terverifikasi. Masuk dan verifikasi akunmu untuk melihatnya.
              </Muted>
            </Card>
          )}
          {notice ? <Muted>{notice}</Muted> : null}
          <View style={{ gap: space.sm }}>
            {!isOwner ? (
              <PrimaryButton label="Chat penjual" onPress={() => void startChat()} loading={busy} />
            ) : null}
            <GhostButton label="Simpan" onPress={() => void save("save")} />
            <GhostButton label="Suka" onPress={() => void save("like")} />
            <GhostButton
              label="Laporkan penawaran ini"
              onPress={() =>
                nav.navigate("Report", { targetType: "listing", targetId: id, label: data.title })
              }
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.xl, color: colors.text },
  price: { ...type.lg, color: colors.text },
  body: { ...type.base, color: colors.text },
});
