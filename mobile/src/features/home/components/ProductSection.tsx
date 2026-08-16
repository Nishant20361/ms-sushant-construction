import { Pressable, StyleSheet, Text, View } from "react-native";
import { ProductCard } from "@/components/ProductCard";
import { ProductSkeleton } from "@/components/ProductSkeleton";
import { SectionHeader } from "./SectionHeader";
import type { Product } from "@/types/domain";
import { theme } from "@/theme";

export function ProductSection({ products, loading, error, onRetry, onAdd }: { products?: Product[]; loading: boolean; error: boolean; onRetry: () => void; onAdd: (product: Product, quantity: number) => void }) {
  return <View style={styles.section}><SectionHeader title="Latest products" subtitle="Recently added and currently available" actionLabel="View all" href="/(tabs)/products" />
    {loading && !products?.length ? <View style={styles.grid}>{[1, 2, 3, 4].map((key) => <ProductSkeleton key={key} />)}</View> : null}
    {error && !products?.length ? <Pressable accessibilityRole="button" onPress={onRetry} style={styles.error}><Text style={styles.errorTitle}>Products couldn’t load.</Text><Text style={styles.retry}>Tap to try again</Text></Pressable> : null}
    {!loading && !error && products?.length === 0 ? <Text style={styles.empty}>No products available right now.</Text> : null}
    {products?.length ? <View style={styles.grid}>{products.map((product) => <ProductCard key={product.id} product={product} onAdd={(quantity) => onAdd(product, quantity)} />)}</View> : null}
  </View>;
}
const styles = StyleSheet.create({ section: { marginTop: 30 }, grid: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 14 }, error: { minHeight: 82, marginTop: 14, justifyContent: "center", padding: 16, borderRadius: 14, backgroundColor: "#FEF2F2" }, errorTitle: { color: theme.colors.danger, fontWeight: "700" }, retry: { marginTop: 4, color: theme.colors.primary, fontWeight: "700" }, empty: { marginTop: 14, paddingVertical: 20, textAlign: "center", color: theme.colors.muted } });
