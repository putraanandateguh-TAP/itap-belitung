// Penerjemah (S37): 9 bahasa, riwayat maks 20 di perangkat, favorit.
// API menjawab 501 sampai P3 (kunci Gemini) — layar menampilkan jujur
// "belum tersedia" dan TIDAK mengarang terjemahan. Input suara/foto belum
// tersedia di versi ini.
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, space, type } from "../../theme";
import { ApiError, endpoints } from "../../lib/api";
import {
  addTranslationHistory,
  loadTranslationHistory,
  toggleTranslationFavorite,
  type TranslationEntry,
} from "../../lib/translation-history";
import { Card, Chip, EmptyState, Field, GhostButton, Muted, Notice, PrimaryButton, Screen, SectionTitle } from "../../components/ui";

const LANGUAGES = [
  { code: "belitung", label: "Belitung" },
  { code: "id", label: "Indonesia" },
  { code: "en", label: "English" },
  { code: "ms", label: "Melayu" },
  { code: "zh", label: "Mandarin" },
  { code: "ja", label: "Jepang" },
  { code: "ko", label: "Korea" },
  { code: "nl", label: "Belanda" },
  { code: "de", label: "Jerman" },
];

export function TranslatorScreen() {
  const [from, setFrom] = useState("id");
  const [to, setTo] = useState("en");
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<TranslationEntry[]>([]);

  const reloadHistory = useCallback(() => {
    void loadTranslationHistory().then(setHistory);
  }, []);

  useEffect(reloadHistory, [reloadHistory]);

  const translate = async () => {
    if (!text.trim()) {
      setMessage("Tulis dulu teks yang mau diterjemahkan.");
      return;
    }
    setBusy(true);
    setMessage(null);
    setResult(null);
    try {
      const res = await endpoints.translate(text.trim(), from, to);
      setResult(res.translation);
      setHistory(await addTranslationHistory({ sourceText: text.trim(), result: res.translation, from, to, favorite: false }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 501) {
        setMessage(
          "Penerjemah belum tersedia — server menjawab 501. Butuh proyek Google Cloud + kunci Gemini milik Teguh (P3). Kamus lokal di server juga belum bisa dipakai sebelum itu.",
        );
      } else {
        setMessage(e instanceof Error ? e.message : "Gagal menerjemahkan.");
      }
    } finally {
      setBusy(false);
    }
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
    setResult(null);
  };

  return (
    <Screen>
      <SectionTitle>Penerjemah</SectionTitle>
      <Notice>
        Terjemahan memakai kamus lokal di server dulu, lalu Gemini bila belum ada padanan.
        Sampai P3 selesai, fitur ini belum bisa dipakai.
      </Notice>
      <View>
        <Text style={styles.label}>Dari</Text>
        <View style={styles.chips}>
          {LANGUAGES.map((l) => (
            <Chip key={l.code} label={l.label} active={from === l.code} onPress={() => setFrom(l.code)} />
          ))}
        </View>
      </View>
      <GhostButton label="Tukar bahasa" onPress={swap} />
      <View>
        <Text style={styles.label}>Ke</Text>
        <View style={styles.chips}>
          {LANGUAGES.map((l) => (
            <Chip key={l.code} label={l.label} active={to === l.code} onPress={() => setTo(l.code)} />
          ))}
        </View>
      </View>
      <Field
        label="Teks"
        value={text}
        onChangeText={setText}
        placeholder="Tulis teks di sini…"
        multiline
        numberOfLines={4}
      />
      <PrimaryButton label="Terjemahkan" onPress={() => void translate()} loading={busy} />
      <GhostButton label="Suara / Foto (belum tersedia)" onPress={() => setMessage("Input suara dan foto belum tersedia di versi ini.")} />
      {message ? <Muted>{message}</Muted> : null}
      {result ? (
        <Card>
          <SectionTitle>Hasil</SectionTitle>
          <Text style={styles.result}>{result}</Text>
        </Card>
      ) : null}
      <SectionTitle>Riwayat (perangkat, maks 20)</SectionTitle>
      {history.length === 0 ? (
        <EmptyState title="Belum ada riwayat" body="Hasil terjemahan yang berhasil akan tersimpan di perangkat ini." />
      ) : (
        history.map((h) => (
          <Pressable key={h.id} onPress={() => void toggleTranslationFavorite(h.id).then(setHistory)}>
            <Card>
              <Text style={styles.historyText}>{h.sourceText} → {h.result}</Text>
              <Muted>
                {h.from} → {h.to} · {h.favorite ? "Favorit — ketuk untuk melepas" : "Ketuk untuk menandai favorit"}
              </Muted>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { ...type.sm, color: colors.text, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.xs },
  result: { ...type.base, color: colors.text },
  historyText: { ...type.base, color: colors.text },
});
