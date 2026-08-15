import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

export function ColdStartState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Server is starting…</Text>
      <Text style={styles.body}>This may take a few moments. Saved content remains available while we reconnect.</Text>
      <Pressable accessibilityRole="button" style={styles.button} onPress={onRetry}><Text style={styles.buttonText}>Retry</Text></Pressable>
    </View>
  );
}
const styles = StyleSheet.create({ card: { margin: 16, padding: 20, borderRadius: 12, backgroundColor: theme.colors.surface, ...theme.shadow }, title: { fontSize: 18, fontWeight: "700", color: theme.colors.text }, body: { marginTop: 8, lineHeight: 21, color: theme.colors.muted }, button: { alignSelf: "flex-start", minHeight: 44, marginTop: 16, justifyContent: "center", borderRadius: 8, backgroundColor: theme.colors.primary, paddingHorizontal: 18 }, buttonText: { color: "white", fontWeight: "700" } });
