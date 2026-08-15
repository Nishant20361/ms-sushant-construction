import type { Href } from "expo-router";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SectionHeader } from "./SectionHeader";
import { theme } from "@/theme";

const actions: Array<{ label: string; hint: string; icon: string; href: Href }> = [
  { label: "AI से पूछें", hint: "Construction help", icon: "✦", href: "/(tabs)/assistant" },
  { label: "Track Order", hint: "Check progress", icon: "⌖", href: "/(tabs)/track" },
  { label: "Products", hint: "Browse materials", icon: "▦", href: "/(tabs)/products" },
  { label: "Contact", hint: "Call or email", icon: "☎", href: "/about" },
];

export function QuickActions() {
  return <View style={styles.section}><SectionHeader title="Quick actions" /><View style={styles.grid}>{actions.map((action) => <Link key={action.label} href={action.href} asChild><Pressable accessibilityRole="button" accessibilityLabel={`${action.label}, ${action.hint}`} style={({ pressed }) => [styles.card, pressed && styles.pressed]}><View style={styles.iconBox}><Text style={styles.icon}>{action.icon}</Text></View><View style={styles.copy}><Text style={styles.label}>{action.label}</Text><Text numberOfLines={1} style={styles.hint}>{action.hint}</Text></View></Pressable></Link>)}</View></View>;
}
const styles = StyleSheet.create({ section: { marginTop: 28 }, grid: { marginTop: 13, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 }, card: { width: "48.5%", minHeight: 78, flexDirection: "row", alignItems: "center", gap: 10, padding: 11, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 15, backgroundColor: theme.colors.surface }, pressed: { opacity: 0.72 }, iconBox: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#FFF7E6" }, icon: { fontSize: 21, color: theme.colors.warning }, copy: { flex: 1 }, label: { fontSize: 13, fontWeight: "800", color: theme.colors.text }, hint: { marginTop: 3, fontSize: 10, color: theme.colors.muted } });
