import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

export function HomeSearchBar() {
  return <Link href="/search" asChild><Pressable accessibilityRole="search" accessibilityLabel="Search construction products" style={({ pressed }) => [styles.search, pressed && styles.pressed]}><Text style={styles.icon}>⌕</Text><View style={styles.copy}><Text numberOfLines={1} style={styles.placeholder}>Search cement, steel, roofing sheets…</Text><Text numberOfLines={1} style={styles.hindi}>सीमेंट, सरिया, शीट आदि खोजें</Text></View><Text style={styles.arrow}>›</Text></Pressable></Link>;
}
const styles = StyleSheet.create({ search: { minHeight: 64, marginTop: 16, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 15, paddingVertical: 9, borderWidth: 1, borderColor: "#9ED8C9", borderRadius: 17, backgroundColor: "#FFFFFF", ...theme.shadow }, pressed: { opacity: 0.78, transform: [{ scale: 0.995 }] }, icon: { width: 25, textAlign: "center", fontSize: 25, color: theme.colors.primary }, copy: { minWidth: 0, flex: 1, justifyContent: "center" }, placeholder: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: theme.colors.text }, hindi: { marginTop: 1, fontSize: 11, lineHeight: 16, color: theme.colors.muted }, arrow: { width: 18, textAlign: "center", fontSize: 25, color: theme.colors.primary } });
