import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

export function AIConstructionCard() {
  return (
    <View style={styles.card}>
      {/* Decorative orbs */}
      <View style={styles.orbLarge} />
      <View style={styles.orbSmall} />

      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>✦</Text>
      </View>

      <View style={styles.badgePill}>
        <View style={styles.badgeDot} />
        <Text style={styles.eyebrow}>AI CONSTRUCTION ASSISTANT</Text>
      </View>

      <Text style={styles.title}> घर बनाने की planning में मदद चाहिए?</Text>
      <Text style={styles.body}>
        सीमेंट, सरिया, slab, column, tiles, paint और material estimate के बारे में AI से पूछें.
      </Text>

      <View style={styles.chips}>
        {["Material Estimate", "Cost Calculator", "Stage Guide"].map((chip) => (
          <View key={chip} style={styles.chip}>
            <Text style={styles.chipText}>{chip}</Text>
          </View>
        ))}
      </View>

      <Link href="/(tabs)/assistant" asChild>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonIcon}>✨</Text>
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
    padding: 22,
    borderRadius: 24,
    backgroundColor: "#0F172A",
    ...theme.shadow,
    elevation: 4,
  },
  orbLarge: {
    position: "absolute",
    right: -40,
    bottom: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(56, 189, 248, 0.10)",
  },
  orbSmall: {
    position: "absolute",
    left: -20,
    top: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(139, 92, 246, 0.08)",
  },
  iconCircle: {
    position: "absolute",
    right: -8,
    top: -8,
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 45,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  iconText: {
    color: "#FDE68A",
    fontSize: 40,
  },
  badgePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(99, 102, 241, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.30)",
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#818CF8",
  },
  eyebrow: {
    color: "#A5B4FC",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  title: {
    maxWidth: 280,
    marginTop: 12,
    color: "white",
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  body: {
    maxWidth: 310,
    marginTop: 8,
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "400",
  },
  chips: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
  },
  chipText: {
    color: "#CBD5E1",
    fontSize: 10.5,
    fontWeight: "700",
  },
  button: {
    minHeight: 46,
    marginTop: 18,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  buttonIcon: {
    fontSize: 15,
  },
  buttonText: {
    color: "#0F172A",
    fontSize: 13.5,
    fontWeight: "900",
  },
  arrow: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
  },
});
