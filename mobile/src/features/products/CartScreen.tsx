import { useState } from "react";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { QuantityControl } from "@/components/QuantityControl";
import { selectCartSubtotal, useCartStore } from "@/store/cartStore";
import type { CartItem } from "@/types/domain";
import { theme } from "@/theme";
import { formatINR, formatQuantity } from "@/utils/format";
import { FALLBACK_IMAGE, IMAGE_BLURHASH, resolveImageUrl } from "@/utils/images";

function CartLine({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  return (
    <View style={styles.item}>
      <Image
        source={resolveImageUrl(item.imageUrl, 240) || FALLBACK_IMAGE}
        placeholder={{ blurhash: IMAGE_BLURHASH }}
        cachePolicy="memory-disk"
        contentFit="cover"
        accessibilityLabel={item.name}
        style={styles.image}
      />
      <View style={styles.itemBody}>
        <View style={styles.itemTop}>
          <View style={styles.itemCopy}>
            <Text numberOfLines={2} style={styles.name}>
              {item.name}
            </Text>
            <Text style={styles.price}>
              {formatINR(item.price)} <Text style={styles.unitText}>/ {item.unit}</Text>
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.name}`}
            hitSlop={8}
            onPress={() => removeItem(item.productId)}
            style={({ pressed }) => [styles.removeButton, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.removeIcon}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.itemBottom}>
          <QuantityControl
            value={item.quantity}
            unit={item.unit}
            maxStock={item.maxStock}
            onChange={(quantity) => updateQuantity(item.productId, quantity)}
          />
          <View style={styles.totalBlock}>
            <Text style={styles.lineLabel}>Total ({formatQuantity(item.quantity, item.unit)})</Text>
            <Text style={styles.lineTotal}>{formatINR(item.price * item.quantity)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore(selectCartSubtotal);
  const clearCart = useCartStore((state) => state.clearCart);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!items.length) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyGlyph}>🛒</Text>
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyBody}>
            Explore our genuine construction materials and build your order with ease.
          </Text>
          <Link href="/(tabs)/products" asChild>
            <Pressable style={({ pressed }) => [styles.browse, pressed && styles.pressed]}>
              <Text style={styles.browseText}>Browse Catalogue →</Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.productId)}
        renderItem={({ item }) => <CartLine item={item} />}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Your Cart</Text>
              <Text style={styles.subtitle}>
                {items.length} item{items.length === 1 ? "" : "s"} selected
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirmClear(true)}
              style={({ pressed }) => [styles.clear, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.clearText}>Clear All</Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={
          <View style={styles.summary}>
            <Text style={styles.summaryHeading}>Order Summary</Text>
            <View style={styles.summaryDivider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.total}>{formatINR(subtotal)}</Text>
            </View>

            <View style={styles.noticeBox}>
              <Text style={styles.noticeIcon}>ℹ️</Text>
              <Text style={styles.warning}>
                Final pricing and live stock are verified on server during checkout.
              </Text>
            </View>

            <Link href="/checkout" asChild>
              <Pressable style={({ pressed }) => [styles.checkout, pressed && styles.pressed]}>
                <Text style={styles.checkoutText}>Proceed to Checkout →</Text>
              </Pressable>
            </Link>
            <Link href="/(tabs)/products" asChild>
              <Pressable style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}>
                <Text style={styles.continueText}>+ Add More Materials</Text>
              </Pressable>
            </Link>
          </View>
        }
      />

      <Modal visible={confirmClear} transparent animationType="fade" onRequestClose={() => setConfirmClear(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Clear cart?</Text>
            <Text style={styles.dialogBody}>This will remove all items currently in your cart.</Text>
            <View style={styles.dialogActions}>
              <Pressable onPress={() => setConfirmClear(false)} style={styles.cancel}>
                <Text style={styles.cancelText}>Keep Items</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  clearCart();
                  setConfirmClear(false);
                }}
                style={styles.confirm}
              >
                <Text style={styles.confirmText}>Yes, Clear</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.muted,
  },
  clear: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },
  clearText: {
    color: theme.colors.danger,
    fontWeight: "800",
    fontSize: 11.5,
  },
  item: {
    marginBottom: 12,
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    ...theme.shadow,
    shadowOpacity: 0.05,
    elevation: 2,
  },
  image: {
    width: 76,
    height: 90,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
  },
  itemBody: {
    flex: 1,
    justifyContent: "space-between",
  },
  itemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  itemCopy: {
    flex: 1,
  },
  name: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: 14,
    lineHeight: 19,
  },
  price: {
    marginTop: 4,
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
  },
  unitText: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: "500",
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  removeIcon: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "900",
  },
  itemBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  totalBlock: {
    alignItems: "flex-end",
  },
  lineLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: "600",
  },
  lineTotal: {
    marginTop: 2,
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 15,
  },
  summary: {
    marginTop: 10,
    padding: 18,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...theme.shadow,
    elevation: 3,
  },
  summaryHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  total: {
    fontSize: 22,
    fontWeight: "900",
    color: theme.colors.primaryDark,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 14,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  noticeIcon: {
    fontSize: 13,
  },
  warning: {
    flex: 1,
    color: theme.colors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  checkout: {
    minHeight: 50,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    ...theme.shadow,
    elevation: 2,
  },
  checkoutText: {
    color: "white",
    fontSize: 15,
    fontWeight: "900",
  },
  continueButton: {
    minHeight: 46,
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
    borderRadius: 14,
    backgroundColor: "#F0FDFA",
  },
  continueText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyIcon: {
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    backgroundColor: "#F0FDFA",
    borderWidth: 2,
    borderColor: "#CCFBF1",
  },
  emptyGlyph: {
    fontSize: 40,
  },
  emptyTitle: {
    marginTop: 22,
    fontSize: 22,
    fontWeight: "900",
    color: theme.colors.text,
  },
  emptyBody: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.muted,
    maxWidth: 280,
  },
  browse: {
    minHeight: 48,
    marginTop: 22,
    justifyContent: "center",
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    ...theme.shadow,
  },
  browseText: {
    color: "white",
    fontWeight: "900",
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(15,23,42,0.5)",
  },
  dialog: {
    width: "100%",
    maxWidth: 340,
    padding: 22,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
  },
  dialogTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: theme.colors.text,
  },
  dialogBody: {
    marginTop: 8,
    lineHeight: 20,
    color: theme.colors.muted,
    fontSize: 13,
  },
  dialogActions: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancel: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cancelText: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: 13,
  },
  confirm: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.danger,
  },
  confirmText: {
    color: "white",
    fontWeight: "800",
    fontSize: 13,
  },
});
