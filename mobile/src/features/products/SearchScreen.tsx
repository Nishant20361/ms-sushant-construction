import { useMemo, useRef, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CartToast } from "./components/CartToast";
import { ProductGrid } from "./components/ProductGrid";
import { ProductToolbar } from "./components/ProductToolbar";
import { useAddToCartFeedback } from "./hooks/useAddToCartFeedback";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { PRODUCT_PAGE_SIZE, useProducts } from "./hooks/useProducts";
import type { ProductSort } from "@/types/api";
import { theme } from "@/theme";

export default function SearchScreen() {
  const [term, setTerm] = useState("");
  const [sort, setSort] = useState<ProductSort>("newest");
  const [inStock, setInStock] = useState(false);
  const debounced = useDebouncedValue(term.trim(), 400);
  const enabled = debounced.length >= 2;
  const params = useMemo(
    () => ({ search: debounced, sort, inStock: inStock || undefined, limit: PRODUCT_PAGE_SIZE }),
    [debounced, inStock, sort]
  );
  const query = useProducts(params, enabled, "SEARCH");
  const cart = useAddToCartFeedback();
  const input = useRef<TextInput>(null);

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>Search Catalogue</Text>
      <View style={styles.inputBox}>
        <Text style={styles.icon}>🔍</Text>
        <TextInput
          ref={input}
          autoFocus
          value={term}
          onChangeText={setTerm}
          placeholder="Search cement, steel, sheets, pipes…"
          placeholderTextColor={theme.colors.muted}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never"
          onSubmitEditing={() => Keyboard.dismiss()}
          style={styles.input}
        />
        {term ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => {
              setTerm("");
              input.current?.focus();
            }}
            style={styles.clear}
          >
            <Text style={styles.clearText}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {enabled ? (
        <ProductToolbar sort={sort} inStock={inStock} onSort={setSort} onInStock={setInStock} />
      ) : (
        <View style={styles.promptWrap}>
          <Text style={styles.prompt}>
            {term.length === 1
              ? "Type one more character to start searching."
              : "Search from hundreds of authentic construction materials."}
          </Text>
          <View style={styles.suggestions}>
            <Text style={styles.suggestionTitle}>Popular Searches:</Text>
            <View style={styles.chipRow}>
              {["Cement", "Steel Rod", "Roofing Sheet", "Waterproofing", "Bricks"].map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => {
                    setTerm(tag);
                  }}
                  style={({ pressed }) => [styles.tagChip, pressed && styles.tagPressed]}
                >
                  <Text style={styles.tagText}>{tag}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const empty = enabled ? `No products found for "${debounced}".` : "Enter at least 2 characters to search.";

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <ProductGrid
        products={enabled ? query.products : []}
        total={enabled ? query.total : 0}
        loading={enabled && query.isPending}
        error={enabled && query.isError}
        refreshing={enabled && query.isRefetching && !query.isFetchingNextPage}
        fetchingNext={query.isFetchingNextPage}
        hasNext={enabled && Boolean(query.hasNextPage)}
        onRefresh={() => {
          if (enabled) void query.refetch();
        }}
        onRetry={() => void query.refetch()}
        onEndReached={() => void query.fetchNextPage()}
        onAdd={cart.addProduct}
        emptyMessage={empty}
        header={header}
      />
      <CartToast message={cart.message} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 6,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  inputBox: {
    minHeight: 52,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    ...theme.shadow,
    elevation: 2,
  },
  icon: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    minHeight: 50,
    color: theme.colors.text,
    fontSize: 14.5,
  },
  clear: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  clearText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "900",
  },
  promptWrap: {
    marginTop: 14,
    gap: 16,
  },
  prompt: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  suggestions: {
    gap: 8,
  },
  suggestionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  tagPressed: {
    backgroundColor: "#CCFBF1",
  },
  tagText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
});
