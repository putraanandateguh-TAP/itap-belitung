// Form pasang/edit penawaran (S13): judul, deskripsi, harga, lokasi.
// Foto: dipilih maks 5, dikompresi di client + EXIF dibuang (photo-compress.ts,
// target ≤1 MB, JPEG), diunggah ke bucket `listing-photos` setelah listing
// dibuat, lalu dicatat lewat POST /api/listings/:id/photos — cerminan web.
// Tanpa Supabase (P1) foto tidak bisa diunggah — penawaran tetap terbit
// tanpa foto, dengan catatan jujur. Butuh login terverifikasi + aturan
// marketplace disetujui (F04/F05).
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Image, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { NavigationProp } from "@react-navigation/native";
import { endpoints } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import {
  PHOTO_LIMITS,
  compressListingPhoto,
  formatBytes,
  type CompressedPhoto,
} from "../../lib/photo-compress";
import { uploadListingPhotos } from "../../lib/photo-upload";
import { EmptyState, Field, GhostButton, Muted, Notice, PrimaryButton, Screen } from "../../components/ui";
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
  const [photos, setPhotos] = useState<CompressedPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
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

  const pickPhotos = async () => {
    const remaining = PHOTO_LIMITS.maxPhotosPerListing - photos.length;
    if (remaining <= 0) {
      setPhotoError(`Maksimal ${PHOTO_LIMITS.maxPhotosPerListing} foto per penawaran.`);
      return;
    }
    setPhotoError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });
    if (result.canceled) return;
    if (result.assets.length > remaining) {
      setPhotoError(`Maksimal ${PHOTO_LIMITS.maxPhotosPerListing} foto per penawaran.`);
    }
    for (const asset of result.assets.slice(0, remaining)) {
      try {
        const compressed = await compressListingPhoto(asset);
        setPhotos((prev) => [...prev, compressed]);
      } catch (e) {
        setPhotoError(e instanceof Error ? e.message : "Foto gagal diproses.");
      }
    }
  };

  const submit = async () => {
    const priceRupiah = Number(price.replace(/[^0-9]/g, ""));
    if (!title.trim() || !priceRupiah) {
      setMessage("Judul dan harga (rupiah, angka saja) wajib diisi.");
      return;
    }
    setBusy(true);
    setMessage(null);
    setPhotoNote(null);
    try {
      let listingId = editingId;
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
        listingId = created.id;
      }
      if (listingId && photos.length > 0) {
        try {
          await uploadListingPhotos(listingId, session.user.id, photos);
        } catch (e) {
          // Penawaran sudah terbit; foto menyusul — sama seperti web.
          setPhotoNote(
            `Penawaran terbit, tetapi foto gagal diunggah: ${e instanceof Error ? e.message : "kesalahan upload"}.`,
          );
        }
      }
      if (listingId) navigation.navigate("ListingDetail", { id: listingId });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal menyimpan penawaran.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
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
      <Notice>
        Foto dikompresi di perangkatmu (target ≤1 MB, JPEG) dan metadata lokasi (EXIF) dibuang
        sebelum diunggah. Maks {PHOTO_LIMITS.maxPhotosPerListing} foto.
      </Notice>
      <GhostButton label="Tambah foto" onPress={() => void pickPhotos()} />
      {photoError ? <Muted>{photoError}</Muted> : null}
      {photos.length > 0 ? (
        <View style={styles.photos}>
          {photos.map((p, i) => (
            <View key={p.uri} style={styles.photo}>
              <Image source={{ uri: p.uri }} style={styles.thumb} accessibilityLabel={`Pratinjau foto ${i + 1}`} />
              <Muted>
                {formatBytes(p.originalBytes)} → {formatBytes(p.compressedBytes)}
              </Muted>
              <GhostButton
                label={`Hapus foto ${i + 1}`}
                onPress={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
              />
            </View>
          ))}
        </View>
      ) : null}
      {photoNote ? <Muted>{photoNote}</Muted> : null}
      {message ? <Muted>{message}</Muted> : null}
      <PrimaryButton label={editingId ? "Simpan perubahan" : "Terbitkan penawaran"} onPress={() => void submit()} loading={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  photos: { gap: 12 },
  photo: { gap: 4 },
  thumb: { borderRadius: 8, height: 180, width: "100%" },
});
