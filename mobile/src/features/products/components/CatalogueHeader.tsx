import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Category } from "@/types/domain";
import type { ProductSort } from "@/types/api";
import { ProductToolbar } from "./ProductToolbar";
import { theme } from "@/theme";

export function CatalogueHeader({
  title = "Products",
  subtitle,
  categories,
  category,
  onCategory,
  sort,
  inStock,
  onSort,
  onInStock,
  showSearch = true,
}: {
  title?: string;
  subtitle?: string;
  categories?: Category[];
  category?: string;
  onCategory?: (slug?: string) => void;
  sort: ProductSort;
  inStock: boolean;
  onSort: (sort: ProductSort) => void;
  onInStock: (value: boolean) => void;
  showSearch?: boolean;
}) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {showSearch ? (
        <Pressable
          accessibilityRole="search"
          accessibilityLabel="Search products"
          onPress={() => router.push("/search")}
          style={({ pressed }) => [styles.search, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}
        >
          <View style={styles.searchIconContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
          </View>
          <Text style={styles.searchText}>Search cement, steel, roofing sheets…</Text>
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>›</Text>
          </View>
        </Pressable>
      ) : null}
      {categories?.length && onCategory ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => onCategory(undefined)}
            style={[styles.chip, !category && styles.chipActive]}
          >
            <Text style={[styles.chipText, !category && styles.chipTextActive]}>All</Text>
          </Pressable>
          {categories.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: category === item.slug }}
              onPress={() => onCategory(item.slug)}
              style={[styles.chip, category === item.slug && styles.chipActive]}
            >
              <Text style={[styles.chipText, category === item.slug && styles.chipTextActive]}>
                {item.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <ProductToolbar sort={sort} inStock={inStock} onSort={onSort} onInStock={onInStock} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 4,
    paddingBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    color: theme.colors.muted,
  },
  search: {
    minHeight: 50,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    ...theme.shadow,
    elevation: 2,
  },
  searchIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F0FDFA",
    alignItems: "center",
    justifyContent: "center",
  },
  searchIcon: {
    fontSize: 15,
  },
  searchText: {
    flex: 1,
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: "500",
  },
  arrowContainer: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: "700",
    marginTop: -1,
  },
  chips: {
    gap: 8,
    paddingTop: 12,
    paddingRight: 14,
  },
  chip: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    ...theme.shadow,
    elevation: 1,
  },
  chipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  chipText: {
    color: theme.colors.text,
    fontSize: 12.5,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "white",
  },
});
