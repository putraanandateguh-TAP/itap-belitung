// Verifikasi akun (S11): kode OTP email (Supabase Auth) + OTP WhatsApp
// (Meta, P2 — menjawab 503 sampai template disetujui).
import { useState } from "react";
import { ApiError } from "../../lib/api";
import { endpoints } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { assertSupabase, supabase } from "../../lib/supabase";
import { Card, Field, GhostButton, Muted, Notice, PrimaryButton, Screen, SectionTitle } from "../../components/ui";

export function VerifyScreen() {
  const { profile, refreshProfile } = useAuth();
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [waCode, setWaCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sendEmailCode = async () => {
    if (!email.trim()) {
      setMessage("Isi email dulu.");
      return;
    }
    setBusy(true);
    try {
      await endpoints.sendEmailOtp(email.trim());
      setMessage("Kode verifikasi dikirim ke emailmu. Periksa juga folder spam.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal mengirim kode.");
    } finally {
      setBusy(false);
    }
  };

  const verifyEmailCode = async () => {
    if (!email.trim() || !emailCode.trim()) {
      setMessage("Isi email dan kode.");
      return;
    }
    setBusy(true);
    try {
      assertSupabase();
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: emailCode.trim(), type: "email" });
      if (error) throw new Error(error.message);
      await refreshProfile();
      setMessage("Email terverifikasi.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Kode salah atau kedaluwarsa.");
    } finally {
      setBusy(false);
    }
  };

  const sendWaCode = async () => {
    setBusy(true);
    try {
      await endpoints.sendWhatsappOtp();
      setMessage("Kode OTP WhatsApp dikirim.");
    } catch (e) {
      if (e instanceof ApiError && e.status === 503) {
        setMessage(
          "Verifikasi WhatsApp belum tersedia — butuh akun Meta WhatsApp Business + template OTP yang disetujui (P2). Sementara ini verifikasi email saja sudah cukup untuk membaca; jual beli menunggu P2.",
        );
      } else {
        setMessage(e instanceof Error ? e.message : "Gagal mengirim OTP.");
      }
    } finally {
      setBusy(false);
    }
  };

  const verifyWaCode = async () => {
    if (!waCode.trim()) {
      setMessage("Isi kode OTP WhatsApp.");
      return;
    }
    setBusy(true);
    try {
      await endpoints.verifyWhatsappOtp(waCode.trim());
      await refreshProfile();
      setMessage("Nomor WhatsApp terverifikasi.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Kode salah atau kedaluwarsa.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Card>
        <SectionTitle>Status verifikasi</SectionTitle>
        <Muted>Email: {profile?.email_verified ? "terverifikasi" : "belum terverifikasi"}</Muted>
        <Muted>WhatsApp: {profile?.whatsapp_verified ? "terverifikasi" : "belum terverifikasi"}</Muted>
        <Muted>
          Verifikasi dibutuhkan sebelum aktivitas jual beli. Registrasi tetap bisa tanpa izin
          lokasi.
        </Muted>
      </Card>
      <SectionTitle>Verifikasi email</SectionTitle>
      <Field label="Email" value={email} onChangeText={setEmail} placeholder="email@contoh.id" keyboardType="email-address" autoCapitalize="none" />
      <GhostButton label="Kirim kode ke email" onPress={() => void sendEmailCode()} />
      <Field label="Kode dari email" value={emailCode} onChangeText={setEmailCode} placeholder="6 digit" keyboardType="number-pad" />
      <PrimaryButton label="Verifikasi email" onPress={() => void verifyEmailCode()} loading={busy} />
      <SectionTitle>Verifikasi WhatsApp</SectionTitle>
      <Notice>
        OTP WhatsApp dikirim lewat Meta. Sampai P2 selesai, tombol di bawah menampilkan pesan
        503 yang jujur.
      </Notice>
      <GhostButton label="Kirim OTP WhatsApp" onPress={() => void sendWaCode()} />
      <Field label="Kode OTP WhatsApp" value={waCode} onChangeText={setWaCode} placeholder="6 digit" keyboardType="number-pad" />
      <PrimaryButton label="Verifikasi WhatsApp" onPress={() => void verifyWaCode()} loading={busy} />
      {message ? <Muted>{message}</Muted> : null}
    </Screen>
  );
}
