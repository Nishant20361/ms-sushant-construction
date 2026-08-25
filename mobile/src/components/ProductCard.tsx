import { Image } from "expo-image";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { memo, useCallback, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import type { Product } from "@/types/domain";
import { theme } from "@/theme";
import { formatINR } from "@/utils/format";
import { FALLBACK_IMAGE, IMAGE_BLURHASH, resolveImageUrl } from "@/utils/images";
import { publicApi } from "@/services/publicApi";
import { queryKeys } from "@/services/queryKeys";
import { ProductQuantityInput } from "@/components/ProductQuantityInput";
import { validateQuantityInput } from "@/utils/quantity";

function ProductCardComponent({ product, onAdd, style }: { product: Product; onAdd?: (quantity: number) => void; style?: StyleProp<ViewStyle> }) {
  const [quantityText, setQuantityText] = useState("");
  const validation = validateQuantityInput(quantityText, product.unit, product.stock);
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
    {onAdd ? <><ProductQuantityInput value={quantityText} unit={product.unit} maxStock={product.stock} onChange={setQuantityText} /><Pressable accessibilityRole="button" accessibilityLabel={`Add ${product.name} to cart`} disabled={product.stock <= 0 || validation.quantity === null} style={({ pressed }) => [styles.add, (product.stock <= 0 || validation.quantity === null) && styles.disabled, pressed && validation.quantity !== null && styles.addPressed]} onPress={() => { if (validation.quantity !== null) { onAdd(validation.quantity); setQuantityText(""); } }}><Text style={styles.addText}>{product.stock > 0 ? "Add to cart" : "Out of stock"}</Text></Pressable></> : null}
  </View>;
}
export const ProductCard = memo(ProductCardComponent);
const styles = StyleSheet.create({
  card: {
    width: "48%",
    minWidth: 140,
    padding: 11,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    ...theme.shadow,
    elevation: 2,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  image: {
    width: "100%",
    aspectRatio: 1.15,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
  },
  stockBadge: {
    position: "absolute",
    left: 8,
    top: 8,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  outBadge: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },
  stockText: {
    color: "#15803D",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  outText: {
    color: "#DC2626",
  },
  name: {
    minHeight: 38,
    marginTop: 10,
    color: theme.colors.text,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "700",
  },
  price: {
    marginTop: 4,
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: "800",
  },
  add: {
    minHeight: 42,
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  addPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.45,
    backgroundColor: "#94A3B8",
  },
  addText: {
    color: "white",
    fontSize: 12.5,
    fontWeight: "800",
  },
});
