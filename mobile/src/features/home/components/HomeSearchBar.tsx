import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

export function HomeSearchBar() {
  return <Link href="/search" asChild><Pressable accessibilityRole="search" accessibilityLabel="Search products" style={({ pressed }) => [styles.search, pressed && styles.pressed]}><Text style={styles.icon}>⌕</Text><View style={styles.copy}><Text numberOfLines={1} style={styles.placeholder}>Search cement, steel, roofing sheets…</Text><Text style={styles.hindi}>सीमेंट, सरिया, शीट आदि खोजें</Text></View><Text style={styles.arrow}>›</Text></Pressable></Link>;
}
const styles = StyleSheet.create({ search: { minHeight: 58, marginTop: 16, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, backgroundColor: theme.colors.surface, ...theme.shadow }, pressed: { opacity: 0.75 }, icon: { fontSize: 26, color: theme.colors.primary }, copy: { flex: 1 }, placeholder: { fontSize: 14, fontWeight: "600", color: theme.colors.text }, hindi: { marginTop: 2, fontSize: 11, color: theme.colors.muted }, arrow: { fontSize: 26, color: theme.colors.muted } });
