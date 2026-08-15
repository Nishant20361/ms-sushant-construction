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
  const params = useMemo(() => ({ search: debounced, sort, inStock: inStock || undefined, limit: PRODUCT_PAGE_SIZE }), [debounced, inStock, sort]);
  const query = useProducts(params, enabled, "SEARCH");
  const cart = useAddToCartFeedback();
  const input = useRef<TextInput>(null);
  const header = <View style={styles.header}><Text style={styles.title}>Search products</Text><View style={styles.inputBox}><Text style={styles.icon}>⌕</Text><TextInput ref={input} autoFocus value={term} onChangeText={setTerm} placeholder="Search by name, description or category" placeholderTextColor={theme.colors.muted} returnKeyType="search" autoCapitalize="none" autoCorrect={false} clearButtonMode="never" onSubmitEditing={() => Keyboard.dismiss()} style={styles.input} />{term ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => { setTerm(""); input.current?.focus(); }} style={styles.clear}><Text style={styles.clearText}>×</Text></Pressable> : null}</View>{enabled ? <ProductToolbar sort={sort} inStock={inStock} onSort={setSort} onInStock={setInStock} /> : <Text style={styles.prompt}>{term.length === 1 ? "Type one more character to search." : "Search cement, steel, roofing sheets and other materials."}</Text>}</View>;
  const empty = enabled ? `No products found for “${debounced}”.` : "Enter at least 2 characters to search.";
  return <SafeAreaView edges={["bottom"]} style={styles.safe}><ProductGrid products={enabled ? query.products : []} total={enabled ? query.total : 0} loading={enabled && query.isPending} error={enabled && query.isError} refreshing={enabled && query.isRefetching && !query.isFetchingNextPage} fetchingNext={query.isFetchingNextPage} hasNext={enabled && Boolean(query.hasNextPage)} onRefresh={() => { if (enabled) void query.refetch(); }} onRetry={() => void query.refetch()} onEndReached={() => void query.fetchNextPage()} onAdd={cart.addProduct} emptyMessage={empty} header={header} /><CartToast message={cart.message} /></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: theme.colors.background }, header: { paddingTop: 3, paddingBottom: 8 }, title: { fontSize: 26, fontWeight: "900", color: theme.colors.text }, inputBox: { minHeight: 54, marginTop: 13, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 15, backgroundColor: theme.colors.surface }, icon: { color: theme.colors.primary, fontSize: 25 }, input: { flex: 1, minHeight: 52, color: theme.colors.text, fontSize: 15 }, clear: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, clearText: { color: theme.colors.muted, fontSize: 27 }, prompt: { marginTop: 13, color: theme.colors.muted, lineHeight: 20 } });
