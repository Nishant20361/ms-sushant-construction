import { useState, type ReactNode } from "react";
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { useTrackOrder, useTrackOrdersByMobile, trackingErrorMessage } from "./hooks/useTrackOrder";
import { OrderTrackingCard } from "./components/OrderTrackingCard";
import { OrderStatusBadge } from "./components/OrderStatusBadge";
import { useOrderFlowStore } from "@/store/orderFlowStore";
import { theme } from "@/theme";
import { normalizeIndianMobile } from "@/utils/customerValidation";
import { formatDate, formatINR, formatQuantity } from "@/utils/format";
import type { TrackedOrderSummary } from "@/types/domain";

type TrackMode = "mobile" | "order";

function SummaryCard({ order, pending, expanded, onView, children }: { order: TrackedOrderSummary; pending: boolean; expanded: boolean; onView(): void; children?: ReactNode }) {
  const itemSummary = order.items.slice(0, 2).map((item) => `${item.productName} (${formatQuantity(item.quantity, item.unit)})`).join(", ");

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <View>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
        </View>
        <OrderStatusBadge status={order.status} />
      </View>

      {itemSummary ? (
        <Text numberOfLines={2} style={styles.items}>
          📦 {itemSummary}
          {order.items.length > 2 ? ` +${order.items.length - 2} more` : ""}
        </Text>
      ) : null}

      <View style={styles.summaryBottom}>
        <View>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.total}>{formatINR(order.total)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${expanded ? "Hide details for" : "View and track"} order ${order.orderNumber}`}
          disabled={pending}
          onPress={onView}
          style={({ pressed }) => [styles.viewButton, pressed && styles.pressed]}
        >
          <Text style={styles.viewText}>
            {pending ? "Loading…" : expanded ? "Hide Details ↑" : "View Details →"}
          </Text>
        </Pressable>
      </View>

      {expanded ? children : null}
    </View>
  );
}

export default function TrackOrderScreen() {
  const confirmed = useOrderFlowStore((state) => state.confirmedOrder);
  const savedMobile = useOrderFlowStore((state) => state.trackingMobile);
  const [mode, setMode] = useState<TrackMode>("order");
  const [orderNumber, setOrderNumber] = useState(confirmed?.orderNumber ?? "");
  const [mobile, setMobile] = useState(savedMobile);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ orderNumber?: string; mobile?: string }>({});
  const lookup = useTrackOrder();
  const history = useTrackOrdersByMobile();

  const resetResults = () => {
    setSelectedOrder(null);
    lookup.reset();
    history.reset();
    setErrors({});
  };

  const chooseMode = (next: TrackMode) => {
    setMode(next);
    resetResults();
  };

  const normalizedMobile = () => normalizeIndianMobile(mobile);

  const findOrders = () => {
    const normalized = normalizedMobile();
    const next = { mobile: normalized ? undefined : "Enter a valid 10-digit mobile number.", orderNumber: orderNumber.trim() ? undefined : "Enter an order number from your receipt." };
    setErrors(next);
    if (next.mobile || next.orderNumber || history.isPending) return;
    Keyboard.dismiss();
    history.mutate({ mobile: normalized!, orderNumber: orderNumber.trim() });
  };

  const track = () => {
    const normalized = normalizedMobile();
    const next = {
      orderNumber: orderNumber.trim().length < 3 ? "Enter a valid order number." : undefined,
      mobile: normalized ? undefined : "Enter a valid 10-digit mobile number.",
    };
    setErrors(next);
    if (next.orderNumber || next.mobile || lookup.isPending) return;
    Keyboard.dismiss();
    lookup.mutate({ orderNumber: orderNumber.trim(), mobile: normalized! });
  };

  const viewOrder = (selectedOrderNumber: string) => {
    const normalized = normalizedMobile();
    if (!normalized || lookup.isPending) return;
    if (selectedOrder === selectedOrderNumber) {
      setSelectedOrder(null);
      lookup.reset();
      return;
    }
    setSelectedOrder(selectedOrderNumber);
    lookup.reset();
    lookup.mutate({ orderNumber: selectedOrderNumber, mobile: normalized });
  };

  const pending = lookup.isPending || history.isPending;

  return (
    <Screen
      title="Track Order"
      subtitle={
        mode === "mobile"
          ? "Verify your history with an order number and your mobile number."
          : "Track single order with order number and mobile."
      }
    >
      {/* Segment Switcher */}
      <View accessibilityRole="tablist" style={styles.segment}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "mobile" }}
          onPress={() => chooseMode("mobile")}
          style={[styles.segmentButton, mode === "mobile" && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, mode === "mobile" && styles.segmentTextActive]}>
            📱 Order History
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "order" }}
          onPress={() => chooseMode("order")}
          style={[styles.segmentButton, mode === "order" && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, mode === "order" && styles.segmentTextActive]}>
            🧾 Order ID
          </Text>
        </Pressable>
      </View>

      {/* Input Card */}
      <View style={styles.card}>
        {(
          <>
            <Text style={styles.label}>Order Number</Text>
            <TextInput
              accessibilityLabel="Order number"
              value={orderNumber}
              onChangeText={(value) => {
                setOrderNumber(value);
                resetResults();
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="next"
              placeholder="e.g. MSC-12345"
              placeholderTextColor={theme.colors.muted}
              style={styles.input}
            />
            {errors.orderNumber ? <Text style={styles.fieldError}>{errors.orderNumber}</Text> : null}
          </>
        )}

        <Text style={styles.label}>Customer Mobile</Text>
        <TextInput
          accessibilityLabel="Customer mobile"
          value={mobile}
          onChangeText={(value) => {
            setMobile(value);
            resetResults();
          }}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          returnKeyType="done"
          onSubmitEditing={mode === "mobile" ? findOrders : track}
          placeholder="10-digit mobile number"
          placeholderTextColor={theme.colors.muted}
          style={styles.input}
        />
        {errors.mobile ? <Text style={styles.fieldError}>{errors.mobile}</Text> : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={mode === "mobile" ? "Find My Orders" : "Track Order"}
          accessibilityState={{ disabled: pending, busy: pending }}
          disabled={pending}
          onPress={mode === "mobile" ? findOrders : track}
          style={({ pressed }) => [
            styles.button,
            pending && styles.disabled,
            pressed && !pending && styles.pressed,
          ]}
        >
          {pending && !lookup.data && !history.data ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>
              {mode === "mobile" ? "🔍  Find My Orders" : "🚚  Track Order"}
            </Text>
          )}
        </Pressable>
      </View>

      {/* Error Message */}
      {lookup.error || history.error ? (
        <View accessibilityLiveRegion="polite" style={styles.error}>
          <Text style={styles.errorText}>{trackingErrorMessage(lookup.error || history.error)}</Text>
        </View>
      ) : null}

      {/* Mobile Results */}
      {mode === "mobile" && history.data ? (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>
            Your Orders ({history.data.orders.length})
          </Text>
          {history.data.orders.length ? (
            history.data.orders.map((order) => {
              const expanded = selectedOrder === order.orderNumber;
              const detail =
                expanded && lookup.data?.order.orderNumber === order.orderNumber ? (
                  <OrderTrackingCard order={lookup.data.order} />
                ) : null;
              return (
                <SummaryCard
                  key={order.orderNumber}
                  order={order}
                  pending={expanded && lookup.isPending}
                  expanded={expanded}
                  onView={() => viewOrder(order.orderNumber)}
                >
                  {detail}
                </SummaryCard>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyGlyph}>📭</Text>
              <Text style={styles.emptyTitle}>No Orders Found</Text>
              <Text style={styles.empty}>We couldn't find any orders matching this mobile number.</Text>
            </View>
          )}
        </View>
      ) : null}

      {/* Single Order Detail */}
      {mode === "order" && lookup.data ? <OrderTrackingCard order={lookup.data.order} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
  },
  segmentButton: {
    minHeight: 44,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  segmentActive: {
    backgroundColor: theme.colors.surface,
    ...theme.shadow,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.muted,
  },
  segmentTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: "800",
  },
  card: {
    marginTop: 16,
    padding: 18,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...theme.shadow,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 4,
  },
  label: {
    marginTop: 12,
    marginBottom: 6,
    fontWeight: "700",
    fontSize: 13,
    color: theme.colors.text,
  },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    color: theme.colors.text,
    fontSize: 14,
  },
  fieldError: {
    marginTop: 5,
    color: theme.colors.danger,
    fontSize: 12,
    fontWeight: "600",
  },
  button: {
    minHeight: 50,
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    ...theme.shadow,
    elevation: 2,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  buttonText: {
    color: "white",
    fontWeight: "900",
    fontSize: 14,
  },
  error: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 13,
    fontWeight: "600",
  },
  results: {
    marginTop: 24,
  },
  resultsTitle: {
    marginBottom: 12,
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.text,
  },
  summaryCard: {
    marginBottom: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    ...theme.shadow,
    elevation: 2,
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
  },
  date: {
    marginTop: 2,
    fontSize: 12,
    color: theme.colors.muted,
  },
  items: {
    marginTop: 10,
    lineHeight: 18,
    fontSize: 12.5,
    color: "#475569",
  },
  summaryBottom: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  totalLabel: {
    fontSize: 10.5,
    color: theme.colors.muted,
    fontWeight: "600",
  },
  total: {
    fontSize: 17,
    fontWeight: "900",
    color: theme.colors.primaryDark,
  },
  viewButton: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  viewText: {
    color: theme.colors.primaryDark,
    fontWeight: "800",
    fontSize: 12.5,
  },
  emptyCard: {
    padding: 24,
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyGlyph: {
    fontSize: 36,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.text,
  },
  empty: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 12.5,
    color: theme.colors.muted,
  },
});
