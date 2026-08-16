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
  return <View style={styles.summaryCard}>
    <View style={styles.summaryTop}><View><Text style={styles.orderNumber}>{order.orderNumber}</Text><Text style={styles.date}>{formatDate(order.createdAt)}</Text></View><OrderStatusBadge status={order.status} /></View>
    {itemSummary ? <Text numberOfLines={2} style={styles.items}>{itemSummary}{order.items.length > 2 ? ` +${order.items.length - 2} more` : ""}</Text> : null}
    <View style={styles.summaryBottom}><Text style={styles.total}>{formatINR(order.total)}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${expanded ? "Hide details for" : "View and track"} order ${order.orderNumber}`} disabled={pending} onPress={onView} style={styles.viewButton}><Text style={styles.viewText}>{pending ? "Loading…" : expanded ? "Hide details" : "View Order →"}</Text></Pressable></View>
    {expanded ? children : null}
  </View>;
}

export default function TrackOrderScreen() {
  const confirmed = useOrderFlowStore((state) => state.confirmedOrder);
  const savedMobile = useOrderFlowStore((state) => state.trackingMobile);
  const [mode, setMode] = useState<TrackMode>("mobile");
  const [orderNumber, setOrderNumber] = useState(confirmed?.orderNumber ?? "");
  const [mobile, setMobile] = useState(savedMobile);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ orderNumber?: string; mobile?: string }>({});
  const lookup = useTrackOrder();
  const history = useTrackOrdersByMobile();

  const resetResults = () => { setSelectedOrder(null); lookup.reset(); history.reset(); setErrors({}); };
  const chooseMode = (next: TrackMode) => { setMode(next); resetResults(); };
  const normalizedMobile = () => normalizeIndianMobile(mobile);
  const findOrders = () => {
    const normalized = normalizedMobile();
    const next = { mobile: normalized ? undefined : "Enter a valid 10-digit mobile number." };
    setErrors(next);
    if (next.mobile || history.isPending) return;
    Keyboard.dismiss();
    history.mutate({ mobile: normalized! });
  };
  const track = () => {
    const normalized = normalizedMobile();
    const next = { orderNumber: orderNumber.trim().length < 3 ? "Enter a valid order number." : undefined, mobile: normalized ? undefined : "Enter a valid 10-digit mobile number." };
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
  return <Screen title="Track Order" subtitle={mode === "mobile" ? "Find your recent orders using your mobile number." : "Track one order using its ID and customer mobile."}>
    <View accessibilityRole="tablist" style={styles.segment}>
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: mode === "mobile" }} onPress={() => chooseMode("mobile")} style={[styles.segmentButton, mode === "mobile" && styles.segmentActive]}><Text style={[styles.segmentText, mode === "mobile" && styles.segmentTextActive]}>Mobile Number</Text></Pressable>
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: mode === "order" }} onPress={() => chooseMode("order")} style={[styles.segmentButton, mode === "order" && styles.segmentActive]}><Text style={[styles.segmentText, mode === "order" && styles.segmentTextActive]}>Order ID</Text></Pressable>
    </View>
    <View style={styles.card}>
      {mode === "order" ? <><Text style={styles.label}>Order number</Text><TextInput accessibilityLabel="Order number" value={orderNumber} onChangeText={(value) => { setOrderNumber(value); resetResults(); }} autoCapitalize="characters" autoCorrect={false} returnKeyType="next" placeholder="Example: MSC-12345" placeholderTextColor={theme.colors.muted} style={styles.input} />{errors.orderNumber ? <Text style={styles.fieldError}>{errors.orderNumber}</Text> : null}</> : <Text style={styles.cardTitle}>Track your orders</Text>}
      <Text style={styles.label}>Mobile number</Text><TextInput accessibilityLabel="Customer mobile" value={mobile} onChangeText={(value) => { setMobile(value); resetResults(); }} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" returnKeyType="done" onSubmitEditing={mode === "mobile" ? findOrders : track} placeholder="10-digit mobile number" placeholderTextColor={theme.colors.muted} style={styles.input} />{errors.mobile ? <Text style={styles.fieldError}>{errors.mobile}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={mode === "mobile" ? "Find My Orders" : "Track Order"} accessibilityState={{ disabled: pending, busy: pending }} disabled={pending} onPress={mode === "mobile" ? findOrders : track} style={[styles.button, pending && styles.disabled]}>{pending && !lookup.data && !history.data ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{mode === "mobile" ? "Find My Orders" : "Track Order"}</Text>}</Pressable>
    </View>
    {(lookup.error || history.error) ? <View accessibilityLiveRegion="polite" style={styles.error}><Text style={styles.errorText}>{trackingErrorMessage(lookup.error || history.error)}</Text></View> : null}
    {mode === "mobile" && history.data ? <View style={styles.results}><Text style={styles.resultsTitle}>Your Orders</Text>{history.data.orders.length ? history.data.orders.map((order) => { const expanded = selectedOrder === order.orderNumber; const detail = expanded && lookup.data?.order.orderNumber === order.orderNumber ? <OrderTrackingCard order={lookup.data.order} /> : null; return <SummaryCard key={order.orderNumber} order={order} pending={expanded && lookup.isPending} expanded={expanded} onView={() => viewOrder(order.orderNumber)}>{detail}</SummaryCard>; }) : <Text style={styles.empty}>We couldn't find any orders for this mobile number.</Text>}</View> : null}
    {mode === "order" && lookup.data ? <OrderTrackingCard order={lookup.data.order} /> : null}
  </Screen>;
}

const styles = StyleSheet.create({ segment: { flexDirection: "row", padding: 4, borderRadius: 14, backgroundColor: "#E2E8F0" }, segmentButton: { minHeight: 44, flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 11 }, segmentActive: { backgroundColor: theme.colors.surface, ...theme.shadow }, segmentText: { fontSize: 13, fontWeight: "700", color: theme.colors.muted }, segmentTextActive: { color: theme.colors.primaryDark }, card: { marginTop: 14, padding: 16, borderRadius: 16, backgroundColor: theme.colors.surface, ...theme.shadow }, cardTitle: { fontSize: 18, fontWeight: "900", color: theme.colors.text }, label: { marginTop: 10, marginBottom: 6, fontWeight: "700", color: theme.colors.text }, input: { minHeight: 50, paddingHorizontal: 14, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, backgroundColor: theme.colors.background, color: theme.colors.text }, fieldError: { marginTop: 5, color: theme.colors.danger }, button: { minHeight: 52, marginTop: 18, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: theme.colors.primary }, disabled: { opacity: .6 }, buttonText: { color: "white", fontWeight: "800" }, error: { marginTop: 16, padding: 14, borderRadius: 10, backgroundColor: "#FEF2F2" }, errorText: { color: theme.colors.danger }, results: { marginTop: 22 }, resultsTitle: { marginBottom: 10, fontSize: 20, fontWeight: "900", color: theme.colors.text }, summaryCard: { marginBottom: 12, padding: 15, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, backgroundColor: theme.colors.surface }, summaryTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }, orderNumber: { fontSize: 17, fontWeight: "900", color: theme.colors.text }, date: { marginTop: 3, fontSize: 12, color: theme.colors.muted }, items: { marginTop: 12, lineHeight: 19, color: theme.colors.muted }, summaryBottom: { marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, total: { fontSize: 18, fontWeight: "900", color: theme.colors.primaryDark }, viewButton: { minHeight: 42, justifyContent: "center", paddingHorizontal: 14, borderRadius: 10, backgroundColor: "#ECFDF5" }, viewText: { color: theme.colors.primaryDark, fontWeight: "800" }, empty: { padding: 18, textAlign: "center", lineHeight: 21, borderRadius: 14, backgroundColor: theme.colors.surface, color: theme.colors.muted } });
