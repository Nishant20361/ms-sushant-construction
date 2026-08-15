import type { Href } from "expo-router";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

export function SectionHeader({ title, subtitle, actionLabel, href }: { title: string; subtitle?: string; actionLabel?: string; href?: Href }) {
  return <View style={styles.row}><View style={styles.copy}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>{href && actionLabel ? <Link href={href} asChild><Pressable accessibilityRole="link" style={styles.action}><Text style={styles.actionText}>{actionLabel}  ›</Text></Pressable></Link> : null}</View>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }, copy: { flex: 1 }, title: { fontSize: 20, fontWeight: "800", color: theme.colors.text }, subtitle: { marginTop: 3, fontSize: 13, color: theme.colors.muted }, action: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 }, actionText: { color: theme.colors.primary, fontWeight: "700" } });
