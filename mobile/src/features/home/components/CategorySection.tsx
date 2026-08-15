import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SectionHeader } from "./SectionHeader";
import type { Category } from "@/types/domain";
import { theme } from "@/theme";

const categoryGlyph = (slug: string) => {
  const value = slug.toLowerCase();
  if (value.includes("cement")) return "▧";
  if (value.includes("steel") || value.includes("iron")) return "╫";
  if (value.includes("roof")) return "⌂";
  if (value.includes("brick")) return "▦";
  if (value.includes("paint")) return "◒";
  if (value.includes("tile")) return "◇";
  return "▤";
};

function CategorySkeleton() { return <View style={styles.skeleton}><View style={styles.skeletonIcon} /><View style={styles.skeletonLine} /></View>; }

export function CategorySection({ categories, loading, error, onRetry }: { categories?: Category[]; loading: boolean; error: boolean; onRetry: () => void }) {
  const visible = categories?.slice(0, 10) || [];
  return <View style={styles.section}><SectionHeader title="Shop by category" subtitle="Construction essentials, organized" actionLabel="Products" href="/(tabs)/products" />
    {loading && !visible.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>{[1, 2, 3, 4].map((key) => <CategorySkeleton key={key} />)}</ScrollView> : null}
    {error && !visible.length ? <Pressable accessibilityRole="button" onPress={onRetry} style={styles.error}><Text style={styles.errorTitle}>Categories couldn’t load.</Text><Text style={styles.retry}>Tap to retry</Text></Pressable> : null}
    {!loading && !error && !visible.length ? <Text style={styles.empty}>Categories will appear here when available.</Text> : null}
    {visible.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>{visible.map((category) => <Link key={category.id} href={{ pathname: "/category/[slug]", params: { slug: category.slug } }} asChild><Pressable accessibilityRole="button" accessibilityLabel={`Browse ${category.name}`} style={({ pressed }) => [styles.card, pressed && styles.pressed]}><View style={styles.iconCircle}><Text style={styles.icon}>{categoryGlyph(category.slug)}</Text></View><Text numberOfLines={2} style={styles.name}>{category.name}</Text>{category.productCount !== undefined ? <Text style={styles.count}>{category.productCount} items</Text> : null}</Pressable></Link>)}</ScrollView> : null}
  </View>;
}
const styles = StyleSheet.create({ section: { marginTop: 28 }, list: { gap: 11, paddingTop: 14, paddingRight: 16 }, card: { width: 104, minHeight: 124, alignItems: "center", padding: 12, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, backgroundColor: theme.colors.surface }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] }, iconCircle: { width: 50, height: 50, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "#CCFBF1" }, icon: { fontSize: 25, color: theme.colors.primaryDark }, name: { marginTop: 9, textAlign: "center", fontSize: 12, lineHeight: 16, fontWeight: "700", color: theme.colors.text }, count: { marginTop: 3, fontSize: 10, color: theme.colors.muted }, skeleton: { width: 104, height: 124, alignItems: "center", padding: 12, borderRadius: 16, backgroundColor: theme.colors.surface }, skeletonIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: theme.colors.border }, skeletonLine: { width: 70, height: 12, marginTop: 12, borderRadius: 6, backgroundColor: theme.colors.border }, error: { minHeight: 72, marginTop: 14, justifyContent: "center", padding: 14, borderRadius: 12, backgroundColor: "#FEF2F2" }, errorTitle: { color: theme.colors.danger, fontWeight: "700" }, retry: { marginTop: 3, color: theme.colors.primary, fontWeight: "700" }, empty: { marginTop: 14, color: theme.colors.muted } });
