// Layar info harian generik: cuaca (S28), salat (S29), transport (S30),
// BBM (S33), gempa (S38). Data dari cache daily_info_snapshots (cron);
// tanpa cache → 503 yang jujur, bukan data palsu.
import { endpoints } from "../../lib/api";
import { errorMessage, useApi } from "../../lib/hooks";
import { EmptyState, ErrorState, LoadingState, Screen } from "../../components/ui";
import { SnapshotView } from "../../components/SnapshotView";

function DailyScreen({ source, emptyTitle }: { source: "weather" | "prayer" | "fuel" | "transport" | "earthquake"; emptyTitle: string }) {
  const { data, loading, error, refresh } = useApi(() => endpoints.daily(source));
  return (
    <Screen>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={refresh} />
      ) : !data ? (
        <EmptyState title={emptyTitle} body="Coba lagi nanti." />
      ) : (
        <SnapshotView snapshot={data} />
      )}
    </Screen>
  );
}

export function WeatherScreen() {
  return <DailyScreen source="weather" emptyTitle="Data cuaca belum tersedia" />;
}

export function PrayerScreen() {
  return <DailyScreen source="prayer" emptyTitle="Jadwal salat belum tersedia" />;
}

export function TransportScreen() {
  return <DailyScreen source="transport" emptyTitle="Jadwal pesawat & kapal belum tersedia" />;
}

export function FuelScreen() {
  return <DailyScreen source="fuel" emptyTitle="Harga BBM belum tersedia" />;
}

export function EarthquakeScreen() {
  return <DailyScreen source="earthquake" emptyTitle="Info gempa belum tersedia" />;
}
