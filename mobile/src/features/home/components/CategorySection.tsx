import { useState } from "react";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SectionHeader } from "./SectionHeader";
import type { Category } from "@/types/domain";
import { theme } from "@/theme";
import { resolveImageUrl } from "@/utils/images";

const HOME_HORIZONTAL_PADDING = 16;
const CATEGORY_GAP = 12;
const VISIBLE_CATEGORY_COUNT = 4;

export function calculateCategoryCardWidth(viewportWidth: number): number {
  if (viewportWidth <= 0) return 0;
  return Math.floor((viewportWidth - CATEGORY_GAP * (VISIBLE_CATEGORY_COUNT - 1)) / VISIBLE_CATEGORY_COUNT);
}

const categoryGlyph = (slug: string) => {
  const value = slug.toLowerCase();
  if (value.includes("cement")) return "🏗️";
  if (value.includes("steel") || value.includes("iron")) return "🔩";
  if (value.includes("roof")) return "🏠";
  if (value.includes("brick")) return "🧱";
  if (value.includes("paint")) return "🎨";
  if (value.includes("tile")) return "◻️";
  if (value.includes("pipe")) return "🔧";
  return "📦";
};

function CategorySkeleton({ width }: { width: number }) {
  return (
    <View style={[styles.itemSlot, { width, marginRight: CATEGORY_GAP }]}>
      <View style={styles.skeleton}>
        <View style={styles.skeletonIcon} />
        <View style={styles.skeletonLine} />
      </View>
    </View>
  );
}

function CategoryArtwork({ name, slug, imageUrl }: { name: string; slug: string; imageUrl?: string | null }) {
  const [failed, setFailed] = useState(false);
  const image = failed ? null : resolveImageUrl(imageUrl, 180);

  return (
    <View style={styles.iconCircle}>
      {image ? (
        <Image
          source={image}
          contentFit="cover"
          cachePolicy="memory-disk"
          accessibilityLabel={`${name} category`}
          onError={() => setFailed(true)}
          style={styles.categoryImage}
        />
      ) : (
        <Text style={styles.icon}>{categoryGlyph(slug)}</Text>
      )}
    </View>
  );
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
  const visible = categories?.slice(0, 12) ?? [];

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Shop by category"
        subtitle="Construction essentials, organized"
        actionLabel="See all"
        href="/(tabs)/products"
      />
      <View style={styles.listViewport}>
        {loading && !visible.length && cardWidth > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
            {[1, 2, 3, 4].map((key) => (
              <CategorySkeleton key={key} width={cardWidth} />
            ))}
          </ScrollView>
        ) : null}

        {error && !visible.length ? (
          <Pressable accessibilityRole="button" onPress={onRetry} style={styles.error}>
            <Text style={styles.errorTitle}>Categories couldn’t load.</Text>
            <Text style={styles.retry}>Tap to retry</Text>
          </Pressable>
        ) : null}

        {!loading && !error && !visible.length ? (
          <Text style={styles.empty}>Categories will appear here when available.</Text>
        ) : null}

        {visible.length && cardWidth > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.list}
          >
            {visible.map((category) => (
              <View key={category.id} style={[styles.itemSlot, { width: cardWidth, marginRight: CATEGORY_GAP }]}>
                <Link
                  href={{ pathname: "/category/[slug]", params: { slug: category.slug } }}
                  asChild
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Browse ${category.name}`}
                    style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                  >
                    <CategoryArtwork name={category.name} slug={category.slug} imageUrl={category.imageUrl} />
                    <View style={styles.nameRegion}>
                      <Text
                        maxFontSizeMultiplier={1.1}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                        style={styles.name}
                      >
                        {category.name}
                      </Text>
                    </View>
                    {category.productCount !== undefined ? (
                      <Text maxFontSizeMultiplier={1} numberOfLines={1} style={styles.count}>
                        {category.productCount} items
                      </Text>
                    ) : null}
                  </Pressable>
                </Link>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 26,
  },
  listViewport: {
    width: "100%",
    overflow: "hidden",
  },
  list: {
    paddingTop: 12,
    paddingBottom: 4,
    paddingRight: 4,
  },
  itemSlot: {
    minHeight: 118,
    flexGrow: 0,
    flexShrink: 0,
  },
  card: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  iconCircle: {
    width: 58,
    height: 58,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#F0FDFA",
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
    ...theme.shadow,
    elevation: 1.5,
  },
  categoryImage: {
    width: 58,
    height: 58,
    borderRadius: 16,
  },
  icon: {
    fontSize: 24,
  },
  nameRegion: {
    width: "100%",
    minHeight: 32,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  name: {
    width: "100%",
    textAlign: "center",
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "700",
    color: theme.colors.text,
    includeFontPadding: false,
  },
  count: {
    marginTop: 2,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "500",
    color: theme.colors.muted,
  },
  skeleton: {
    width: "100%",
    alignItems: "center",
  },
  skeletonIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: theme.colors.border,
  },
  skeletonLine: {
    width: 48,
    height: 10,
    marginTop: 8,
    borderRadius: 5,
    backgroundColor: theme.colors.border,
  },
  error: {
    minHeight: 72,
    marginTop: 14,
    justifyContent: "center",
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorTitle: {
    color: theme.colors.danger,
    fontWeight: "700",
    fontSize: 13,
  },
  retry: {
    marginTop: 4,
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  empty: {
    marginTop: 14,
    color: theme.colors.muted,
    fontSize: 13,
  },
});
