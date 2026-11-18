// Registrasi token push — STUB sampai proyek Firebase sendiri ada (P4).
// Tanpa Firebase + expo-notifications, aplikasi tidak punya token FCM, jadi
// fungsi ini tidak pernah dipanggil dengan token nyata. Jangan klaim push
// jalan sebelum P4 selesai. Bila token tersedia nanti, panggil fungsi ini
// sekali setelah login; server menyimpan (user, fcm_token) di tabel devices.
import { endpoints } from "./api";

export async function registerDeviceToken(fcmToken: string): Promise<void> {
  await endpoints.postDevice(fcmToken);
}
