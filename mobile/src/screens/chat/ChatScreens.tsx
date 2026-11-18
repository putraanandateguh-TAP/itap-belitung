// Chat — inbox (S15) + ruang chat (S16): kartu barang di atas chat, bubble
// pesan, Realtime Supabase bila tersedia, fallback polling 20 detik.
// Pesan yang gagal terkirim ditandai dan bisa dikirim ulang (outbox sederhana).
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, radius, space, type } from "../../theme";
import { endpoints } from "../../lib/api";
import { errorMessage, useApi } from "../../lib/hooks";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { formatTimeWIB } from "../../lib/format";
import { Card, EmptyState, ErrorState, Field, GhostButton, LoadingState, Muted, PrimaryButton, Screen, SectionTitle } from "../../components/ui";
import type { ChatMessage } from "../../types";
import type { ChatStackParamList, MarketStackParamList } from "../../navigation/types";
import { asSharedNavigation } from "../../navigation/types";

type ListProps = NativeStackScreenProps<ChatStackParamList, "ChatList">;
type RoomProps =
  | NativeStackScreenProps<ChatStackParamList, "ChatRoom">
  | NativeStackScreenProps<MarketStackParamList, "ChatRoom">;

export function ChatListScreen({ navigation }: ListProps) {
  const { session } = useAuth();
  const { data, loading, error, refresh } = useApi(() => endpoints.myThreads(), [session?.user.id]);
  if (!session) {
    return (
      <Screen>
        <EmptyState title="Masuk dulu untuk melihat chat" body="Percakapan jual beli hanya tampil setelah kamu masuk." />
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
          title="Belum ada percakapan"
          body="Chat dengan penjual dari halaman penawaran akan tampil di sini."
        />
      ) : (
        data.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => navigation.navigate("ChatRoom", { threadId: t.id, listingId: t.listing_id })}
            style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Card>
              <Text style={styles.threadTitle}>Percakapan · {t.last_message_at ? formatTimeWIB(t.last_message_at) : "baru"}</Text>
              <Muted>{t.last_message_text ?? "Belum ada pesan."}</Muted>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

export function ChatRoomScreen({ route, navigation }: RoomProps) {
  const { threadId, listingTitle, listingId } = route.params;
  const nav = asSharedNavigation(navigation);
  const { session, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [failed, setFailed] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    try {
      const list = await endpoints.threadMessages(threadId);
      setMessages(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat pesan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // Realtime bila Supabase tersedia; bila channel gagal, polling 20 detik tetap jalan.
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      if (supabase) {
        channel = supabase
          .channel(`messages-thread-${threadId}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` },
            (payload) => {
              const row = payload.new as ChatMessage;
              setMessages((m) => (m.some((x) => x.id === row.id) ? m : [...m, row]));
            },
          )
          .subscribe();
      }
    } catch {
      channel = null;
    }
    pollRef.current = setInterval(() => void load(), 20000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (channel) void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const send = async (retryText?: string) => {
    const body = (retryText ?? text).trim();
    if (!body) return;
    setFailed(null);
    setText("");
    try {
      const sent = await endpoints.sendMessage(threadId, body);
      setMessages((m) => [...m, sent]);
    } catch (e) {
      setFailed(body);
      setError(e instanceof Error ? e.message : "Gagal mengirim pesan.");
    }
  };

  if (!session) {
    return (
      <Screen>
        <EmptyState title="Masuk dulu untuk chat" body="Ruang chat hanya untuk peserta percakapan yang sudah login." />
      </Screen>
    );
  }
  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        {listingTitle ? (
          <Card>
            <SectionTitle>{listingTitle}</SectionTitle>
            {listingId ? (
              <GhostButton
                label="Lihat penawaran"
                onPress={() => nav.navigate("ListingDetail", { id: listingId })}
              />
            ) : null}
            <Muted>Nomor penjual tersamar — kesepakatan diatur langsung lewat chat ini.</Muted>
          </Card>
        ) : null}
        {loading ? (
          <LoadingState />
        ) : error && messages.length === 0 ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : messages.length === 0 ? (
          <EmptyState title="Belum ada pesan" body="Sapa dulu penjual/pembeli — negosiasi dimulai di sini." />
        ) : (
          <View style={styles.list}>
            {messages.map((m) => {
              const mine = profile?.id === m.sender_id;
              return (
                <View key={m.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  <Text style={styles.bubbleText}>{m.text}</Text>
                  <Muted>{formatTimeWIB(m.created_at)}</Muted>
                </View>
              );
            })}
          </View>
        )}
        {failed ? (
          <View style={styles.failedRow}>
            <Muted>Pesan gagal terkirim: “{failed}”</Muted>
            <GhostButton label="Kirim ulang" onPress={() => void send(failed)} />
          </View>
        ) : null}
        <View style={styles.composer}>
          <Field label="Pesan" value={text} onChangeText={setText} placeholder="Tulis pesan…" />
          <PrimaryButton label="Kirim" onPress={() => void send()} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pressable: { borderRadius: radius.lg },
  pressed: { opacity: 0.85 },
  threadTitle: { ...type.base, color: colors.text, fontWeight: "600" },
  container: { flex: 1, gap: space.md, padding: space.lg },
  list: { flex: 1, gap: space.sm },
  bubble: { borderRadius: radius.md, maxWidth: "85%", padding: space.md },
  mine: { alignSelf: "flex-end", backgroundColor: colors.surfaceAlt },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  bubbleText: { ...type.base, color: colors.text },
  failedRow: { gap: space.sm },
  composer: { gap: space.sm },
});
