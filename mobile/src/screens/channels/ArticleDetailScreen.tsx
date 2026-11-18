// Detail artikel aplikasi (S42): baca artikel + bagikan via share sheet
// perangkat + rekomendasi + komentar (moderasi).
import { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CHANNEL_LABELS, colors, space, type } from "../../theme";
import { endpoints } from "../../lib/api";
import { errorMessage, useApi } from "../../lib/hooks";
import { useAuth } from "../../lib/auth";
import { formatDateWIB } from "../../lib/format";
import { ArticleCard } from "../../components/ArticleCard";
import { Card, EmptyState, ErrorState, Field, GhostButton, LoadingState, Muted, PrimaryButton, Screen } from "../../components/ui";
import type { ChannelStackParamList, HomeStackParamList } from "../../navigation/types";
import { asSharedNavigation } from "../../navigation/types";

type Props =
  | NativeStackScreenProps<ChannelStackParamList, "ArticleDetail">
  | NativeStackScreenProps<HomeStackParamList, "ArticleDetail">;

export function ArticleDetailScreen({ route, navigation }: Props) {
  const { slug } = route.params;
  const nav = asSharedNavigation(navigation);
  const { session } = useAuth();
  const article = useApi(() => endpoints.article(slug), [slug]);
  const related = useApi(() => endpoints.articleRelated(slug), [slug]);
  const comments = useApi(() => endpoints.articleComments(slug), [slug]);
  const [comment, setComment] = useState("");
  const [commentSent, setCommentSent] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const share = async () => {
    if (!article.data) return;
    try {
      await Share.share({
        title: article.data.title_id,
        message: `${article.data.title_id} — iTAP Belitung`,
      });
    } catch {
      // Pengguna membatalkan share sheet — bukan error.
    }
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    setCommentError(null);
    try {
      await endpoints.postComment(slug, comment.trim());
      setComment("");
      setCommentSent(true);
      comments.refresh();
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : "Gagal mengirim tanggapan.");
    }
  };

  return (
    <Screen>
      {article.loading ? (
        <LoadingState />
      ) : article.error ? (
        <ErrorState message={errorMessage(article.error)} onRetry={article.refresh} />
      ) : !article.data ? (
        <EmptyState title="Artikel tidak ditemukan" body="Tautan mungkin sudah berubah." />
      ) : (
        <>
          <Muted>{CHANNEL_LABELS[article.data.channel] ?? article.data.channel}</Muted>
          <Text style={styles.title}>{article.data.title_id}</Text>
          <Muted>
            {formatDateWIB(article.data.published_at)} · {article.data.views} kali dibaca
            {article.data.location_name ? ` · ${article.data.location_name}` : ""}
          </Muted>
          {article.data.body_id.map((p, i) => (
            <Text key={i} style={styles.body}>
              {p}
            </Text>
          ))}
          {article.data.source ? (
            <Muted>Sumber: {article.data.source}</Muted>
          ) : null}
          <GhostButton label="Bagikan" onPress={() => void share()} />
          <Text style={styles.heading}>Rekomendasi</Text>
          {related.loading ? (
            <LoadingState label="Memuat rekomendasi…" />
          ) : !related.data || related.data.length === 0 ? (
            <Muted>Belum ada rekomendasi.</Muted>
          ) : (
            related.data.map((a) => (
              <ArticleCard
                key={a.id}
                article={a}
                onPress={() => nav.navigate("ArticleDetail", { slug: a.slug })}
              />
            ))
          )}
          <Text style={styles.heading}>Tanggapan</Text>
          {comments.loading ? (
            <LoadingState label="Memuat tanggapan…" />
          ) : !comments.data || comments.data.length === 0 ? (
            <Muted>Belum ada tanggapan yang disetujui.</Muted>
          ) : (
            comments.data.map((c) => (
              <Card key={c.id}>
                <Muted>{c.author_name}</Muted>
                <Text style={styles.body}>{c.text}</Text>
              </Card>
            ))
          )}
          {session ? (
            <View style={{ gap: space.sm }}>
              <Field label="Tulis tanggapan" value={comment} onChangeText={setComment} placeholder="Tanggapanmu…" multiline />
              <PrimaryButton label="Kirim tanggapan" onPress={() => void sendComment()} />
              {commentSent ? <Muted>Tanggapan terkirim — menunggu moderasi redaksi.</Muted> : null}
              {commentError ? <Muted>{commentError}</Muted> : null}
            </View>
          ) : (
            <Muted>Masuk dulu untuk menulis tanggapan.</Muted>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.xl, color: colors.text },
  body: { ...type.base, color: colors.text },
  heading: { ...type.lg, color: colors.text },
});
