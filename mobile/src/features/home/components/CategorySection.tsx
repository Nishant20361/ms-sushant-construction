import { Link } from "expo-router";
import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SectionHeader } from "./SectionHeader";
import type { Category } from "@/types/domain";
import { theme } from "@/theme";
import { resolveImageUrl } from "@/utils/images";
import { useState } from "react";

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

function CategoryArtwork({ name, slug, imageUrl }: { name: string; slug: string; imageUrl?: string | null }) {
  const [failed, setFailed] = useState(false);
  const image = failed ? null : resolveImageUrl(imageUrl, 180);
  return <View style={styles.iconCircle}>{image ? <Image source={image} contentFit="cover" cachePolicy="memory-disk" accessibilityLabel={`${name} category`} onError={() => setFailed(true)} style={styles.categoryImage} /> : <Text style={styles.icon}>{categoryGlyph(slug)}</Text>}</View>;
}

export function CategorySection({ categories, loading, error, onRetry }: { categories?: Category[]; loading: boolean; error: boolean; onRetry: () => void }) {
  const visible = categories?.slice(0, 10) || [];
  return <View style={styles.section}><SectionHeader title="Shop by category" subtitle="Construction essentials, organized" actionLabel="Products" href="/(tabs)/products" />
    {loading && !visible.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>{[1, 2, 3, 4].map((key) => <CategorySkeleton key={key} />)}</ScrollView> : null}
    {error && !visible.length ? <Pressable accessibilityRole="button" onPress={onRetry} style={styles.error}><Text style={styles.errorTitle}>Categories couldn’t load.</Text><Text style={styles.retry}>Tap to retry</Text></Pressable> : null}
    {!loading && !error && !visible.length ? <Text style={styles.empty}>Categories will appear here when available.</Text> : null}
    {visible.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>{visible.map((category) => <Link key={category.id} href={{ pathname: "/category/[slug]", params: { slug: category.slug } }} asChild><Pressable accessibilityRole="button" accessibilityLabel={`Browse ${category.name}`} style={({ pressed }) => [styles.card, pressed && styles.pressed]}><CategoryArtwork name={category.name} slug={category.slug} imageUrl={category.imageUrl} /><Text numberOfLines={2} ellipsizeMode="clip" style={styles.name}>{category.name}</Text><Text style={styles.count}>{category.productCount !== undefined ? `${category.productCount} items` : " "}</Text></Pressable></Link>)}</ScrollView> : null}
  </View>;
}
const styles = StyleSheet.create({ section: { marginTop: 28 }, list: { gap: 12, paddingTop: 14, paddingRight: 16 }, card: { width: 136, height: 150, alignItems: "center", paddingHorizontal: 11, paddingTop: 12, borderWidth: 1, borderColor: "#D5E9E4", borderRadius: 18, backgroundColor: theme.colors.surface, ...theme.shadow }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] }, iconCircle: { width: 54, height: 54, overflow: "hidden", alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "#CCFBF1" }, categoryImage: { width: 54, height: 54 }, icon: { fontSize: 25, color: theme.colors.primaryDark }, name: { alignSelf: "stretch", height: 40, marginTop: 8, textAlign: "center", fontSize: 13, lineHeight: 18, fontWeight: "800", color: theme.colors.text }, count: { height: 16, marginTop: 2, textAlign: "center", fontSize: 11, lineHeight: 16, color: theme.colors.muted }, skeleton: { width: 136, height: 150, alignItems: "center", paddingTop: 12, borderRadius: 18, backgroundColor: theme.colors.surface }, skeletonIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: theme.colors.border }, skeletonLine: { width: 100, height: 12, marginTop: 12, borderRadius: 6, backgroundColor: theme.colors.border }, error: { minHeight: 72, marginTop: 14, justifyContent: "center", padding: 14, borderRadius: 12, backgroundColor: "#FEF2F2" }, errorTitle: { color: theme.colors.danger, fontWeight: "700" }, retry: { marginTop: 3, color: theme.colors.primary, fontWeight: "700" }, empty: { marginTop: 14, color: theme.colors.muted } });
