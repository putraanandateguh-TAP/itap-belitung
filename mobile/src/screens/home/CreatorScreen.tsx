// Kreator (S36): pintasan masuk kontributor — dashboard status kiriman,
// statistik baca, poin (GET /api/me/contributor). Bila belum login atau
// belum kontributor, jelaskan alurnya dengan jujur.
import { useAuth } from "../../lib/auth";
import { endpoints } from "../../lib/api";
import { errorMessage, useApi } from "../../lib/hooks";
import { Card, EmptyState, ErrorState, GhostButton, LoadingState, Muted, PrimaryButton, Screen, SectionTitle } from "../../components/ui";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { NavigationProp } from "@react-navigation/native";
import type { HomeStackParamList, RootTabParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<HomeStackParamList, "Creator">;

export function CreatorScreen({ navigation }: Props) {
  const { session, profile } = useAuth();
  const { data, loading, error, refresh } = useApi(() => endpoints.contributor(), [session?.user.id]);
  const isContributor = profile?.role === "contributor" || profile?.role === "admin_portal" || profile?.role === "superadmin";
  const tabNav = navigation.getParent<NavigationProp<RootTabParamList>>();
  const openAccount = () => tabNav?.navigate("AccountTab", { screen: "Account" });

  if (!session) {
    return (
      <Screen>
        <EmptyState
          title="Masuk dulu untuk menjadi Kreator"
          body="Kreator menulis cerita untuk portal iTAP. Kiriman ditinjau redaksi sebelum terbit, dan setiap karya yang disetujui mendapat 1 poin."
        />
        <PrimaryButton label="Masuk / Daftar" onPress={openAccount} />
      </Screen>
    );
  }
  if (!isContributor) {
    return (
      <Screen>
        <EmptyState
          title="Akunmu belum terdaftar sebagai Kreator"
          body="Pendaftaran kreator dikelola redaksi iTAP. Hubungi pengelola portal bila kamu ingin menulis cerita Belitung."
        />
        <GhostButton label="Lihat pengaturanku" onPress={openAccount} />
      </Screen>
    );
  }
  return (
    <Screen>
      <SectionTitle>Dashboard Kreator</SectionTitle>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={refresh} />
      ) : !data ? (
        <EmptyState title="Dashboard belum tersedia" body="Coba lagi nanti." />
      ) : (
        <>
          <Card>
            <Muted>Total dibaca: {data.total_views} kali</Muted>
            <Muted>
              Disetujui: {data.approved_count} · Menunggu: {data.pending_count} · Draft:{" "}
              {data.draft_count} · Poin: {data.points_total}
            </Muted>
          </Card>
          {data.submissions.length === 0 ? (
            <EmptyState title="Belum ada kiriman" body="Tulis cerita pertamamu lewat editor kontributor di web." />
          ) : (
            data.submissions.map((s) => (
              <Card key={s.id}>
                <Muted>{s.title_id}</Muted>
                <Muted>
                  {s.status} · {s.views} dibaca
                </Muted>
              </Card>
            ))
          )}
          <Muted>
            Editor tulis lengkap (tab ID/EN, galeri, lokasi, preview) tersedia di versi web. Di
            aplikasi, layar ini menampilkan status kirimanmu.
          </Muted>
        </>
      )}
    </Screen>
  );
}
