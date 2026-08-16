import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { selectCartCount, useCartStore } from "@/store/cartStore";
import { theme } from "@/theme";
import { resolveImageUrl } from "@/utils/images";

export function HomeHeader({ companyName, logoUrl }: { companyName: string; logoUrl?: string | null }) {
  const count = useCartStore(selectCartCount);
  const logo = resolveImageUrl(logoUrl, 120);
  return <View style={styles.header}>
    <View style={styles.identity}>{logo ? <Image source={logo} cachePolicy="memory-disk" contentFit="contain" accessibilityLabel={`${companyName} logo`} style={styles.logo} /> : <View style={styles.fallback}><Text style={styles.fallbackText}>MS</Text></View>}<View style={styles.copy}><Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.88} style={styles.name}>{companyName}</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.88} style={styles.subtitle}>Construction Materials & Services</Text></View></View>
    <Link href="/(tabs)/cart" asChild><Pressable accessibilityRole="button" accessibilityLabel={`Open cart, ${Math.ceil(count)} items`} hitSlop={8} style={styles.cart}><Text style={styles.cartIcon}>🛒</Text>{count > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{Math.min(99, Math.ceil(count))}</Text></View> : null}</Pressable></Link>
  </View>;
}
const styles = StyleSheet.create({ header: { flexDirection: "row", alignItems: "center", gap: 8 }, identity: { minWidth: 0, flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }, logo: { width: 42, height: 42, borderRadius: 12, backgroundColor: theme.colors.surface }, fallback: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: theme.colors.primary }, fallbackText: { color: "white", fontSize: 15, fontWeight: "900" }, copy: { minWidth: 0, flex: 1 }, name: { fontSize: 15, lineHeight: 17, fontWeight: "900", color: theme.colors.text }, subtitle: { marginTop: 2, fontSize: 11, color: theme.colors.muted }, cart: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }, cartIcon: { fontSize: 21 }, badge: { position: "absolute", top: -5, right: -5, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderRadius: 10, backgroundColor: theme.colors.secondary }, badgeText: { color: theme.colors.text, fontSize: 10, fontWeight: "900" } });
