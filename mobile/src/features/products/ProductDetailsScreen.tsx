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
import { validateQuantityInput } from "@/utils/quantity";

export default function ProductDetailsScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const query = useProduct(productId);
  const product = query.product;
  const cart = useAddToCartFeedback();
  const existingQuantity = useCartStore((state) => state.items.find((item) => item.productId === productId)?.quantity || 0);
  const [quantityText, setQuantityText] = useState("");
  useEffect(() => { setQuantityText(""); }, [product?.id]);

  if (!Number.isInteger(productId) || productId <= 0 || query.notFound) return <View style={styles.center}><Text style={styles.errorTitle}>Product not found.</Text><Text style={styles.errorBody}>It may have been removed or is no longer available.</Text><Link href="/(tabs)/products" asChild><Pressable style={styles.retry}><Text style={styles.retryText}>Browse products</Text></Pressable></Link></View>;
  if (query.isPending && !product) return <ProductDetailsSkeleton />;
  if (query.isError && !product) return <View style={styles.center}><Text style={styles.errorTitle}>Couldn't load this product.</Text><Pressable onPress={() => void query.refetch()} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable></View>;
  if (!product) return null;
  const outOfStock = product.stock <= 0;
  const validation = validateQuantityInput(quantityText, product.unit, product.stock);
  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
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
          {product.category ? (
            <Link
              href={{ pathname: "/category/[slug]", params: { slug: product.category.slug } }}
              style={styles.category}
            >
              {product.category.name}
            </Link>
          ) : null}
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>
            {formatINR(product.price)} <Text style={styles.unit}>/ {product.unit}</Text>
          </Text>
          <View style={[styles.stock, outOfStock && styles.stockOut]}>
            <Text style={[styles.stockText, outOfStock && styles.stockOutText]}>
              {outOfStock ? "Out of Stock" : "In Stock"}
            </Text>
          </View>
          {product.description ? (
            <View style={styles.descriptionBlock}>
              <Text style={styles.sectionTitle}>Product details</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          ) : null}
          <View style={styles.trust}>
            <Text style={styles.trustTitle}>Server-verified ordering</Text>
            <Text style={styles.trustText}>
              Current price, stock and final subtotal are checked again when your order is placed.
            </Text>
          </View>
          {existingQuantity > 0 ? (
            <Text style={styles.inCart}>{existingQuantity} {product.unit} already in your cart</Text>
          ) : null}
        </View>
      </ScrollView>
      <View style={styles.actionBar}>
        <ProductQuantityInput
          value={quantityText}
          unit={product.unit}
          maxStock={product.stock}
          onChange={setQuantityText}
        />
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${quantityText || "selected quantity"} ${product.unit} of ${product.name} to cart`}
            disabled={outOfStock || validation.quantity === null}
            onPress={() => {
              if (validation.quantity !== null) {
                cart.addProduct(product, validation.quantity);
                setQuantityText("");
              }
            }}
            style={({ pressed }) => [
              styles.add,
              (outOfStock || validation.quantity === null) && styles.disabled,
              pressed && validation.quantity !== null && styles.pressed,
            ]}
          >
            <Text style={styles.addText}>{outOfStock ? "Out of Stock" : "Add to Cart"}</Text>
          </Pressable>
          <Link href="/(tabs)/cart" asChild>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.cart, pressed && styles.pressed]}
            >
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
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 14, paddingBottom: 190 },
  info: { paddingHorizontal: 4, paddingTop: 12 },
  category: { color: theme.colors.primary, fontWeight: "700", fontSize: 13 },
  name: { marginTop: 6, fontSize: 24, lineHeight: 30, fontWeight: "900", color: theme.colors.text },
  price: { marginTop: 8, fontSize: 22, fontWeight: "900", color: theme.colors.primaryDark },
  unit: { fontSize: 14, color: theme.colors.muted, fontWeight: "600" },
  stock: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  stockOut: { backgroundColor: "#FEE2E2", borderColor: "#FECACA" },
  stockText: { color: "#15803D", fontSize: 11, fontWeight: "800" },
  stockOutText: { color: "#DC2626" },
  descriptionBlock: { marginTop: 22 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: theme.colors.text },
  description: { marginTop: 8, color: theme.colors.muted, fontSize: 14, lineHeight: 22 },
  trust: {
    marginTop: 20,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F0FDFA",
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
  },
  trustTitle: { color: theme.colors.primaryDark, fontWeight: "800", fontSize: 13.5 },
  trustText: { marginTop: 4, color: theme.colors.muted, lineHeight: 18, fontSize: 12 },
  inCart: { marginTop: 12, color: theme.colors.primary, fontWeight: "700", fontSize: 12.5 },
  actionBar: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    ...theme.shadow,
    elevation: 8,
  },
  actionRow: { marginTop: 8, flexDirection: "row", gap: 10 },
  add: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
  },
  disabled: { opacity: 0.45, backgroundColor: "#94A3B8" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  addText: { color: "white", fontSize: 14, fontWeight: "900" },
  cart: {
    minWidth: 64,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
    borderRadius: 14,
    backgroundColor: "#F0FDFA",
  },
  cartText: { color: theme.colors.primaryDark, fontSize: 13.5, fontWeight: "800" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: theme.colors.background,
  },
  errorTitle: { fontSize: 20, fontWeight: "900", color: theme.colors.text },
  errorBody: { marginTop: 8, textAlign: "center", color: theme.colors.muted, fontSize: 13 },
  retry: {
    minHeight: 46,
    marginTop: 18,
    justifyContent: "center",
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  retryText: { color: "white", fontWeight: "800" },
});
