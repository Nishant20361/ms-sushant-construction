import { useState } from "react";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SectionHeader } from "./SectionHeader";
import type { Category } from "@/types/domain";
import { theme } from "@/theme";
import { resolveImageUrl } from "@/utils/images";

const HOME_HORIZONTAL_PADDING = 16;
const CATEGORY_GAP = 10;
const VISIBLE_CATEGORY_COUNT = 4;

export function calculateCategoryCardWidth(viewportWidth: number): number {
  if (viewportWidth <= 0) return 0;
  return Math.floor((viewportWidth - CATEGORY_GAP * (VISIBLE_CATEGORY_COUNT - 1)) / VISIBLE_CATEGORY_COUNT);
}

export function wrapCategoryName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  const words = name.split(" ");
  if (words.length < 3) return name;

  // Product/category names commonly end with their material type. Keeping that
  // final word on line two produces stable labels such as “Everest Roofing / Sheet”.
  const firstLine = words.slice(0, -1).join(" ");
  if (firstLine.length <= 16) return `${firstLine}\n${words.at(-1)}`;

  let bestSplit = 1;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let split = 1; split < words.length; split += 1) {
    const leftLength = words.slice(0, split).join(" ").length;
    const rightLength = words.slice(split).join(" ").length;
    const overflowPenalty = Math.max(0, leftLength - 16) + Math.max(0, rightLength - 16);
    const score = overflowPenalty * 100 + Math.abs(leftLength - rightLength);
    if (score < bestScore) {
      bestScore = score;
      bestSplit = split;
    }
  }
  return `${words.slice(0, bestSplit).join(" ")}\n${words.slice(bestSplit).join(" ")}`;
}

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

function CategorySkeleton({ width }: { width: number }) {
  return <View style={[styles.itemSlot, { width, marginRight: CATEGORY_GAP }]}><View style={styles.skeleton}><View style={styles.skeletonIcon} /><View style={styles.skeletonLine} /></View></View>;
}

function CategoryArtwork({ name, slug, imageUrl }: { name: string; slug: string; imageUrl?: string | null }) {
  const [failed, setFailed] = useState(false);
  const image = failed ? null : resolveImageUrl(imageUrl, 180);
  return <View style={styles.iconCircle}>{image ? <Image source={image} contentFit="cover" cachePolicy="memory-disk" accessibilityLabel={`${name} category`} onError={() => setFailed(true)} style={styles.categoryImage} /> : <Text style={styles.icon}>{categoryGlyph(slug)}</Text>}</View>;
}

interface CategorySectionProps {
  categories?: Category[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

export function CategorySection({ categories, loading, error, onRetry }: CategorySectionProps) {
  const { width: screenWidth } = useWindowDimensions();
  const viewportWidth = screenWidth - HOME_HORIZONTAL_PADDING * 2;
  const cardWidth = calculateCategoryCardWidth(viewportWidth);
  const visible = categories?.slice(0, 10) ?? [];

  return <View style={styles.section}>
    <SectionHeader title="Shop by category" subtitle="Construction essentials, organized" actionLabel="Products" href="/(tabs)/products" />
    <View style={styles.listViewport}>
      {loading && !visible.length && cardWidth > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>{[1, 2, 3, 4].map((key) => <CategorySkeleton key={key} width={cardWidth} />)}</ScrollView> : null}
      {error && !visible.length ? <Pressable accessibilityRole="button" onPress={onRetry} style={styles.error}><Text style={styles.errorTitle}>Categories couldn’t load.</Text><Text style={styles.retry}>Tap to retry</Text></Pressable> : null}
      {!loading && !error && !visible.length ? <Text style={styles.empty}>Categories will appear here when available.</Text> : null}
      {visible.length && cardWidth > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>{visible.map((category) => <View key={category.id} style={[styles.itemSlot, { width: cardWidth, marginRight: CATEGORY_GAP }]}><Link href={{ pathname: "/category/[slug]", params: { slug: category.slug } }} asChild><Pressable accessibilityRole="button" accessibilityLabel={`Browse ${category.name}`} style={({ pressed }) => [styles.card, pressed && styles.pressed]}><CategoryArtwork name={category.name} slug={category.slug} imageUrl={category.imageUrl} /><View style={styles.nameRegion}><Text maxFontSizeMultiplier={1} numberOfLines={2} ellipsizeMode="clip" style={styles.name}>{wrapCategoryName(category.name)}</Text></View><Text maxFontSizeMultiplier={1} numberOfLines={1} style={styles.count}>{category.productCount !== undefined ? `${category.productCount} items` : " "}</Text></Pressable></Link></View>)}</ScrollView> : null}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  section: { marginTop: 28 },
  listViewport: { width: "100%", overflow: "hidden" },
  list: { paddingTop: 14, paddingRight: 10 },
  itemSlot: { height: 112, flexGrow: 0, flexShrink: 0 },
  card: { width: "100%", height: 112, alignItems: "center" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  iconCircle: { width: 48, height: 48, overflow: "hidden", alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#CCFBF1" },
  categoryImage: { width: 48, height: 48 },
  icon: { fontSize: 22, color: theme.colors.primaryDark },
  nameRegion: { width: "100%", height: 30, marginTop: 6, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  name: { width: "100%", height: 30, textAlign: "center", textAlignVertical: "center", fontSize: 9.5, lineHeight: 14, fontWeight: "800", color: theme.colors.text, includeFontPadding: false },
  count: { width: "100%", height: 15, marginTop: 3, textAlign: "center", fontSize: 9.5, lineHeight: 15, color: theme.colors.muted, includeFontPadding: false },
  skeleton: { width: "100%", height: 112, alignItems: "center" },
  skeletonIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: theme.colors.border },
  skeletonLine: { width: 52, height: 10, marginTop: 10, borderRadius: 6, backgroundColor: theme.colors.border },
  error: { minHeight: 72, marginTop: 14, justifyContent: "center", padding: 14, borderRadius: 12, backgroundColor: "#FEF2F2" },
  errorTitle: { color: theme.colors.danger, fontWeight: "700" },
  retry: { marginTop: 3, color: theme.colors.primary, fontWeight: "700" },
  empty: { marginTop: 14, color: theme.colors.muted },
});
