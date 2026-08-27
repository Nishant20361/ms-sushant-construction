import { memo, useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Speech from "expo-speech";
import { theme } from "@/theme";
import type { ChatMessage } from "../types";

// Helper to expand construction units and strip markdown/emojis for sweet natural voice
function cleanTextForMobileSpeech(raw: string): string {
  return raw
    .replace(/(\d+)\s*(?:sq\.?\s*ft|sqft|sq\s*feet)/gi, "$1 स्क्वायर फीट")
    .replace(/(\d+)\s*(?:cft|cu\.?\s*ft)/gi, "$1 क्यूबिक फीट")
    .replace(/₹\s*(\d+)/g, "$1 रुपये")
    .replace(/(\d+)\s*bags?\b/gi, "$1 बोरी")
    .replace(/(\d+)\s*kg\b/gi, "$1 किलो")
    .replace(/(\d+)\s*mm\b/gi, "$1 एमएम")
    .replace(/\bRCC\b/g, "आर सी सी")
    .replace(/\bOPC\b/g, "ओ पी सी")
    .replace(/\bPPC\b/g, "पी पी सी")
    .replace(/\bM-Sand\b/gi, "एम सैंड")
    .replace(/\bP-Sand\b/gi, "पी सैंड")
    .replace(/\bDPC\b/g, "डी पी सी")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/^[\s*->•\d.]+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, "")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

export const MessageBubble = memo(function MessageBubble({
  message,
  onRetry,
}: {
  message: ChatMessage;
  onRetry(id: string, question: string): void;
}) {
  const user = message.role === "user";
  const [speaking, setSpeaking] = useState(false);

  const stopAudio = useCallback(() => {
    try {
      Speech.stop();
    } catch {
      // noop
    }
    setSpeaking(false);
  }, []);

  const playAudio = useCallback(() => {
    const cleaned = cleanTextForMobileSpeech(message.content);
    if (!cleaned) return;

    try {
      Speech.stop();
      setSpeaking(true);
      Speech.speak(cleaned, {
        language: "hi-IN",
        pitch: 1.0,
        rate: 0.92,
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    } catch {
      setSpeaking(false);
    }
  }, [message.content]);

  useEffect(() => {
    return () => {
      if (speaking) {
        Speech.stop();
      }
    };
  }, [speaking]);

  return (
    <View style={[styles.row, user ? styles.userRow : styles.assistantRow]}>
      <View
        style={[
          styles.bubble,
          user ? styles.userBubble : styles.assistantBubble,
          message.status === "failed" && styles.failed,
        ]}
      >
        {!user ? (
          <View style={styles.headerRow}>
            <Text style={styles.label}>Construction Assistant</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={speaking ? "Stop voice audio" : "Listen in natural voice"}
              onPress={speaking ? stopAudio : playAudio}
              style={[styles.audioButton, speaking && styles.audioButtonActive]}
            >
              <Text style={[styles.audioButtonText, speaking && styles.audioButtonTextActive]}>
                {speaking ? "⏹️ Stop" : "🔊 सुनें"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Text selectable={!user} style={[styles.content, user && styles.userContent]}>
          {message.content}
        </Text>

        {message.status === "failed" && message.retryQuestion ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry assistant question"
            onPress={() => onRetry(message.id, message.retryQuestion!)}
            style={styles.retry}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { width: "100%", paddingHorizontal: 14, paddingVertical: 5 },
  userRow: { alignItems: "flex-end" },
  assistantRow: { alignItems: "flex-start" },
  bubble: { maxWidth: "88%", paddingHorizontal: 14, paddingVertical: 11, borderRadius: 16 },
  userBubble: { borderBottomRightRadius: 5, backgroundColor: theme.colors.primary },
  assistantBubble: {
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  failed: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 8,
  },
  label: { fontSize: 12, fontWeight: "800", color: theme.colors.primary },
  audioButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  audioButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  audioButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  audioButtonTextActive: {
    color: "#FFFFFF",
  },
  content: { fontSize: 15, lineHeight: 22, color: theme.colors.text },
  userContent: { color: "white" },
  retry: {
    minHeight: 44,
    alignSelf: "flex-start",
    justifyContent: "center",
    marginTop: 7,
    paddingHorizontal: 4,
  },
  retryText: { fontWeight: "800", color: theme.colors.primary },
});
