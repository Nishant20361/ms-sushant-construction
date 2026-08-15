import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge";
import { useOrderFlowStore } from "@/store/orderFlowStore";
import { theme } from "@/theme";
import { formatDate, formatINR } from "@/utils/format";

export default function OrderSuccessScreen() {
  const router = useRouter(); const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();
  const order = useOrderFlowStore((state) => state.confirmedOrder);
  const confirmed = order?.orderNumber === orderNumber ? order : undefined;
  return <Screen title="Order placed successfully" subtitle="Your order has been confirmed by our server."><View style={styles.success}><Text accessibilityLabel="Order successful" style={styles.icon}>✓</Text><Text style={styles.label}>Order number</Text><Text accessibilityLabel={`Order number ${orderNumber}`} selectable style={styles.number}>{orderNumber}</Text>{confirmed ? <><Text style={styles.name}>{confirmed.customerName}</Text><Text style={styles.total}>{formatINR(confirmed.subtotal)}</Text><OrderStatusBadge status={confirmed.status} /><Text style={styles.date}>{formatDate(confirmed.createdAt)}</Text></> : <Text style={styles.note}>Keep this number to track your order.</Text>}</View>
    <Pressable accessibilityRole="button" accessibilityLabel="Track Order" onPress={() => router.replace("/(tabs)/track")} style={styles.primary}><Text style={styles.primaryText}>Track Order</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Continue Shopping" onPress={() => router.replace("/(tabs)/products")} style={styles.secondary}><Text style={styles.secondaryText}>Continue Shopping</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Back to Home" onPress={() => router.replace("/(tabs)")} style={styles.link}><Text style={styles.secondaryText}>Back to Home</Text></Pressable>
  </Screen>;
}
const styles = StyleSheet.create({ success: { alignItems: "center", padding: 24, borderRadius: 18, backgroundColor: theme.colors.surface, ...theme.shadow }, icon: { width: 58, height: 58, textAlign: "center", lineHeight: 58, borderRadius: 29, overflow: "hidden", fontSize: 32, fontWeight: "900", color: "white", backgroundColor: theme.colors.success }, label: { marginTop: 20, color: theme.colors.muted }, number: { marginTop: 7, fontSize: 25, fontWeight: "900", letterSpacing: .5, color: theme.colors.primaryDark }, name: { marginTop: 16, fontWeight: "700", color: theme.colors.text }, total: { marginVertical: 10, fontSize: 22, fontWeight: "900", color: theme.colors.text }, date: { marginTop: 10, color: theme.colors.muted }, note: { marginTop: 14, color: theme.colors.muted }, primary: { minHeight: 52, marginTop: 22, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: theme.colors.primary }, primaryText: { color: "white", fontWeight: "800" }, secondary: { minHeight: 52, marginTop: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 12 }, secondaryText: { color: theme.colors.primary, fontWeight: "800" }, link: { minHeight: 48, alignItems: "center", justifyContent: "center" } });
