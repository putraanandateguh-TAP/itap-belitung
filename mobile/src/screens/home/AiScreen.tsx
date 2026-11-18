// AI iTAP (S41): asisten chat berbasis konten iTAP terkurasi + info harian.
// API menjawab 501 sampai P3 (kunci Gemini) — layar menampilkan jujur
// "belum tersedia" dan TIDAK mengarang jawaban. Rencana perjalanan tersimpan
// juga menunggu P3.
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, space, type } from "../../theme";
import { ApiError, endpoints } from "../../lib/api";
import { errorMessage, useApi } from "../../lib/hooks";
import { Card, EmptyState, ErrorState, Field, LoadingState, Muted, Notice, PrimaryButton, Screen, SectionTitle } from "../../components/ui";

interface AiMessage {
  role: "user" | "assistant";
  text: string;
}

export function AiScreen() {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const itineraries = useApi(() => endpoints.aiItineraries());

  const ask = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const res = await endpoints.aiChat(text);
      setMessages((m) => [...m, { role: "assistant", text: res.answer }]);
    } catch (e) {
      if (e instanceof ApiError && e.status === 501) {
        setError(
          "AI iTAP belum tersedia — server menjawab 501. Butuh proyek Google Cloud + kunci Gemini milik Teguh (P3).",
        );
      } else {
        setError(e instanceof Error ? e.message : "Gagal bertanya.");
      }
      setMessages((m) => m.slice(0, -1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <SectionTitle>AI iTAP</SectionTitle>
      <Notice>
        Jawaban AI hanya dari konten iTAP yang dikurasi dan info harian, disertai sumber. AI bisa
        keliru — periksa ulang sebelum dipakai. Tanpa sumber kurasi, AI menjawab "tidak tahu"
        daripada mengarang.
      </Notice>
      {messages.length === 0 ? (
        <EmptyState
          title="Tanya apa saja tentang Belitung"
          body="Contoh: pantai yang cocok untuk keluarga, atau rencana perjalanan 2 hari."
        />
      ) : (
        messages.map((m, i) => (
          <View key={i} style={[styles.bubble, m.role === "user" ? styles.user : styles.assistant]}>
            <Text style={styles.bubbleText}>{m.text}</Text>
          </View>
        ))
      )}
      {error ? <Muted>{error}</Muted> : null}
      <Field label="Pertanyaanmu" value={input} onChangeText={setInput} placeholder="Tulis pertanyaan…" />
      <PrimaryButton label={busy ? "Menunggu jawaban…" : "Tanya AI iTAP"} onPress={() => void ask()} loading={busy} />
      <SectionTitle>Rencana perjalanan tersimpan</SectionTitle>
      {itineraries.loading ? (
        <LoadingState />
      ) : itineraries.error ? (
        <ErrorState message={errorMessage(itineraries.error)} onRetry={itineraries.refresh} />
      ) : !itineraries.data || itineraries.data.length === 0 ? (
        <Muted>Belum ada rencana tersimpan. Rencana dibuat dari jawaban AI setelah P3.</Muted>
      ) : (
        itineraries.data.map((it) => (
          <Card key={it.id}>
            <Muted>Rencana · {it.created_at}</Muted>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bubble: { borderRadius: 12, padding: space.md },
  user: { alignSelf: "flex-end", backgroundColor: colors.surfaceAlt, maxWidth: "85%" },
  assistant: { alignSelf: "flex-start", backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, maxWidth: "85%" },
  bubbleText: { ...type.base, color: colors.text },
});
