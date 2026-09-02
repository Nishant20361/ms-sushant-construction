import { useEffect, useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProductQuantityInput } from "@/components/ProductQuantityInput";
import { CartToast } from "./components/CartToast";
import { ProductDetailsSkeleton } from "./components/ProductDetailsSkeleton";
import { ProductImageGallery } from "./components/ProductImageGallery";
import { useAddToCartFeedback } from "./hooks/useAddToCartFeedback";
import { useProduct } from "./hooks/useProduct";
import { useCartStore } from "@/store/cartStore";
import { theme } from "@/theme";
import { formatINR } from "@/utils/format";
import { isWholeNumberUnit, validateQuantityInput } from "@/utils/quantity";

export default function ProductDetailsScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const query = useProduct(productId);
  const product = query.product;
  const cart = useAddToCartFeedback();
  const existingQuantity = useCartStore((state) => state.items.find((item) => item.productId === productId)?.quantity || 0);
  const [quantityText, setQuantityText] = useState("");

  useEffect(() => {
    setQuantityText("");
  }, [product?.id]);

  if (!Number.isInteger(productId) || productId <= 0 || query.notFound) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorGlyph}>🔍</Text>
        <Text style={styles.errorTitle}>Product not found</Text>
        <Text style={styles.errorBody}>It may have been removed or is no longer listed in catalogue.</Text>
        <Link href="/(tabs)/products" asChild>
          <Pressable style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
            <Text style={styles.retryText}>Browse Catalogue →</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  if (query.isPending && !product) return <ProductDetailsSkeleton />;
  if (query.isError && !product) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorGlyph}>⚠️</Text>
        <Text style={styles.errorTitle}>Couldn't load product</Text>
        <Pressable onPress={() => void query.refetch()} style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
  if (!product) return null;

  const outOfStock = product.stock <= 0;
  const validation = validateQuantityInput(quantityText, product.unit, product.stock);

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            colors={[theme.colors.primary]}
          />
        }
      >
        <ProductImageGallery product={product} />

        <View style={styles.info}>
          {/* Category Chip */}
          {product.category ? (
            <Link
              href={{ pathname: "/category/[slug]", params: { slug: product.category.slug } }}
              asChild
            >
              <Pressable style={styles.categoryChip}>
                <Text style={styles.categoryText}>{product.category.name}</Text>
              </Pressable>
            </Link>
          ) : null}

          {/* Product Name */}
          <Text style={styles.name}>{product.name}</Text>

          {/* Price & Stock Row */}
          <View style={styles.priceStockRow}>
            <View style={styles.priceBlock}>
              <Text style={styles.price}>{formatINR(product.price)}</Text>
              <Text style={styles.unit}>/ {product.unit}</Text>
            </View>

            <View style={[styles.stockBadge, outOfStock && styles.stockOutBadge]}>
              <View style={[styles.stockDot, outOfStock && styles.stockOutDot]} />
              <Text style={[styles.stockText, outOfStock && styles.stockOutText]}>
                {outOfStock ? "Out of Stock" : "In Stock"}
              </Text>
            </View>
          </View>

          {/* Description Block */}
          {product.description ? (
            <View style={styles.descriptionCard}>
              <Text style={styles.sectionTitle}>Product Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          ) : null}

          {/* Features Highlights */}
          <View style={styles.featuresCard}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <View style={styles.featureCopy}>
                <Text style={styles.featureTitle}>100% Genuine Materials</Text>
                <Text style={styles.featureSubtitle}>Directly sourced from verified manufacturers</Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🚚</Text>
              <View style={styles.featureCopy}>
                <Text style={styles.featureTitle}>Site Delivery Available</Text>
                <Text style={styles.featureSubtitle}>Fast dispatch across local regions</Text>
              </View>
            </View>
          </View>

          {/* Verification Notice */}
          <View style={styles.trustBox}>
            <Text style={styles.trustIcon}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.trustTitle}>Server-Verified Order</Text>
              <Text style={styles.trustText}>
                Stock availability and final subtotal will be confirmed live when you place your order.
              </Text>
            </View>
          </View>

          {existingQuantity > 0 ? (
            <View style={styles.inCartPill}>
              <Text style={styles.inCart}>
                ✓ {existingQuantity} {product.unit} already in your cart
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Floating Action Bar */}
      <View style={styles.actionBar}>
        <ProductQuantityInput
          value={quantityText}
          unit={product.unit}
          maxStock={product.stock}
          onChange={setQuantityText}
        />
        <View style={styles.actionRow}>
          {(() => {
            const defaultQty = isWholeNumberUnit(product.unit) ? 1 : 0.5;
            const effectiveQty = quantityText.trim() === "" ? Math.min(defaultQty, product.stock) : validation.quantity;
            const isInvalid = quantityText.trim() !== "" && validation.quantity === null;
            const canAdd = !outOfStock && !isInvalid && effectiveQty !== null && effectiveQty > 0;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add ${quantityText || "selected quantity"} ${product.unit} of ${product.name} to cart`}
                disabled={!canAdd}
                onPress={() => {
                  if (effectiveQty !== null && effectiveQty > 0) {
                    cart.addProduct(product, effectiveQty);
                    setQuantityText("");
                  }
                }}
                style={({ pressed }) => [
                  styles.add,
                  !canAdd && styles.disabled,
                  pressed && canAdd && styles.pressed,
                ]}
              >
                <Text style={styles.addText}>
                  {outOfStock ? "Out of Stock" : "🛒  Add to Cart"}
                </Text>
              </Pressable>
            );
          })()}

          <Link href="/(tabs)/cart" asChild>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.cartButton, pressed && styles.pressed]}
            >
              <Text style={styles.cartIcon}>🛒</Text>
              <Text style={styles.cartText}>Cart</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <CartToast message={cart.message} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 210,
  },
  info: {
    paddingTop: 14,
    gap: 12,
  },
  categoryChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  categoryText: {
    color: theme.colors.primary,
    fontWeight: "800",
    fontSize: 12,
  },
  name: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  priceStockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  priceBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  price: {
    fontSize: 24,
    fontWeight: "900",
    color: theme.colors.primaryDark,
  },
  unit: {
    fontSize: 14,
    color: theme.colors.muted,
    fontWeight: "600",
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  stockOutBadge: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#15803D",
  },
  stockOutDot: {
    backgroundColor: "#DC2626",
  },
  stockText: {
    color: "#15803D",
    fontSize: 11,
    fontWeight: "800",
  },
  stockOutText: {
    color: "#DC2626",
  },
  descriptionCard: {
    marginTop: 6,
    padding: 16,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...theme.shadow,
    shadowOpacity: 0.04,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.text,
  },
  description: {
    marginTop: 8,
    color: "#475569",
    fontSize: 13.5,
    lineHeight: 21,
  },
  featuresCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    fontSize: 18,
    color: theme.colors.primary,
  },
  featureCopy: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.text,
  },
  featureSubtitle: {
    marginTop: 2,
    fontSize: 11.5,
    color: theme.colors.muted,
  },
  trustBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F0FDFA",
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
  },
  trustIcon: {
    fontSize: 16,
  },
  trustTitle: {
    color: theme.colors.primaryDark,
    fontWeight: "800",
    fontSize: 13,
  },
  trustText: {
    marginTop: 3,
    color: theme.colors.muted,
    lineHeight: 17,
    fontSize: 11.5,
  },
  inCartPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  inCart: {
    color: "#1D4ED8",
    fontWeight: "700",
    fontSize: 12,
  },
  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: theme.colors.surface,
    ...theme.shadow,
    shadowOpacity: 0.1,
    elevation: 12,
  },
  actionRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 10,
  },
  add: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    ...theme.shadow,
    elevation: 2,
  },
  disabled: {
    opacity: 0.45,
    backgroundColor: "#94A3B8",
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  addText: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
  },
  cartButton: {
    minWidth: 70,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
    borderRadius: 14,
    backgroundColor: "#F0FDFA",
  },
  cartIcon: {
    fontSize: 14,
  },
  cartText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: theme.colors.background,
  },
  errorGlyph: {
    fontSize: 44,
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "900",
    color: theme.colors.text,
  },
  errorBody: {
    marginTop: 8,
    textAlign: "center",
    color: theme.colors.muted,
    fontSize: 13,
  },
  retry: {
    minHeight: 46,
    marginTop: 18,
    justifyContent: "center",
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
  },
  retryText: {
    color: "white",
    fontWeight: "800",
    fontSize: 13,
  },
});
