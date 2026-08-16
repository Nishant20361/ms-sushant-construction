import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

export function HomeSearchBar() {
  return <Link href="/search" asChild><Pressable accessibilityRole="search" accessibilityLabel="Search construction products" style={({ pressed }) => [styles.search, pressed && styles.pressed]}><View style={styles.iconSurface}><Text style={styles.icon}>⌕</Text></View><View style={styles.copy}><Text numberOfLines={1} style={styles.placeholder}>Search cement, steel, roofing sheets…</Text><Text numberOfLines={1} style={styles.hindi}>सीमेंट, सरिया, शीट आदि खोजें</Text></View><Text style={styles.arrow}>›</Text></Pressable></Link>;
}
const styles = StyleSheet.create({ search: { minHeight: 68, marginTop: 16, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: "#BFE6DC", borderRadius: 18, backgroundColor: theme.colors.surface, ...theme.shadow }, pressed: { opacity: 0.78, transform: [{ scale: 0.995 }] }, iconSurface: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#ECFDF5" }, icon: { fontSize: 25, color: theme.colors.primary }, copy: { minWidth: 0, flex: 1 }, placeholder: { fontSize: 13, lineHeight: 18, fontWeight: "700", color: theme.colors.text }, hindi: { marginTop: 2, fontSize: 11, lineHeight: 16, color: theme.colors.muted }, arrow: { width: 18, textAlign: "center", fontSize: 26, color: theme.colors.primary } });
