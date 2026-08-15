import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";
import type { ChatMessage } from "../types";

export const MessageBubble = memo(function MessageBubble({ message, onRetry }: { message: ChatMessage; onRetry(id: string, question: string): void }) {
  const user = message.role === "user";
  return <View style={[styles.row, user ? styles.userRow : styles.assistantRow]}><View style={[styles.bubble, user ? styles.userBubble : styles.assistantBubble, message.status === "failed" && styles.failed]}>{!user ? <Text style={styles.label}>Construction Assistant</Text> : null}<Text selectable={!user} style={[styles.content, user && styles.userContent]}>{message.content}</Text>{message.status === "failed" && message.retryQuestion ? <Pressable accessibilityRole="button" accessibilityLabel="Retry assistant question" onPress={() => onRetry(message.id, message.retryQuestion!)} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable> : null}</View></View>;
});
const styles = StyleSheet.create({ row: { width: "100%", paddingHorizontal: 14, paddingVertical: 5 }, userRow: { alignItems: "flex-end" }, assistantRow: { alignItems: "flex-start" }, bubble: { maxWidth: "88%", paddingHorizontal: 14, paddingVertical: 11, borderRadius: 16 }, userBubble: { borderBottomRightRadius: 5, backgroundColor: theme.colors.primary }, assistantBubble: { borderBottomLeftRadius: 5, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }, failed: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" }, label: { marginBottom: 5, fontSize: 12, fontWeight: "800", color: theme.colors.primary }, content: { fontSize: 15, lineHeight: 22, color: theme.colors.text }, userContent: { color: "white" }, retry: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center", marginTop: 7, paddingHorizontal: 4 }, retryText: { fontWeight: "800", color: theme.colors.primary } });
