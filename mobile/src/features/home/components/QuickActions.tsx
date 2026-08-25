import type { Href } from "expo-router";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SectionHeader } from "./SectionHeader";
import { theme } from "@/theme";

const actions: Array<{ label: string; hint: string; icon: string; bg: string; href: Href }> = [
  { label: "AI से पूछें", hint: "Construction help", icon: "✨", bg: "#EEF2FF", href: "/(tabs)/assistant" },
  { label: "Track Order", hint: "Check live status", icon: "🚚", bg: "#ECFDF5", href: "/(tabs)/track" },
  { label: "Products", hint: "Browse catalogue", icon: "🧱", bg: "#F0FDFA", href: "/(tabs)/products" },
  { label: "Contact Us", hint: "Direct support", icon: "📞", bg: "#FFFBEB", href: "/about" },
];

export function QuickActions() {
  return (
    <View style={styles.section}>
      <SectionHeader title="Quick actions" />
      <View style={styles.grid}>
        {actions.map((action) => (
          <Link key={action.label} href={action.href} asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${action.label}, ${action.hint}`}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={[styles.iconBox, { backgroundColor: action.bg }]}>
                <Text style={styles.icon}>{action.icon}</Text>
              </View>
              <View style={styles.copy}>
                <Text style={styles.label}>{action.label}</Text>
                <Text numberOfLines={1} style={styles.hint}>
                  {action.hint}
                </Text>
              </View>
            </Pressable>
          </Link>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 26,
  },
  grid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  card: {
    width: "48.5%",
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    ...theme.shadow,
    elevation: 2,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  iconBox: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
  },
  icon: {
    fontSize: 20,
  },
  copy: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.text,
  },
  hint: {
    marginTop: 2,
    fontSize: 10.5,
    color: theme.colors.muted,
  },
});
