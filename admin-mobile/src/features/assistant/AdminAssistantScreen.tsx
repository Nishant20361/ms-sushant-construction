import { useEffect, useState } from "react";
import { AppState, TextInput, View } from "react-native";
import { router } from "expo-router";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { Screen } from "@/components/Screen";
import { AppText } from "@/components/AppText";
import { Button, Card } from "@/components/ui";
import { useTheme } from "@/theme";
import { adminApiClient } from "@/services/api/client";
import { AdminAppError } from "@/types/errors";
import { financeService } from "@/features/finance/financeService";
interface Reply {
  message: string;
  contextToken?: string;
  options?: { label: string; value: string }[];
}
const shortcuts = [
  ["Customer udhari", "Customer ki udhari dekhni hai"],
  ["Business growth", "Mera business kaise badhaun?"],
  ["Cash flow", "Business ka cash flow kaise manage karun?"],
  ["Help", "help"],
];
export default function AdminAssistantScreen() {
  const t = useTheme();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<
    (Reply & { role: "user" | "assistant" })[]
  >([]);
  const [context, setContext] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pin, setPin] = useState("");
  const [unlock, setUnlock] = useState(false);
  const [listening, setListening] = useState(false);
  const [language, setLanguage] = useState("hi-IN");
  useSpeechRecognitionEvent("result", (e) => {
    if (e.results[0]) setDraft(e.results[0].transcript);
  });
  useSpeechRecognitionEvent("end", () => setListening(false));
  useSpeechRecognitionEvent("error", () => {
    setListening(false);
    setError("Voice unavailable. Permission check karein ya type karein.");
  });
  useEffect(() => {
    const s = AppState.addEventListener("change", (state) => {
      if (state !== "active") ExpoSpeechRecognitionModule.abort();
    });
    return () => {
      s.remove();
      ExpoSpeechRecognitionModule.abort();
    };
  }, []);
  async function voice() {
    try {
      if (listening) {
        ExpoSpeechRecognitionModule.stop();
        return;
      }
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable())
        throw Error("Speech recognition is unavailable on this device.");
      const p = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!p.granted)
        throw Error(
          "Microphone permission chahiye. Settings mein allow karein ya type karein.",
        );
      ExpoSpeechRecognitionModule.start({
        lang: language,
        interimResults: true,
        continuous: false,
      });
      setListening(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Voice unavailable");
    }
  }
  async function send(text = draft, selection?: string) {
    if (busy || !text.trim()) return;
    setBusy(true);
    setError("");
    setDraft("");
    setMessages((m) => [...m, { role: "user", message: text }]);
    try {
      const r = await adminApiClient.request<Reply>("/admin/assistant/chat", {
        method: "POST",
        body: { message: text, contextToken: context, selection },
        timeoutMs: 30000,
      });
      setContext(r.contextToken);
      setMessages((m) => [...m, { ...r, role: "assistant" }]);
    } catch (e) {
      if (e instanceof AdminAppError && e.status === 400) setContext(undefined);
      if (e instanceof AdminAppError && e.status === 403) setUnlock(true);
      setError(e instanceof Error ? e.message : "Request failed");
      setDraft(text);
    } finally {
      setBusy(false);
    }
  }
  async function unlockPin() {
    setBusy(true);
    setError("");
    try {
      await financeService.verifyPin(pin);
      setPin("");
      setUnlock(false);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          message:
            "Khatabook unlocked for 15 minutes. Ab udhari request dobara bhejein.",
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unlock failed");
    } finally {
      setBusy(false);
    }
  }
  const inputStyle = {
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 12,
    padding: 12,
    minHeight: 48,
    color: t.colors.text,
    backgroundColor: t.colors.surface,
  };
  return (
    <Screen
      keyboardAware
      contentStyle={{
        gap: 16,
        width: "100%",
        maxWidth: 760,
        alignSelf: "center",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <AppText role="pageTitle">Admin Assistant</AppText>
        <Button title="Back" variant="outline" onPress={() => router.back()} />
      </View>
      <Card style={{ gap: 10 }}>
        <AppText role="cardTitle">Sushant Business Saathi</AppText>
        <AppText>
          Customer ki udhari aur dost jaisi business advice. PIN/password chat
          mein na likhein.
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {shortcuts.map(([label, text]) => (
            <Button
              key={label}
              title={label}
              variant="outline"
              disabled={busy}
              onPress={() => {
                setContext(undefined);
                setDraft(text);
              }}
            />
          ))}
        </View>
        <Button
          title="New conversation"
          variant="outline"
          disabled={busy}
          onPress={() => {
            setMessages([]);
            setContext(undefined);
            setError("");
            setDraft("");
          }}
        />
        <Button
          title="Unlock Khatabook"
          variant="outline"
          disabled={busy}
          onPress={() => setUnlock((v) => !v)}
        />
      </Card>
      {unlock && (
        <Card style={{ gap: 10 }}>
          <TextInput
            accessibilityLabel="Khatabook PIN"
            secureTextEntry
            autoComplete="off"
            value={pin}
            onChangeText={setPin}
            placeholder="Khatabook PIN"
            placeholderTextColor={t.colors.textMuted}
            style={inputStyle}
          />
          <Button
            title="Unlock"
            loading={busy}
            disabled={busy || !pin}
            onPress={() => void unlockPin()}
          />
          <Button
            title="Set up / reset PIN"
            variant="outline"
            onPress={() => router.push("/(admin)/account" as never)}
          />
        </Card>
      )}
      {!messages.length && (
        <AppText>
          “Raju ka kitna udhar hai?” ya “Mere kapde ke business ko kaise
          badhaun?” poochhein.
        </AppText>
      )}
      {messages.map((m, index) => (
        <Card
          key={index}
          style={{
            gap: 10,
            backgroundColor:
              m.role === "user" ? t.colors.brandSoft : t.colors.surface,
          }}
        >
          <AppText role="caption">
            {m.role === "user" ? "You" : "Admin Assistant"}
          </AppText>
          <AppText selectable>{m.message}</AppText>
          {m.options?.map((o) => (
            <Button
              key={o.value}
              title={o.label}
              variant="outline"
              disabled={busy || m.contextToken !== context}
              onPress={() => void send(o.label, o.value)}
            />
          ))}
        </Card>
      ))}
      {busy && <AppText>Jawab tayyar ho raha hai…</AppText>}
      {!!error && (
        <AppText style={{ color: t.colors.danger }} accessibilityRole="alert">
          {error}
        </AppText>
      )}
      <Card style={{ gap: 10 }}>
        <TextInput
          accessibilityLabel="Admin assistant message"
          multiline
          value={draft}
          onChangeText={setDraft}
          maxLength={2000}
          editable={!busy}
          placeholder="Bolkar ya likhkar batayein…"
          placeholderTextColor={t.colors.textMuted}
          style={[inputStyle, { minHeight: 90, textAlignVertical: "top" }]}
        />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button
            title={language === "hi-IN" ? "Hindi voice" : "English voice"}
            variant="outline"
            onPress={() =>
              setLanguage((v) => (v === "hi-IN" ? "en-IN" : "hi-IN"))
            }
          />
          <Button
            title={listening ? "Stop mic" : "Voice"}
            variant="outline"
            disabled={busy}
            onPress={() => void voice()}
          />
        </View>
        <Button
          title="Send"
          loading={busy}
          disabled={busy || !draft.trim() || listening}
          onPress={() => void send()}
        />
        <AppText role="caption">
          Voice text review/edit karke Send karein. Udhari live records se aati
          hai. Business advice general guidance hai.
        </AppText>
      </Card>
    </Screen>
  );
}
