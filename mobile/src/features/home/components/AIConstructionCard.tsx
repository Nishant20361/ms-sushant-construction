import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

export function AIConstructionCard() {
  return (
    <View style={styles.card}>
      <View style={styles.decorativeOrb} />
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>✦</Text>
      </View>
      <View style={styles.badgePill}>
        <Text style={styles.eyebrow}>🤖 AI ASSISTANT</Text>
      </View>
      <Text style={styles.title}>घर बनाने की planning में मदद चाहिए?</Text>
      <Text style={styles.body}>
        सीमेंट, सरिया, slab, column, tiles, paint और material estimate के बारे में AI से पूछें.
      </Text>
      <Link href="/(tabs)/assistant" asChild>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
        >
          <Text style={styles.buttonText}>Ask Construction AI</Text>
          <Text style={styles.arrow}>→</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 28,
    overflow: "hidden",
    padding: 20,
    borderRadius: 22,
    backgroundColor: "#0F172A",
    ...theme.shadow,
    elevation: 3,
  },
  decorativeOrb: {
    position: "absolute",
    right: -30,
    bottom: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
  },
  iconCircle: {
    position: "absolute",
    right: -10,
    top: -10,
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  iconText: {
    color: "#FDE68A",
    fontSize: 42,
  },
  badgePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 999,
    backgroundColor: "rgba(147, 197, 253, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(147, 197, 253, 0.25)",
  },
  eyebrow: {
    color: "#93C5FD",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  title: {
    maxWidth: 290,
    marginTop: 10,
    color: "white",
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
  },
  body: {
    maxWidth: 310,
    marginTop: 8,
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    minHeight: 42,
    marginTop: 16,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  buttonText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },
  arrow: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
  },
});
