import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/theme";

export default function NotFoundScreen() {
  return <SafeAreaView style={styles.safe}><View style={styles.content}><Text style={styles.title}>This page isn't available.</Text><Text style={styles.body}>The link may be incomplete or no longer valid.</Text><Pressable accessibilityRole="button" accessibilityLabel="Go Home" onPress={() => router.replace("/(tabs)")} style={styles.primary}><Text style={styles.primaryText}>Go Home</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Browse Products" onPress={() => router.replace("/(tabs)/products")} style={styles.secondary}><Text style={styles.secondaryText}>Browse Products</Text></Pressable></View></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: theme.colors.background }, content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 }, title: { textAlign: "center", fontSize: 23, fontWeight: "900", color: theme.colors.text }, body: { marginTop: 9, textAlign: "center", lineHeight: 21, color: theme.colors.muted }, primary: { minHeight: 50, minWidth: 180, marginTop: 24, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: theme.colors.primary }, primaryText: { color: "white", fontWeight: "800" }, secondary: { minHeight: 50, minWidth: 180, marginTop: 10, alignItems: "center", justifyContent: "center" }, secondaryText: { color: theme.colors.primary, fontWeight: "800" } });
