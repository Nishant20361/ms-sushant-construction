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

  const inStock = product.stock > 0;

  return (
    <View style={[styles.card, style]}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${product.name}, ${formatINR(product.price)} per ${product.unit}`}
        onPress={openProduct}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {/* Image with overlay badge */}
        <View style={styles.imageContainer}>
          <Image
            source={source}
            placeholder={{ blurhash: IMAGE_BLURHASH }}
            cachePolicy="memory-disk"
            contentFit="cover"
            transition={150}
            accessibilityLabel={product.images[0]?.alt || product.name}
            style={styles.image}
          />
          {/* Stock badge */}
          <View style={[styles.stockBadge, !inStock && styles.outBadge]}>
            <View style={[styles.stockDot, !inStock && styles.outDot]} />
            <Text style={[styles.stockText, !inStock && styles.outText]}>
              {inStock ? "In Stock" : "Unavailable"}
            </Text>
          </View>
        </View>

        {/* Product info */}
        <View style={styles.info}>
          <Text numberOfLines={2} style={styles.name}>
            {product.name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatINR(product.price)}</Text>
            <Text style={styles.unit}>/ {product.unit}</Text>
          </View>
        </View>
      </Pressable>

      {onAdd ? (
        <View style={styles.addSection}>
          <ProductQuantityInput
            value={quantityText}
            unit={product.unit}
            maxStock={product.stock}
            onChange={setQuantityText}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${product.name} to cart`}
            disabled={!inStock || validation.quantity === null}
            style={({ pressed }) => [
              styles.add,
              (!inStock || validation.quantity === null) && styles.disabled,
              pressed && validation.quantity !== null && styles.addPressed,
            ]}
            onPress={() => {
              if (validation.quantity !== null) {
                onAdd(validation.quantity);
                setQuantityText("");
              }
            }}
          >
            <Text style={styles.addText}>
              {inStock ? "🛒  Add to Cart" : "Out of Stock"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export const ProductCard = memo(ProductCardComponent);

const styles = StyleSheet.create({
  card: {
    width: "48%",
    minWidth: 140,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
    ...theme.shadow,
    shadowOpacity: 0.06,
    elevation: 2,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  imageContainer: {
    width: "100%",
    position: "relative",
  },
  image: {
    width: "100%",
    aspectRatio: 1.1,
    backgroundColor: "#F1F5F9",
  },
  stockBadge: {
    position: "absolute",
    left: 8,
    top: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(220, 252, 231, 0.95)",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  outBadge: {
    backgroundColor: "rgba(254, 226, 226, 0.95)",
    borderColor: "#FECACA",
  },
  stockDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#15803D",
  },
  outDot: {
    backgroundColor: "#DC2626",
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
  info: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  name: {
    minHeight: 36,
    color: theme.colors.text,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    marginTop: 4,
  },
  price: {
    color: theme.colors.primaryDark,
    fontSize: 15,
    fontWeight: "900",
  },
  unit: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  addSection: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 4,
  },
  add: {
    minHeight: 42,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: theme.colors.primary,
  },
  addPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.4,
    backgroundColor: "#94A3B8",
  },
  addText: {
    color: "white",
    fontSize: 12.5,
    fontWeight: "800",
  },
});
