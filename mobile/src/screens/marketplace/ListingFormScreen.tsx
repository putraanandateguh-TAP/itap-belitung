// Form pasang/edit penawaran (S13): judul, deskripsi, harga, lokasi.
// Foto: BELUM bisa diunggah dari aplikasi (kompresi + buang EXIF client
// belum ditulis — backend.md). Form menyimpan teks dulu; foto menyusul.
// Butuh login terverifikasi + aturan marketplace disetujui (F04/F05).
import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { NavigationProp } from "@react-navigation/native";
import { endpoints } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { EmptyState, Field, Muted, Notice, PrimaryButton, Screen } from "../../components/ui";
import type { MarketStackParamList, RootTabParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<MarketStackParamList, "ListingForm">;

export function ListingFormScreen({ navigation, route }: Props) {
  const { session, profile } = useAuth();
  const tabNav = navigation.getParent<NavigationProp<RootTabParamList>>();
  const editingId = route.params?.id;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!session) {
    return (
      <Screen>
        <EmptyState
          title="Masuk dulu untuk memasang penawaran"
          body="Pasang penawaran butuh akun yang sudah login, terverifikasi (email + WhatsApp), dan menyetujui aturan marketplace."
        />
        <PrimaryButton label="Masuk / Daftar" onPress={() => tabNav?.navigate("AccountTab", { screen: "Login" })} />
      </Screen>
    );
  }

  const verified = profile?.verified ?? false;
  const rulesAccepted = Boolean(profile?.marketplace_rules_accepted_at);

  const submit = async () => {
    const priceRupiah = Number(price.replace(/[^0-9]/g, ""));
    if (!title.trim() || !priceRupiah) {
      setMessage("Judul dan harga (rupiah, angka saja) wajib diisi.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (editingId) {
        await endpoints.updateListing(editingId, {
          title: title.trim(),
          description: description.trim(),
          price_cents: priceRupiah * 100,
          location_name: location.trim(),
        });
        setMessage("Penawaran diperbarui.");
      } else {
        const created = await endpoints.createListing({
          title: title.trim(),
          description: description.trim(),
          price_cents: priceRupiah * 100,
          location_name: location.trim() || undefined,
        });
        navigation.navigate("ListingDetail", { id: created.id });
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal menyimpan penawaran.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Notice>
        Foto belum bisa diunggah dari aplikasi — kompresi dan buang metadata EXIF di client belum
        ditulis (batas server 1 MB sudah ada). Penawaran tanpa foto tetap bisa dipasang; foto
        menyusul.
      </Notice>
      {!verified ? (
        <Muted>
          Akunmu belum terverifikasi (email + WhatsApp). Verifikasi dulu di tab Akun — server akan
          menolak penawaran sampai verifikasi lengkap.
        </Muted>
      ) : null}
      {!rulesAccepted ? (
        <Muted>
          Kamu belum menyetujui aturan marketplace. Buka tab Akun → Aturan Marketplace sebelum
          memasang.
        </Muted>
      ) : null}
      <Field label="Judul" value={title} onChangeText={setTitle} placeholder="Mis. Sepeda lipat bekas, kondisi baik" />
      <Field
        label="Deskripsi"
        value={description}
        onChangeText={setDescription}
        placeholder="Kondisi, kelengkapan, alasan dijual…"
        multiline
        numberOfLines={4}
      />
      <Field label="Harga (Rp)" value={price} onChangeText={setPrice} placeholder="Mis. 1500000" keyboardType="numeric" />
      <Field label="Lokasi (nama wilayah)" value={location} onChangeText={setLocation} placeholder="Mis. Tanjung Pandan" />
      <Muted>Lokasi bersifat opsional dan ditulis manual — koordinat GPS tidak disimpan.</Muted>
      {message ? <Muted>{message}</Muted> : null}
      <PrimaryButton label={editingId ? "Simpan perubahan" : "Terbitkan penawaran"} onPress={() => void submit()} loading={busy} />
    </Screen>
  );
}
