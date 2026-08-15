import type { ReactElement, ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View, type RefreshControlProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/theme";

export function Screen({ title, subtitle, children, refreshControl }: { title: string; subtitle?: string; children?: ReactNode; refreshControl?: ReactElement<RefreshControlProps> }) {
  return <SafeAreaView edges={["top"]} style={styles.safe}><ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl} keyboardShouldPersistTaps="handled"><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}<View style={styles.body}>{children}</View></ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: theme.spacing.md, paddingBottom: 100 }, title: { fontSize: theme.typography.title, fontWeight: "800", color: theme.colors.text }, subtitle: { marginTop: 4, lineHeight: 21, color: theme.colors.muted }, body: { marginTop: theme.spacing.lg } });
