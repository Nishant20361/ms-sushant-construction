import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { AssistantComposer } from "./components/AssistantComposer";
import { AssistantWelcome } from "./components/AssistantWelcome";
import { MessageBubble } from "./components/MessageBubble";
import { TypingIndicator } from "./components/TypingIndicator";
import { useAssistantChat } from "./hooks/useAssistantChat";
import type { ChatMessage } from "./types";
import { theme } from "@/theme";

export default function AssistantScreen() {
  const chat = useAssistantChat();
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const listeningRef = useRef(false);
  const list = useRef<FlatList<ChatMessage>>(null);
  const nearBottom = useRef(true);
  const send = useCallback((prompt?: string) => {
    const question = (prompt ?? draft).trim();
    if (!question || chat.sending) return;
    setDraft("");
    nearBottom.current = true;
    void chat.submit(question);
  }, [chat, draft]);
  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => <MessageBubble message={item} onRetry={chat.retry} />, [chat.retry]);
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    nearBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 120;
  }, []);
  const clear = () => Alert.alert("Clear chat?", "This starts a fresh assistant conversation on this device.", [{ text: "Cancel", style: "cancel" }, { text: "Clear", style: "destructive", onPress: chat.clear }]);

  const stopListening = useCallback(() => {
    if (!listeningRef.current) return;
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const startListening = useCallback(async () => {
    if (listeningRef.current || chat.sending) return;
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      Alert.alert("Voice input unavailable", "Speech recognition is not available on this device. You can still type your question.");
      return;
    }
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Microphone permission needed", "Allow microphone access in device settings to use voice input.");
      return;
    }
    listeningRef.current = true;
    setListening(true);
    ExpoSpeechRecognitionModule.start({ interimResults: true, continuous: false, maxAlternatives: 1 });
  }, [chat.sending]);

  const toggleListening = useCallback(() => {
    if (listeningRef.current) stopListening();
    else void startListening();
  }, [startListening, stopListening]);

  useSpeechRecognitionEvent("start", () => {
    listeningRef.current = true;
    setListening(true);
  });
  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript?.trim();
    if (transcript) setDraft(transcript);
  });
  useSpeechRecognitionEvent("end", () => {
    listeningRef.current = false;
    setListening(false);
  });
  useSpeechRecognitionEvent("error", (event) => {
    listeningRef.current = false;
    setListening(false);
    if (event.error !== "aborted") Alert.alert("Voice input couldn't finish", event.error === "no-speech" || event.error === "speech-timeout" ? "We couldn't hear a question. Please try again." : "Speech recognition is unavailable right now. You can still type your question.");
  });
  useEffect(() => () => {
    if (listeningRef.current) ExpoSpeechRecognitionModule.abort();
  }, []);

  return <SafeAreaView edges={["top"]} style={styles.safe}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
      <View style={styles.header}><View style={styles.headerText}><Text style={styles.title}>Construction AI Assistant</Text><Text style={styles.subtitle}>Ask about materials, quantities and planning.</Text></View>{chat.messages.length ? <Pressable accessibilityRole="button" accessibilityLabel="Clear chat" onPress={clear} style={styles.clear}><Text style={styles.clearText}>Clear chat</Text></Pressable> : null}</View>
      <FlatList ref={list} data={chat.messages} renderItem={renderMessage} keyExtractor={(item) => item.id} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" onScroll={onScroll} scrollEventThrottle={100} onContentSizeChange={() => { if (nearBottom.current) list.current?.scrollToEnd({ animated: true }); }} contentContainerStyle={[styles.list, !chat.messages.length && styles.emptyList]} ListEmptyComponent={<AssistantWelcome disabled={chat.sending} onSelect={send} />} ListFooterComponent={chat.sending ? <TypingIndicator onCancel={chat.cancel} /> : <Text style={styles.disclaimer}>AI estimates are for planning guidance. Final structural quantities should be verified by a qualified engineer or contractor.</Text>} initialNumToRender={12} maxToRenderPerBatch={10} windowSize={7} />
      <AssistantComposer value={draft} sending={chat.sending} listening={listening} onChange={setDraft} onSend={() => send()} onToggleListening={toggleListening} />
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: theme.colors.background }, header: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface }, headerText: { flex: 1 }, title: { fontSize: 21, fontWeight: "900", color: theme.colors.text }, subtitle: { marginTop: 3, fontSize: 12, color: theme.colors.muted }, clear: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 }, clearText: { color: theme.colors.primary, fontWeight: "800" }, list: { flexGrow: 1, paddingTop: 8, paddingBottom: 8 }, emptyList: { justifyContent: "center" }, disclaimer: { marginHorizontal: 18, marginVertical: 14, textAlign: "center", fontSize: 11, lineHeight: 16, color: theme.colors.muted } });
