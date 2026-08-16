import { Link } from "expo-router";
import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SectionHeader } from "./SectionHeader";
import type { Category } from "@/types/domain";
import { theme } from "@/theme";
import { resolveImageUrl } from "@/utils/images";
import { useState } from "react";

const HOME_HORIZONTAL_PADDING = 16;
const CATEGORY_GAP = 9;
const VISIBLE_CATEGORY_COUNT = 4;

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

function CategorySkeleton({ width }: { width: number }) { return <View style={[styles.skeleton, { width }]}><View style={styles.skeletonIcon} /><View style={styles.skeletonLine} /></View>; }

function CategoryArtwork({ name, slug, imageUrl }: { name: string; slug: string; imageUrl?: string | null }) {
  const [failed, setFailed] = useState(false);
  const image = failed ? null : resolveImageUrl(imageUrl, 180);
  return <View style={styles.iconCircle}>{image ? <Image source={image} contentFit="cover" cachePolicy="memory-disk" accessibilityLabel={`${name} category`} onError={() => setFailed(true)} style={styles.categoryImage} /> : <Text style={styles.icon}>{categoryGlyph(slug)}</Text>}</View>;
}

export function CategorySection({ categories, loading, error, onRetry }: { categories?: Category[]; loading: boolean; error: boolean; onRetry: () => void }) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.max(74, Math.round((screenWidth - HOME_HORIZONTAL_PADDING * 2 - CATEGORY_GAP * (VISIBLE_CATEGORY_COUNT - 1)) / VISIBLE_CATEGORY_COUNT));
  const visible = categories?.slice(0, 10) || [];
  return <View style={styles.section}><SectionHeader title="Shop by category" subtitle="Construction essentials, organized" actionLabel="Products" href="/(tabs)/products" />
    {loading && !visible.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>{[1, 2, 3, 4].map((key) => <CategorySkeleton key={key} width={cardWidth} />)}</ScrollView> : null}
    {error && !visible.length ? <Pressable accessibilityRole="button" onPress={onRetry} style={styles.error}><Text style={styles.errorTitle}>Categories couldn’t load.</Text><Text style={styles.retry}>Tap to retry</Text></Pressable> : null}
    {!loading && !error && !visible.length ? <Text style={styles.empty}>Categories will appear here when available.</Text> : null}
    {visible.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>{visible.map((category) => <Link key={category.id} href={{ pathname: "/category/[slug]", params: { slug: category.slug } }} asChild><Pressable accessibilityRole="button" accessibilityLabel={`Browse ${category.name}`} style={({ pressed }) => [styles.card, { width: cardWidth }, pressed && styles.pressed]}><CategoryArtwork name={category.name} slug={category.slug} imageUrl={category.imageUrl} /><View style={styles.nameRegion}><Text numberOfLines={2} ellipsizeMode="clip" style={styles.name}>{category.name}</Text></View><Text style={styles.count}>{category.productCount !== undefined ? `${category.productCount} items` : " "}</Text></Pressable></Link>)}</ScrollView> : null}
  </View>;
}
const styles = StyleSheet.create({ section: { marginTop: 28 }, list: { gap: CATEGORY_GAP, paddingTop: 14, paddingRight: 16 }, card: { minWidth: 74, height: 126, flexGrow: 0, flexShrink: 0, alignItems: "center", paddingTop: 8, borderWidth: 1, borderColor: "#D5E9E4", borderRadius: 18, backgroundColor: theme.colors.surface, ...theme.shadow }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] }, iconCircle: { width: 50, height: 50, overflow: "hidden", alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "#CCFBF1" }, categoryImage: { width: 50, height: 50 }, icon: { fontSize: 23, color: theme.colors.primaryDark }, nameRegion: { alignSelf: "stretch", height: 36, marginTop: 4, justifyContent: "center", overflow: "hidden" }, name: { textAlign: "center", fontSize: 11, lineHeight: 17, fontWeight: "800", color: theme.colors.text }, count: { alignSelf: "stretch", height: 17, marginTop: 3, textAlign: "center", fontSize: 10, lineHeight: 17, color: theme.colors.muted }, skeleton: { minWidth: 74, height: 126, alignItems: "center", paddingTop: 8, borderRadius: 18, backgroundColor: theme.colors.surface }, skeletonIcon: { width: 50, height: 50, borderRadius: 15, backgroundColor: theme.colors.border }, skeletonLine: { width: 58, height: 11, marginTop: 10, borderRadius: 6, backgroundColor: theme.colors.border }, error: { minHeight: 72, marginTop: 14, justifyContent: "center", padding: 14, borderRadius: 12, backgroundColor: "#FEF2F2" }, errorTitle: { color: theme.colors.danger, fontWeight: "700" }, retry: { marginTop: 3, color: theme.colors.primary, fontWeight: "700" }, empty: { marginTop: 14, color: theme.colors.muted } });
