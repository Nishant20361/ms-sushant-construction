import type { Href } from "expo-router";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SectionHeader } from "./SectionHeader";
import { theme } from "@/theme";

const actions: Array<{ label: string; hint: string; icon: string; bg: string; accent: string; href: Href }> = [
  { label: "AI से पूछें", hint: "Material estimate", icon: "✨", bg: "#EEF2FF", accent: "#6366F1", href: "/(tabs)/assistant" },
  { label: "Track Order", hint: "Live status", icon: "🚚", bg: "#ECFDF5", accent: "#10B981", href: "/(tabs)/track" },
  { label: "Products", hint: "Full catalogue", icon: "🧱", bg: "#F0FDFA", accent: "#0D9488", href: "/(tabs)/products" },
  { label: "Contact Us", hint: "Direct support", icon: "📞", bg: "#FFFBEB", accent: "#D97706", href: "/about" },
];

export function QuickActions() {
  return (
    <View style={styles.section}>
      <SectionHeader title="Quick Actions" />
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
              <View style={[styles.arrowCircle, { backgroundColor: action.bg }]}>
                <Text style={[styles.arrow, { color: action.accent }]}>›</Text>
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
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    ...theme.shadow,
    shadowOpacity: 0.06,
    elevation: 2,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
    borderColor: theme.colors.primary,
  },
  iconBox: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  icon: {
    fontSize: 21,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.text,
    letterSpacing: -0.1,
  },
  hint: {
    fontSize: 10.5,
    color: theme.colors.muted,
    fontWeight: "500",
  },
  arrowCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: -1,
  },
});
