import { useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckoutItem } from "./components/CheckoutItem";
import { SubmitOrderButton } from "./components/SubmitOrderButton";
import { PlaceOrderFailure, usePlaceOrder } from "./hooks/usePlaceOrder";
import { useCartStore, selectCartSubtotal } from "@/store/cartStore";
import { useOrderFlowStore } from "@/store/orderFlowStore";
import { theme } from "@/theme";
import { formatINR } from "@/utils/format";
import { normalizeIndianMobile, validateCheckout, type CheckoutErrors } from "@/utils/customerValidation";

const initialForm = { customerName: "", customerMobile: "", deliveryAddress: "", notes: "" };
function newAttemptKey() { return `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`; }

export default function CheckoutScreen() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore(selectCartSubtotal);
  const clearCart = useCartStore((state) => state.clearCart);
  const setConfirmedOrder = useOrderFlowStore((state) => state.setConfirmedOrder);
  const mutation = usePlaceOrder();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const attempt = useRef<{ fingerprint: string; key: string } | undefined>(undefined);
  const fingerprint = useMemo(() => JSON.stringify({ form: { ...form, customerName: form.customerName.trim(), customerMobile: normalizeIndianMobile(form.customerMobile), deliveryAddress: form.deliveryAddress.trim(), notes: form.notes.trim() }, items: items.map(({ productId, quantity }) => ({ productId, quantity })).sort((a, b) => a.productId - b.productId) }), [form, items]);

  const update = (field: keyof typeof form, value: string) => { setForm((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: undefined })); mutation.reset(); };
  const submit = () => {
    if (mutation.isPending) return;
    const nextErrors = validateCheckout(form);
    if (!items.length) return;
    if (items.some((item) => item.quantity <= 0 || !Number.isFinite(item.quantity) || item.maxStock <= 0 || item.quantity > item.maxStock)) nextErrors.notes = "Review unavailable items or quantities in your cart before ordering.";
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    Keyboard.dismiss();
    if (!attempt.current || attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, key: newAttemptKey() };
    const payload = { customerName: form.customerName.trim(), customerMobile: normalizeIndianMobile(form.customerMobile)!, deliveryAddress: form.deliveryAddress.trim(), notes: form.notes.trim() || undefined, items: items.map(({ productId, quantity }) => ({ productId, quantity })) };
    mutation.mutate({ payload, idempotencyKey: attempt.current.key }, { onSuccess: ({ order }) => { setConfirmedOrder(order, payload.customerMobile); clearCart(); attempt.current = undefined; router.replace({ pathname: "/order-success", params: { orderNumber: order.orderNumber } }); } });
  };

  if (!items.length) return <SafeAreaView style={styles.safe}><View style={styles.empty}><Text style={styles.emptyIcon}>🛒</Text><Text style={styles.title}>Your cart is empty</Text><Text style={styles.muted}>Add products before starting checkout.</Text><Pressable accessibilityRole="button" onPress={() => router.replace("/(tabs)/products")} style={styles.primary}><Text style={styles.primaryText}>Browse Products</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.link}><Text style={styles.linkText}>Go Back</Text></Pressable></View></SafeAreaView>;

  const field = (key: keyof typeof form, label: string, props: object = {}) => <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} editable={!mutation.isPending} value={form[key]} onChangeText={(value) => update(key, value)} placeholderTextColor={theme.colors.muted} style={[styles.input, key === "deliveryAddress" && styles.address]} {...props} />{errors[key] ? <Text style={styles.fieldError}>{errors[key]}</Text> : null}</View>;
  const failure = mutation.error instanceof PlaceOrderFailure ? mutation.error : null;
  return <SafeAreaView edges={["bottom"]} style={styles.safe}><KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}><Text style={styles.title}>Checkout</Text><Text style={styles.muted}>Delivery details and order review. Payment is managed separately by the business.</Text>
    <View style={styles.card}><Text style={styles.heading}>Customer & delivery details</Text>{field("customerName", "Customer name", { placeholder: "Full name", autoCapitalize: "words", autoComplete: "name", textContentType: "name", returnKeyType: "next", maxLength: 120 })}{field("customerMobile", "Mobile number", { placeholder: "10-digit mobile number", keyboardType: "phone-pad", autoComplete: "tel", textContentType: "telephoneNumber", maxLength: 16 })}{field("deliveryAddress", "Delivery address (optional)", { placeholder: "House, street, area, city and PIN code", autoComplete: "street-address", textContentType: "fullStreetAddress", multiline: true, textAlignVertical: "top", maxLength: 500 })}{field("notes", "Notes (optional)", { placeholder: "Delivery instructions or other details (optional)", multiline: true, textAlignVertical: "top", maxLength: 1000 })}</View>
    <View style={styles.card}><Text style={styles.heading}>Order review</Text>{items.map((item) => <CheckoutItem key={item.productId} item={item} />)}<View style={styles.totalRow}><Text style={styles.heading}>Estimated Total</Text><Text style={styles.total}>{formatINR(subtotal)}</Text></View><Text style={styles.notice}>Prices and stock are verified by the server when you place the order. The confirmed total may reflect current prices.</Text></View>
    {failure ? <View accessibilityLiveRegion="polite" style={styles.errorBox}><Text style={styles.errorText}>{failure.message}</Text>{failure.kind === "stock" || failure.kind === "unavailable" ? <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/cart")}><Text style={styles.errorLink}>Review Cart</Text></Pressable> : null}<Pressable accessibilityRole="button" onPress={() => router.push("/about")}><Text style={styles.errorLink}>Contact us for help</Text></Pressable></View> : null}
    <SubmitOrderButton submitting={mutation.isPending} disabled={mutation.isPending} onPress={submit} />
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: 16, paddingBottom: 80 }, title: { fontSize: 28, fontWeight: "800", color: theme.colors.text }, muted: { marginTop: 6, lineHeight: 21, color: theme.colors.muted }, card: { marginTop: 20, padding: 16, borderRadius: 16, backgroundColor: theme.colors.surface, ...theme.shadow }, heading: { fontSize: 18, fontWeight: "800", color: theme.colors.text }, field: { marginTop: 15 }, label: { marginBottom: 6, fontWeight: "700", color: theme.colors.text }, input: { minHeight: 50, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, backgroundColor: theme.colors.background, color: theme.colors.text }, address: { minHeight: 96 }, fieldError: { marginTop: 5, color: theme.colors.danger }, totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 }, total: { fontSize: 20, fontWeight: "900", color: theme.colors.primaryDark }, notice: { marginTop: 12, padding: 12, lineHeight: 19, borderRadius: 10, backgroundColor: "#F0FDFA", color: theme.colors.primaryDark }, errorBox: { marginVertical: 16, padding: 14, borderRadius: 10, backgroundColor: "#FEF2F2" }, errorText: { lineHeight: 20, color: theme.colors.danger }, errorLink: { marginTop: 10, fontWeight: "800", color: theme.colors.primary }, primary: { minHeight: 52, width: "100%", marginTop: 24, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: theme.colors.primary }, primaryText: { color: "white", fontWeight: "800" }, link: { padding: 16 }, linkText: { fontWeight: "700", color: theme.colors.primary }, empty: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" }, emptyIcon: { fontSize: 48, marginBottom: 14 } });
