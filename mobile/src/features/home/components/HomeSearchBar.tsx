import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

export function HomeSearchBar() {
  const router = useRouter();
  return <Pressable accessibilityRole="button" accessibilityLabel="Search construction products" onPress={() => router.push("/search")} style={({ pressed }) => [styles.search, pressed && styles.pressed]}><View style={styles.row}><Text style={styles.icon}>⌕</Text><View style={styles.copy}><Text numberOfLines={1} style={styles.placeholder}>Search cement, steel, roofing sheets…</Text><Text numberOfLines={1} style={styles.hindi}>सीमेंट, सरिया, शीट आदि खोजें</Text></View><Text style={styles.arrow}>›</Text></View></Pressable>;
}
const styles = StyleSheet.create({ search: { minHeight: 68, marginTop: 16, paddingHorizontal: 15, paddingVertical: 9, borderWidth: 1, borderColor: "#9ED8C9", borderRadius: 18, backgroundColor: theme.colors.surface, ...theme.shadow }, row: { minHeight: 48, flexDirection: "row", flexWrap: "nowrap", alignItems: "center" }, pressed: { opacity: 0.78, transform: [{ scale: 0.995 }] }, icon: { width: 28, marginRight: 10, textAlign: "center", fontSize: 25, color: theme.colors.primary }, copy: { minWidth: 0, flexGrow: 1, flexShrink: 1, justifyContent: "center" }, placeholder: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: theme.colors.text }, hindi: { marginTop: 1, fontSize: 11, lineHeight: 16, color: theme.colors.muted }, arrow: { width: 22, marginLeft: 8, textAlign: "center", fontSize: 25, color: theme.colors.primary } });
