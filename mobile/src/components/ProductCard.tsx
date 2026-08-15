import { Image } from "expo-image";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { memo, useCallback } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import type { Product } from "@/types/domain";
import { theme } from "@/theme";
import { formatINR } from "@/utils/format";
import { FALLBACK_IMAGE, IMAGE_BLURHASH, resolveImageUrl } from "@/utils/images";
import { publicApi } from "@/services/publicApi";
import { queryKeys } from "@/services/queryKeys";

function ProductCardComponent({ product, onAdd, style }: { product: Product; onAdd?: () => void; style?: StyleProp<ViewStyle> }) {
  const source = resolveImageUrl(product.imageUrl, 400) || FALLBACK_IMAGE;
  const router = useRouter();
  const queryClient = useQueryClient();
  const openProduct = useCallback(() => {
    Keyboard.dismiss();
    void queryClient.prefetchQuery({ queryKey: queryKeys.products.detail(product.id), queryFn: ({ signal }) => publicApi.getProductById(product.id, signal), staleTime: 0 });
    router.push({ pathname: "/product/[id]", params: { id: String(product.id) } });
  }, [product.id, queryClient, router]);
  return <View style={[styles.card, style]}>
      <Pressable accessibilityRole="link" accessibilityLabel={`${product.name}, ${formatINR(product.price)} per ${product.unit}`} onPress={openProduct} style={({ pressed }) => pressed && styles.pressed}>
        <Image source={source} placeholder={{ blurhash: IMAGE_BLURHASH }} cachePolicy="memory-disk" contentFit="cover" transition={150} accessibilityLabel={product.images[0]?.alt || product.name} style={styles.image} />
        <View style={[styles.stockBadge, product.stock <= 0 && styles.outBadge]}><Text style={[styles.stockText, product.stock <= 0 && styles.outText]}>{product.stock > 0 ? "In stock" : "Unavailable"}</Text></View>
        <Text numberOfLines={2} style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>{formatINR(product.price)} / {product.unit}</Text>
      </Pressable>
    {onAdd ? <Pressable accessibilityRole="button" accessibilityLabel={`Add ${product.name} to cart`} disabled={product.stock <= 0} style={({ pressed }) => [styles.add, product.stock <= 0 && styles.disabled, pressed && product.stock > 0 && styles.addPressed]} onPress={onAdd}><Text style={styles.addText}>{product.stock > 0 ? "+ Add to cart" : "Out of stock"}</Text></Pressable> : null}
  </View>;
}
export const ProductCard = memo(ProductCardComponent);
const styles = StyleSheet.create({ card: { width: "48%", minWidth: 136, padding: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 15, backgroundColor: theme.colors.surface, ...theme.shadow }, pressed: { opacity: 0.78 }, image: { width: "100%", aspectRatio: 1.18, borderRadius: 10, backgroundColor: theme.colors.border }, stockBadge: { position: "absolute", left: 7, top: 7, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, backgroundColor: "#DCFCE7" }, outBadge: { backgroundColor: "#FEE2E2" }, stockText: { color: theme.colors.success, fontSize: 9, fontWeight: "900" }, outText: { color: theme.colors.danger }, name: { minHeight: 42, marginTop: 10, color: theme.colors.text, fontSize: 13, lineHeight: 18, fontWeight: "700" }, price: { marginTop: 4, color: theme.colors.primary, fontSize: 13, fontWeight: "800" }, add: { minHeight: 44, marginTop: 10, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: theme.colors.primary }, addPressed: { opacity: 0.78 }, disabled: { opacity: 0.48 }, addText: { color: "white", fontSize: 12, fontWeight: "800" } });
