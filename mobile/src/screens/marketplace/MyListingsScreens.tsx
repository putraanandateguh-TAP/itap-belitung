// Penawaranku (S14): kelola listing sendiri + konfirmasi ketersediaan +
// tandai terjual + hapus. Tersimpan/Disukai (S17): kumpulan bookmark.
import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { endpoints } from "../../lib/api";
import { errorMessage, useApi } from "../../lib/hooks";
import { useAuth } from "../../lib/auth";
import { ListingCard } from "../../components/ListingCard";
import { EmptyState, ErrorState, GhostButton, LoadingState, Muted, PrimaryButton, Screen } from "../../components/ui";
import type { AccountStackParamList, MarketStackParamList } from "../../navigation/types";
import { asSharedNavigation } from "../../navigation/types";

type MyProps =
  | NativeStackScreenProps<MarketStackParamList, "MyListings">
  | NativeStackScreenProps<AccountStackParamList, "MyListings">;
type SavedProps =
  | NativeStackScreenProps<MarketStackParamList, "Saved">
  | NativeStackScreenProps<AccountStackParamList, "Saved">;

export function MyListingsScreen({ navigation }: MyProps) {
  const { session } = useAuth();
  const nav = asSharedNavigation(navigation);
  const { data, loading, error, refresh } = useApi(() => endpoints.myListings(), [session?.user.id]);
  const [message, setMessage] = useState<string | null>(null);

  const act = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      setMessage(ok);
      refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal.");
    }
  };

  if (!session) {
    return (
      <Screen>
        <EmptyState title="Masuk dulu" body="Penawaranku hanya tampil setelah kamu masuk." />
      </Screen>
    );
  }
  return (
    <Screen>
      {message ? <Muted>{message}</Muted> : null}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={refresh} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Belum ada penawaran"
          body="Penawaran yang kamu pasang akan tampil di sini, lengkap dengan badge statusnya."
        />
      ) : (
        data.map((l) => (
          <ListingCard
            key={l.id}
            listing={l}
            onPress={() => nav.navigate("ListingDetail", { id: l.id })}
          />
        ))
      )}
      {data && data.length > 0 ? (
        <>
          <PrimaryButton
            label="Konfirmasi semua masih dijual"
            onPress={() =>
              void Promise.all(data.filter((l) => l.status === "aktif").map((l) => endpoints.confirmListing(l.id))).then(() => {
                setMessage("Ketersediaan dikonfirmasi.");
                refresh();
              }).catch((e: unknown) => setMessage(e instanceof Error ? e.message : "Gagal konfirmasi."))
            }
          />
          <GhostButton
            label="Pasang penawaran baru"
            onPress={() => nav.navigate("ListingForm", {})}
          />
          <Muted>
            Tandai terjual / hapus per penawaran tersedia di halaman detail penawaranmu (tombol
            di layar ini menyusul — gunakan web bila mendesak).
          </Muted>
        </>
      ) : null}
    </Screen>
  );
}

export function SavedScreen({ navigation }: SavedProps) {
  const { session } = useAuth();
  const nav = asSharedNavigation(navigation);
  const { data, loading, error, refresh } = useApi(() => endpoints.mySaved(), [session?.user.id]);
  if (!session) {
    return (
      <Screen>
        <EmptyState title="Masuk dulu" body="Penawaran tersimpan hanya tampil setelah kamu masuk." />
      </Screen>
    );
  }
  return (
    <Screen>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={refresh} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Belum ada yang disimpan"
          body="Ketuk Simpan atau Suka di halaman penawaran untuk mengumpulkannya di sini."
        />
      ) : (
        data.map((l) => (
          <ListingCard key={l.id} listing={l} onPress={() => nav.navigate("ListingDetail", { id: l.id })} />
        ))
      )}
    </Screen>
  );
}
