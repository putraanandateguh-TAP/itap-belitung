// Masuk / Daftar (S10): email + kata sandi (Supabase Auth), Google OAuth,
// minta link reset kata sandi (F17).
import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../lib/auth";
import { endpoints } from "../../lib/api";
import { ApiError } from "../../lib/api";
import { Field, GhostButton, Muted, PrimaryButton, Screen } from "../../components/ui";
import type { AccountStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<AccountStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || password.length < 6) {
      setMessage("Isi email dan kata sandi (minimal 6 karakter).");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
      } else {
        if (!name.trim()) {
          setMessage("Isi nama tampilanmu.");
          setBusy(false);
          return;
        }
        await signUp(email.trim(), password, name.trim());
        setMessage("Akun dibuat. Periksa emailmu untuk kode verifikasi.");
      }
      navigation.navigate("Verify");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal masuk.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setMessage(
        e instanceof Error
          ? `Masuk dengan Google gagal: ${e.message}. Pastikan Google OAuth sudah dikonfigurasi di Supabase (P1/P3).`
          : "Masuk dengan Google gagal.",
      );
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!email.trim()) {
      setMessage("Isi email dulu untuk meminta link reset kata sandi.");
      return;
    }
    try {
      await endpoints.requestPasswordReset(email.trim());
      setMessage("Link reset dikirim bila email terdaftar. Token berlaku 60 menit.");
    } catch (e) {
      if (e instanceof ApiError && e.status === 503) {
        setMessage("Reset kata sandi belum tersedia — email transaksional (Resend, P5) belum dikonfigurasi.");
      } else {
        setMessage(e instanceof Error ? e.message : "Gagal meminta reset.");
      }
    }
  };

  return (
    <Screen>
      {mode === "signup" ? (
        <Field label="Nama tampilan" value={name} onChangeText={setName} placeholder="Nama kamu" autoCapitalize="words" />
      ) : null}
      <Field label="Email" value={email} onChangeText={setEmail} placeholder="email@contoh.id" keyboardType="email-address" autoCapitalize="none" />
      <Field label="Kata sandi" value={password} onChangeText={setPassword} placeholder="Minimal 6 karakter" secureTextEntry />
      {message ? <Muted>{message}</Muted> : null}
      <PrimaryButton label={mode === "login" ? "Masuk" : "Buat akun"} onPress={() => void submit()} loading={busy} />
      <GhostButton label="Masuk dengan Google" onPress={() => void google()} />
      <GhostButton label={mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"} onPress={() => setMode(mode === "login" ? "signup" : "login")} />
      <GhostButton label="Lupa kata sandi?" onPress={() => void reset()} />
    </Screen>
  );
}
