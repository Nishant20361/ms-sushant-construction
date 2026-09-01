import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { AppText } from "@/components/AppText";
import { Screen } from "@/components/Screen";
import {
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  FilterChip,
  IconButton,
  Input,
  LoadingState,
  StatusBadge,
} from "@/components/ui";
import { useTheme } from "@/theme";
import { formatDateTime, formatINR } from "@/utils/formatters";
import { useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/constants/queryKeys";
import { useSettings } from "../settings/useSettings";
import type { Settings } from "../settings/settingsService";
import { escapeHtml } from "../insights/pdfReports";
import { useOrderProducts, useAssistedOrder } from "./useOrders";
import { ordersService } from "./ordersService";
import type { CustomerLookupResult, Order, ProductChoice } from "./types";

type Step = "products" | "cart" | "customer" | "payment" | "success";

interface CartLineItem {
  product: ProductChoice;
  quantity: number;
}

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80";

function isWholeUnit(unit: string): boolean {
  const u = (unit || "").trim().toLowerCase();
  return u === "bag" || u === "piece" || u === "pkt" || u === "box" || u === "nos";
}

export function PlaceOrderScreen() {
  const t = useTheme();
  const settingsQ = useSettings();
  const settings = settingsQ.data;
  const [step, setStep] = useState<Step>("products");

  // Products & Search & Category Filter
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const productsQ = useOrderProducts(search);
  const allProducts = useMemo(() => productsQ.data ?? [], [productsQ.data]);

  // Extract unique categories from products
  const categories = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of allProducts) {
      if (p.categoryId && p.categoryName) {
        map.set(p.categoryId, p.categoryName);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allProducts]);

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      if (selectedCategory !== null && p.categoryId !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [allProducts, selectedCategory]);

  // Cart state
  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [localQtys, setLocalQtys] = useState<Record<number, string>>({});

  // Customer state
  const [mobile, setMobile] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<CustomerLookupResult | null>(null);

  // Bill & Payment state
  const [transportation, setTransportation] = useState("");
  const [discount, setDiscount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "ONLINE">("CASH");

  // Created Order state
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [invoiceBusy, setInvoiceBusy] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const queryClient = useQueryClient();
  const assistedOrderMutation = useAssistedOrder();

  // Debounced Customer Lookup when typing mobile number
  useEffect(() => {
    const clean = mobile.replace(/\D/g, "");
    if (clean.length < 10) {
      setLookupResult(null);
      return;
    }
    const timer = setTimeout(() => {
      handleLookup(mobile);
    }, 300);
    return () => clearTimeout(timer);
  }, [mobile]);

  // Financial Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const transportCharge = Math.max(0, Number(transportation) || 0);
  const discountAmount = Math.max(0, Number(discount) || 0);
  const finalBill = Math.max(0, subtotal + transportCharge - discountAmount);
  const paid = Math.max(0, Number(paidAmount) || 0);
  const remainingDue = Math.max(0, Math.round((finalBill - paid) * 100) / 100);

  const oldDue = lookupResult?.previousDue || 0;
  const excessPayment = Math.max(0, Math.round((paid - finalBill) * 100) / 100);
  const excessAppliedToOldDue = Math.min(oldDue, excessPayment);
  const remainingOldDue = Math.max(0, Math.round((oldDue - excessAppliedToOldDue) * 100) / 100);
  const totalCustomerDue = Math.round((remainingDue + remainingOldDue) * 100) / 100;

  const paymentStatus =
    paid <= 0 ? "DUE" : remainingDue <= 0 ? "PAID" : "PARTIAL";

  // Cart Operations
  const addToCart = (product: ProductChoice, qtyToAdd?: number) => {
    const rawVal = localQtys[product.id];
    const parsed = parseFloat(rawVal || "");
    const qty = qtyToAdd !== undefined && qtyToAdd > 0 ? qtyToAdd : parsed > 0 ? parsed : 1;
    if (qty <= 0) return;
    if (qty > product.stock) {
      Alert.alert("Stock Limit", `Only ${product.stock} ${product.unit} available in warehouse.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + qty;
        if (newQty > product.stock) {
          Alert.alert("Stock Limit", `Maximum available stock: ${product.stock} ${product.unit}`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prev, { product, quantity: qty }];
    });

    setLocalQtys((prev) => ({ ...prev, [product.id]: "" }));
  };

  const updateCartQty = (productId: number, newQty: number) => {
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    if (newQty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    if (newQty > item.product.stock) {
      Alert.alert("Stock Limit", `Maximum available stock: ${item.product.stock} ${item.product.unit}`);
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity: newQty } : i))
    );
  };

  // Lookup customer by mobile
  const handleLookup = async (mobileToLookup = mobile) => {
    const clean = mobileToLookup.replace(/\D/g, "");
    if (clean.length < 10) return;
    setLookingUp(true);
    try {
      const res = await ordersService.lookupCustomer(mobileToLookup);
      setLookupResult(res);
      if (res && res.found && res.customer) {
        if (res.customer.name) {
          setCustomerName(res.customer.name);
        }
        if (res.customer.address) {
          setAddress(res.customer.address);
        }
      }
    } catch {
      setLookupResult({ found: false, customer: null, previousDue: 0, ordersCount: 0 });
    } finally {
      setLookingUp(false);
    }
  };

  // Submit assisted order
  const handleCreateOrder = async () => {
    setErrorMessage("");
    if (cart.length === 0) {
      setErrorMessage("Please select at least one item");
      return;
    }
    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!customerName.trim()) {
      setErrorMessage("Please enter the customer name");
      return;
    }
    if (discountAmount > subtotal + transportCharge) {
      setErrorMessage("Discount cannot exceed total bill amount");
      return;
    }

    try {
      const payload = {
        customerName: customerName.trim(),
        customerMobile: cleanMobile.slice(-10),
        deliveryAddress: address.trim(),
        notes: notes.trim(),
        items: cart.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          unit: i.product.unit,
          price: i.product.price,
          quantity: i.quantity,
          total: i.product.price * i.quantity,
        })),
        transportation: transportCharge,
        discount: discountAmount,
        paidAmount: paid,
        paymentMode,
      };

      const result = await assistedOrderMutation.mutateAsync(payload);
      const order = result.order;

      // Bulletproof local fallback enrichment
      if (!order.customerMobile && mobile) {
        order.customerMobile = cleanMobile.slice(-10);
      }
      if (!order.customerName && customerName) {
        order.customerName = customerName.trim();
      }
      if (!order.deliveryAddress && address) {
        order.deliveryAddress = address.trim();
      }
      if (order.items.length === 0 && cart.length > 0) {
        order.items = cart.map((i, idx) => ({
          id: idx + 1,
          productId: i.product.id,
          productName: i.product.name,
          unit: i.product.unit,
          price: i.product.price,
          quantity: i.quantity,
          total: i.product.price * i.quantity,
        }));
      }
      if ((order.subtotal === 0 || !order.subtotal) && subtotal > 0) {
        order.subtotal = subtotal;
      }
      if ((order.finalAmount === 0 || !order.finalAmount) && finalBill > 0) {
        order.finalAmount = finalBill;
      }
      if ((order.paidTotal === 0 || !order.paidTotal) && paid > 0) {
        order.paidTotal = paid;
      }
      order.due = Math.max(0, Math.round(((order.finalAmount || finalBill) - (order.paidTotal || paid)) * 100) / 100);
      order.paymentStatus = (order.paidTotal || paid) <= 0 ? "DUE" : order.due <= 0 ? "PAID" : "PARTIALLY_PAID";
      order.status = order.status || "DELIVERED";

      setCreatedOrder(order);
      setStep("success");

      // Instantly refetch and update Dashboard, Khatabook, Products, and Orders
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.root }),
        queryClient.refetchQueries({ queryKey: adminQueryKeys.dashboard() }),
        queryClient.refetchQueries({ queryKey: adminQueryKeys.dues() }),
        queryClient.refetchQueries({ queryKey: adminQueryKeys.orders() }),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to place order";
      setErrorMessage(msg);
    }
  };

  // Reset to create another order
  const handleNewOrder = () => {
    setStep("products");
    setCart([]);
    setLocalQtys({});
    setMobile("");
    setCustomerName("");
    setAddress("");
    setNotes("");
    setLookupResult(null);
    setTransportation("");
    setDiscount("");
    setPaidAmount("");
    setPaymentMode("CASH");
    setCreatedOrder(null);
    setErrorMessage("");
  };

  // WhatsApp share
  const handleWhatsAppShare = () => {
    if (!createdOrder) return;
    const cleanPhone = (createdOrder.customerMobile || mobile).replace(/\D/g, "");
    const phone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const itemsToUse = createdOrder.items && createdOrder.items.length > 0
      ? createdOrder.items
      : cart.map((c) => ({
          productName: c.product.name,
          quantity: c.quantity,
          unit: c.product.unit,
          price: c.product.price,
          total: c.product.price * c.quantity,
        }));

    const itemsSummary = itemsToUse
      .map(
        (i, idx) =>
          `${idx + 1}. *${i.productName}*: ${i.quantity} ${i.unit} × ₹${i.price} = ₹${i.total}`
      )
      .join("\n");

    const finalAmount = createdOrder.finalAmount || (createdOrder as any).bill?.finalAmount || createdOrder.subtotal || finalBill;
    const totalPaid = createdOrder.paidTotal || (createdOrder.payments || []).reduce((s, p) => s + Number(p.amount), 0) || paid;
    const thisBillPaid = Math.min(totalPaid, finalAmount);
    const excessPaid = Math.max(0, Math.round((totalPaid - finalAmount) * 100) / 100);
    const due = createdOrder.due !== undefined ? createdOrder.due : Math.max(0, finalAmount - thisBillPaid);
    const discount = (createdOrder as any).bill?.discount || discountAmount || 0;

    const paymentSection = excessPaid > 0
      ? `✅ *Total Amount Paid:* ${formatINR(totalPaid)} (${paymentMode})\n` +
        `   ↳ *Applied to this Bill:* ${formatINR(thisBillPaid)} (Fully Paid)\n` +
        `   ↳ *Applied to Previous Dues (पुरानी बकाया):* ${formatINR(excessPaid)}\n`
      : `✅ *Paid Amount:* ${formatINR(totalPaid)} (${paymentMode})\n` +
        (due > 0 ? `⚠️ *Remaining Due on this Bill:* ${formatINR(due)}\n` : "");

    const text = `*M/S SUSHANT CONSTRUCTION*\n` +
      `*Order & Invoice Receipt*\n\n` +
      `📌 *Order #:* #${createdOrder.orderNumber}\n` +
      `👤 *Customer:* ${createdOrder.customerName || customerName}\n` +
      `📞 *Mobile:* ${createdOrder.customerMobile || mobile}\n` +
      (createdOrder.deliveryAddress || address ? `📍 *Address:* ${createdOrder.deliveryAddress || address}\n` : "") +
      `📅 *Date:* ${formatDateTime(createdOrder.createdAt)}\n\n` +
      `🛒 *Items:*\n${itemsSummary}\n\n` +
      `💵 *Subtotal:* ${formatINR(createdOrder.subtotal || subtotal)}\n` +
      (discount > 0 ? `🎁 *Discount:* -${formatINR(discount)}\n` : "") +
      `💰 *Total Final Bill:* ${formatINR(finalAmount)}\n` +
      paymentSection + "\n" +
      `_Thank you for choosing M/S Sushant Construction._`;

    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("WhatsApp Error", "Could not open WhatsApp. Please check if app is installed.");
    });
  };

  // Thermal Print Receipt
  const handlePrint = async () => {
    if (!createdOrder) return;
    setInvoiceBusy("print");
    try {
      const html = generateReceiptHtml(createdOrder, settings);
      await Print.printAsync({ html });
    } catch {
      Alert.alert("Print Error", "Failed to print receipt");
    } finally {
      setInvoiceBusy("");
    }
  };

  // PDF Export & Share
  const handleSharePdf = async () => {
    if (!createdOrder) return;
    setInvoiceBusy("pdf");
    try {
      const html = generateReceiptHtml(createdOrder, settings);
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: ".pdf",
          mimeType: "application/pdf",
          dialogTitle: `Order_${createdOrder.orderNumber}.pdf`,
        });
      } else {
        Alert.alert("PDF Generated", `Saved to: ${uri}`);
      }
    } catch {
      Alert.alert("PDF Error", "Failed to create PDF");
    } finally {
      setInvoiceBusy("");
    }
  };

  return (
    <Screen keyboardAware contentStyle={s.page}>
      {/* Top Navigation */}
      <View style={s.nav}>
        <IconButton
          icon="arrow-back"
          label="Back"
          onPress={() => {
            if (step === "cart") setStep("products");
            else if (step === "customer") setStep("cart");
            else if (step === "payment") setStep("customer");
            else router.back();
          }}
        />
        <View style={s.flex}>
          <AppText role="pageTitle">Place Customer Order</AppText>
          <AppText role="caption" style={{ color: t.colors.textMuted }}>
            Admin-Assisted Order & Billing
          </AppText>
        </View>
        {step !== "success" && cart.length > 0 && (
          <Pressable
            onPress={() => setStep("cart")}
            style={[s.cartBadgeBtn, { backgroundColor: t.colors.brand }]}
          >
            <Ionicons name="cart" size={16} color="#ffffff" />
            <AppText style={s.cartBadgeText}>{cart.length}</AppText>
          </Pressable>
        )}
      </View>

      {/* Step Indicators */}
      {step !== "success" && (
        <View style={s.stepsHeader}>
          <Pressable
            onPress={() => setStep("products")}
            style={[s.stepPill, step === "products" && { backgroundColor: t.colors.brand }]}
          >
            <AppText numberOfLines={1} style={[s.stepPillText, step === "products" && s.stepPillActive]}>
              1. Items
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => cart.length > 0 && setStep("cart")}
            style={[s.stepPill, step === "cart" && { backgroundColor: t.colors.brand }]}
          >
            <AppText numberOfLines={1} style={[s.stepPillText, step === "cart" && s.stepPillActive]}>
              2. Cart ({cart.length})
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => cart.length > 0 && setStep("customer")}
            style={[s.stepPill, step === "customer" && { backgroundColor: t.colors.brand }]}
          >
            <AppText numberOfLines={1} style={[s.stepPillText, step === "customer" && s.stepPillActive]}>
              3. Customer
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => cart.length > 0 && customerName && setStep("payment")}
            style={[s.stepPill, step === "payment" && { backgroundColor: t.colors.brand }]}
          >
            <AppText numberOfLines={1} style={[s.stepPillText, step === "payment" && s.stepPillActive]}>
              4. Bill & Pay
            </AppText>
          </Pressable>
        </View>
      )}

      {/* STEP 1: PRODUCTS CATALOGUE */}
      {step === "products" && (
        <View style={s.gap}>
          <Input
            label="Search Material"
            placeholder="Cement, TMT Steel, Roofing Sheets..."
            value={search}
            onChangeText={setSearch}
          />

          {/* Category Filter Pills */}
          {categories.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
              <FilterChip
                label="All Categories"
                selected={selectedCategory === null}
                onPress={() => setSelectedCategory(null)}
              />
              {categories.map((c) => (
                <FilterChip
                  key={c.id}
                  label={c.name}
                  selected={selectedCategory === c.id}
                  onPress={() => setSelectedCategory(c.id)}
                />
              ))}
            </ScrollView>
          )}

          {productsQ.isPending ? (
            <LoadingState label="Loading materials…" />
          ) : productsQ.isError ? (
            <ErrorState description={productsQ.error.message} />
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              title="No materials found"
              description="Try searching with a different name or category."
            />
          ) : (
            <View style={s.productGrid}>
              {filteredProducts.map((p) => {
                const inCart = cart.find((i) => i.product.id === p.id);
                const imgUri = p.imageUrl || p.images?.[0]?.url || FALLBACK_PRODUCT_IMAGE;

                return (
                  <View
                    key={p.id}
                    style={[
                      s.productCardGrid,
                      {
                        backgroundColor: t.colors.surface,
                        borderColor: inCart ? t.colors.brand : t.colors.border,
                      },
                      inCart && { borderWidth: 1.5 },
                    ]}
                  >
                    {/* Product Image Header */}
                    <View style={[s.imageWrapper, { backgroundColor: t.colors.surfaceMuted }]}>
                      <Image
                        source={{ uri: imgUri }}
                        style={s.productImage}
                        resizeMode="cover"
                      />
                      {/* Stock Badge */}
                      <View
                        style={[
                          s.stockBadge,
                          p.stock <= 0
                            ? { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }
                            : p.stock <= 10
                            ? { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }
                            : { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" },
                        ]}
                      >
                        <AppText
                          style={[
                            s.stockText,
                            {
                              color:
                                p.stock <= 0 ? "#DC2626" : p.stock <= 10 ? "#D97706" : "#15803D",
                            },
                          ]}
                        >
                          {p.stock <= 0 ? "Out of Stock" : `Stock: ${p.stock}`}
                        </AppText>
                      </View>

                      {/* In Cart Indicator */}
                      {inCart ? (
                        <View style={[s.inCartBadge, { backgroundColor: t.colors.brand }]}>
                          <Ionicons name="cart" size={11} color="#ffffff" />
                          <AppText style={s.inCartBadgeText}>{inCart.quantity}</AppText>
                        </View>
                      ) : null}
                    </View>

                    {/* Category Label */}
                    {p.categoryName ? (
                      <AppText numberOfLines={1} style={[s.cardCategory, { color: t.colors.brand }]}>
                        {p.categoryName}
                      </AppText>
                    ) : null}

                    {/* Product Name (high contrast in dark & light mode) */}
                    <AppText numberOfLines={2} style={[s.productName, { color: t.colors.text }]}>
                      {p.name}
                    </AppText>

                    {/* Price & MRP */}
                    <View style={s.priceBlock}>
                      <AppText style={[s.productPrice, { color: t.colors.brand }]}>
                        {formatINR(p.price)}
                        <AppText style={[s.unitText, { color: t.colors.textMuted }]}> / {p.unit}</AppText>
                      </AppText>
                      {p.mrp && p.mrp > p.price ? (
                        <AppText style={[s.mrpText, { color: t.colors.textMuted }]}>{formatINR(p.mrp)}</AppText>
                      ) : null}
                    </View>

                    {/* Direct Quantity Input + Add Button Row */}
                    <View style={s.cardBottomRow}>
                      <View
                        style={[
                          s.qtyInputBox,
                          {
                            backgroundColor: t.colors.background,
                            borderColor: t.colors.border,
                          },
                        ]}
                      >
                        <TextInput
                          value={localQtys[p.id] !== undefined ? localQtys[p.id] : ""}
                          onChangeText={(text) => {
                            const sanitized = text.replace(/,/g, ".");
                            if (sanitized === "" || /^\d*\.?\d*$/.test(sanitized)) {
                              setLocalQtys((prev) => ({ ...prev, [p.id]: sanitized }));
                            }
                          }}
                          keyboardType={isWholeUnit(p.unit) ? "number-pad" : "decimal-pad"}
                          inputMode={isWholeUnit(p.unit) ? "numeric" : "decimal"}
                          placeholder={isWholeUnit(p.unit) ? "1" : "0.5"}
                          placeholderTextColor={t.colors.textMuted}
                          selectTextOnFocus
                          style={[s.directQtyInput, { color: t.colors.text }]}
                        />
                        <AppText numberOfLines={1} style={[s.unitSuffix, { color: t.colors.textMuted }]}>
                          {p.unit}
                        </AppText>
                      </View>

                      <Pressable
                        onPress={() => addToCart(p)}
                        disabled={p.stock <= 0}
                        style={[
                          s.addCartBtn,
                          { backgroundColor: inCart ? "#0f766e" : t.colors.brand },
                          p.stock <= 0 && s.disabledBtn,
                        ]}
                      >
                        <Ionicons name={inCart ? "add" : "cart-outline"} size={15} color="#ffffff" />
                        <AppText style={s.addCartBtnText}>
                          {inCart ? "+ Add" : "Add"}
                        </AppText>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {cart.length > 0 && (
            <Button
              title={`Proceed to Cart (${cart.length} items · ${formatINR(subtotal)}) ➔`}
              onPress={() => setStep("cart")}
            />
          )}
        </View>
      )}

      {/* STEP 2: CART REVIEW */}
      {step === "cart" && (
        <View style={s.gap}>
          <Card style={s.gap}>
            <View style={s.rowBetween}>
              <AppText role="sectionTitle">Selected Materials ({cart.length})</AppText>
              <AppText role="financialValue">{formatINR(subtotal)}</AppText>
            </View>
            <Divider />

            {cart.map((item, idx) => (
              <View key={item.product.id}>
                <View style={s.cartItemCard}>
                  {/* Thumbnail */}
                  <Image
                    source={{ uri: item.product.imageUrl || item.product.images?.[0]?.url || FALLBACK_PRODUCT_IMAGE }}
                    style={s.cartItemThumb}
                    resizeMode="cover"
                  />

                  {/* Body */}
                  <View style={s.flex}>
                    <View style={s.rowBetween}>
                      <View style={{ flex: 1 }}>
                        <AppText role="bodyStrong" numberOfLines={2}>{item.product.name}</AppText>
                        <AppText role="caption" style={{ color: t.colors.textMuted }}>
                          {formatINR(item.product.price)} / {item.product.unit}
                        </AppText>
                      </View>
                      <IconButton
                        icon="trash-outline"
                        label="Remove"
                        onPress={() => updateCartQty(item.product.id, 0)}
                      />
                    </View>

                    {/* Quantity Edit & Line Total */}
                    <View style={[s.rowBetween, { marginTop: 8 }]}>
                      <View style={s.cartQtyControl}>
                        <Pressable
                          onPress={() => {
                            const step = isWholeUnit(item.product.unit) ? 1 : 0.5;
                            updateCartQty(item.product.id, Math.max(0, item.quantity - step));
                          }}
                          style={[s.stepperBtn, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}
                        >
                          <AppText style={[s.stepperBtnText, { color: t.colors.brand }]}>−</AppText>
                        </Pressable>

                        <TextInput
                          value={String(item.quantity)}
                          onChangeText={(text) => {
                            const val = parseFloat(text.replace(/,/g, "."));
                            if (!isNaN(val) && val >= 0) {
                              updateCartQty(item.product.id, val);
                            }
                          }}
                          keyboardType={isWholeUnit(item.product.unit) ? "number-pad" : "decimal-pad"}
                          style={[
                            s.cartQtyInput,
                            {
                              backgroundColor: t.colors.background,
                              borderColor: t.colors.border,
                              color: t.colors.text,
                            },
                          ]}
                        />

                        <Pressable
                          onPress={() => {
                            const step = isWholeUnit(item.product.unit) ? 1 : 0.5;
                            updateCartQty(item.product.id, Math.min(item.product.stock, item.quantity + step));
                          }}
                          style={[s.stepperBtn, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}
                        >
                          <AppText style={[s.stepperBtnText, { color: t.colors.brand }]}>+</AppText>
                        </Pressable>

                        <AppText style={{ fontSize: 11, color: t.colors.textMuted }}>
                          {item.product.unit}
                        </AppText>
                      </View>

                      <AppText role="financialValue" style={{ fontSize: 15 }}>
                        {formatINR(item.product.price * item.quantity)}
                      </AppText>
                    </View>
                  </View>
                </View>
                {idx < cart.length - 1 && <Divider />}
              </View>
            ))}
          </Card>

          <View style={s.rowBetween}>
            <Button
              title="← Add More Items"
              variant="outline"
              onPress={() => setStep("products")}
              style={s.flex}
            />
            <Button
              title="Customer Details ➔"
              onPress={() => setStep("customer")}
              style={s.flex}
            />
          </View>
        </View>
      )}

      {/* STEP 3: CUSTOMER DETAILS & LOOKUP */}
      {step === "customer" && (
        <View style={s.gap}>
          <Card style={s.gap}>
            <View style={s.rowBetween}>
              <AppText role="sectionTitle">Customer Details</AppText>
              {lookingUp ? (
                <StatusBadge label="Checking..." tone="warning" />
              ) : lookupResult?.found ? (
                <StatusBadge label="✓ Existing Customer" tone="success" />
              ) : mobile.replace(/\D/g, "").length >= 10 && lookupResult !== null ? (
                <StatusBadge label="New Customer" tone="info" />
              ) : null}
            </View>

            <Input
              label="Mobile Number (10 Digits) *"
              placeholder="9939130538"
              keyboardType="phone-pad"
              value={mobile}
              onChangeText={(val) => {
                setMobile(val);
              }}
            />

            {/* Previous Due Callout (Strictly Informational) */}
            {lookupResult && lookupResult.found && lookupResult.previousDue > 0 && (
              <View
                style={[
                  s.dueAlertBox,
                  { backgroundColor: t.colors.warningSoft, borderColor: t.colors.warning },
                ]}
              >
                <View style={s.rowBetween}>
                  <AppText style={{ color: t.colors.warning, fontWeight: "800", fontSize: 12 }}>
                    ⚠️ Previous Outstanding Due:
                  </AppText>
                  <AppText role="financialCompact" style={{ color: t.colors.warning }}>
                    {formatINR(lookupResult.previousDue)}
                  </AppText>
                </View>
                <AppText role="caption" style={{ color: t.colors.textMuted, marginTop: 2 }}>
                  Informational only — will not be added to the new bill.
                </AppText>
              </View>
            )}

            <Input
              label="Customer Name *"
              placeholder="Enter full name"
              value={customerName}
              onChangeText={setCustomerName}
            />

            <Input
              label="Site / Delivery Address"
              placeholder="Village / Site / Landmark"
              value={address}
              onChangeText={setAddress}
            />

            <Input
              label="Notes / Special Instructions"
              placeholder="e.g., Deliver by 10 AM"
              value={notes}
              onChangeText={setNotes}
            />
          </Card>

          <View style={s.rowBetween}>
            <Button
              title="← Back to Cart"
              variant="outline"
              onPress={() => setStep("cart")}
              style={s.flex}
            />
            <Button
              title="Proceed to Bill & Payment ➔"
              disabled={!customerName.trim() || mobile.replace(/\D/g, "").length < 10}
              onPress={() => setStep("payment")}
              style={s.flex}
            />
          </View>
        </View>
      )}

      {/* STEP 4: BILL & PAYMENT DETAILS */}
      {step === "payment" && (
        <View style={s.gap}>
          <Card style={s.gap}>
            <AppText role="sectionTitle">Bill & Payment Details</AppText>
            <Divider />

            {/* Subtotal */}
            <View style={s.rowBetween}>
              <AppText style={{ color: t.colors.textSecondary }}>Items Subtotal:</AppText>
              <AppText role="bodyStrong">{formatINR(subtotal)}</AppText>
            </View>

            {/* Transportation Input */}
            <Input
              label="Transportation Charge (₹)"
              placeholder="0"
              keyboardType="decimal-pad"
              value={transportation}
              onChangeText={setTransportation}
            />

            {/* Discount Input */}
            <Input
              label="Discount (₹)"
              placeholder="0"
              keyboardType="decimal-pad"
              value={discount}
              onChangeText={setDiscount}
            />

            <Divider />

            {/* Final Bill */}
            <View style={s.rowBetween}>
              <AppText role="bodyStrong" style={{ fontSize: 16 }}>
                Total Final Bill:
              </AppText>
              <AppText role="financialHero" style={{ color: t.colors.brand }}>
                {formatINR(finalBill)}
              </AppText>
            </View>

            <Divider />

            {/* Payment Mode Selection */}
            <AppText role="label">Payment Mode</AppText>
            <View style={s.modeSelector}>
              <Pressable
                onPress={() => setPaymentMode("CASH")}
                style={[
                  s.modeBtn,
                  paymentMode === "CASH" && {
                    backgroundColor: t.colors.brandSoft,
                    borderColor: t.colors.brand,
                  },
                ]}
              >
                <Ionicons
                  name="cash-outline"
                  size={18}
                  color={paymentMode === "CASH" ? t.colors.brand : "#64748b"}
                />
                <AppText
                  style={[
                    s.modeBtnText,
                    paymentMode === "CASH" && { color: t.colors.brand, fontWeight: "800" },
                  ]}
                >
                  Cash
                </AppText>
              </Pressable>

              <Pressable
                onPress={() => setPaymentMode("ONLINE")}
                style={[
                  s.modeBtn,
                  paymentMode === "ONLINE" && {
                    backgroundColor: t.colors.brandSoft,
                    borderColor: t.colors.brand,
                  },
                ]}
              >
                <Ionicons
                  name="qr-code-outline"
                  size={18}
                  color={paymentMode === "ONLINE" ? t.colors.brand : "#64748b"}
                />
                <AppText
                  style={[
                    s.modeBtnText,
                    paymentMode === "ONLINE" && { color: t.colors.brand, fontWeight: "800" },
                  ]}
                >
                  Online / UPI
                </AppText>
              </Pressable>
            </View>

            {/* Paid Amount Input */}
            <Input
              label="Amount Paid Now (₹)"
              placeholder="0 (e.g., 5000)"
              keyboardType="decimal-pad"
              value={paidAmount}
              onChangeText={setPaidAmount}
            />

            {/* Remaining Due on Current Bill */}
            <View
              style={[
                s.dueAlertBox,
                {
                  backgroundColor:
                    remainingDue > 0 ? t.colors.warningSoft : t.colors.brandSoft,
                  borderColor: remainingDue > 0 ? t.colors.warning : t.colors.brand,
                },
              ]}
            >
              <View style={s.rowBetween}>
                <AppText
                  style={{
                    color: remainingDue > 0 ? t.colors.warning : t.colors.brand,
                    fontWeight: "800",
                    fontSize: 13,
                  }}
                >
                  {remainingDue > 0 ? "⚠️ Remaining Due on this Bill:" : "✓ This Bill: Fully Paid"}
                </AppText>
                <AppText
                  role="financialCompact"
                  style={{
                    color: remainingDue > 0 ? t.colors.warning : t.colors.brand,
                  }}
                >
                  {formatINR(remainingDue)}
                </AppText>
              </View>
              <AppText role="caption" style={{ color: t.colors.textMuted, marginTop: 2 }}>
                Bill Status: {paymentStatus === "PAID" ? "Paid in full" : paymentStatus === "PARTIAL" ? "Partial Payment" : "Unpaid / Due"}
              </AppText>
            </View>

            {/* Customer Previous Due & Auto-Clear Settlement Box */}
            {oldDue > 0 && (
              <View
                style={[
                  s.dueAlertBox,
                  {
                    backgroundColor: t.colors.surfaceMuted,
                    borderColor: t.colors.border,
                    marginTop: 6,
                  },
                ]}
              >
                <View style={{ gap: 6 }}>
                  <View style={s.rowBetween}>
                    <AppText style={{ color: t.colors.textMuted, fontSize: 12 }}>
                      Previous Due (पुरानी बकाया):
                    </AppText>
                    <AppText style={{ fontWeight: "700", color: t.colors.text, fontSize: 13 }}>
                      {formatINR(oldDue)}
                    </AppText>
                  </View>

                  {excessPayment > 0 && (
                    <View style={s.rowBetween}>
                      <AppText style={{ color: "#16a34a", fontSize: 12, fontWeight: "700" }}>
                        ✓ Auto-cleared with excess pay:
                      </AppText>
                      <AppText style={{ fontWeight: "800", color: "#16a34a", fontSize: 13 }}>
                        -{formatINR(excessAppliedToOldDue)}
                      </AppText>
                    </View>
                  )}

                  {excessPayment > 0 && remainingOldDue > 0 && (
                    <View style={s.rowBetween}>
                      <AppText style={{ color: t.colors.textMuted, fontSize: 12 }}>
                        Remaining Old Due:
                      </AppText>
                      <AppText style={{ fontWeight: "600", color: t.colors.textSecondary, fontSize: 12 }}>
                        {formatINR(remainingOldDue)}
                      </AppText>
                    </View>
                  )}

                  <Divider />

                  <View style={s.rowBetween}>
                    <AppText
                      style={{
                        color: totalCustomerDue > 0 ? t.colors.warning : "#16a34a",
                        fontWeight: "800",
                        fontSize: 13,
                      }}
                    >
                      Total Net Outstanding (कुल बकाया):
                    </AppText>
                    <AppText
                      role="financialCompact"
                      style={{
                        color: totalCustomerDue > 0 ? t.colors.warning : "#16a34a",
                        fontWeight: "900",
                      }}
                    >
                      {formatINR(totalCustomerDue)}
                    </AppText>
                  </View>

                  {excessPayment > 0 ? (
                    <AppText role="caption" style={{ color: "#16a34a", fontSize: 11, marginTop: 2 }}>
                      ℹ️ Extra {formatINR(excessPayment)} will automatically clear customer's oldest unpaid dues in Khatabook.
                    </AppText>
                  ) : (
                    <AppText role="caption" style={{ color: t.colors.textMuted, fontSize: 11, marginTop: 2 }}>
                      ℹ️ Paying more than {formatINR(finalBill)} will automatically clear previous dues.
                    </AppText>
                  )}
                </View>
              </View>
            )}

            {/* Change to Return if excess and no old due */}
            {oldDue === 0 && excessPayment > 0 && (
              <View
                style={[
                  s.dueAlertBox,
                  {
                    backgroundColor: "#f0fdf4",
                    borderColor: "#bbf7d0",
                    marginTop: 6,
                  },
                ]}
              >
                <View style={s.rowBetween}>
                  <AppText style={{ color: "#16a34a", fontWeight: "800", fontSize: 12.5 }}>
                    ✓ Change to Return / Excess Paid:
                  </AppText>
                  <AppText style={{ color: "#16a34a", fontWeight: "900", fontSize: 13 }}>
                    {formatINR(excessPayment)}
                  </AppText>
                </View>
              </View>
            )}

            {errorMessage ? (
              <Card style={{ backgroundColor: t.colors.dangerSoft }}>
                <AppText style={{ color: t.colors.danger, fontSize: 12 }}>
                  {errorMessage}
                </AppText>
              </Card>
            ) : null}
          </Card>

          <View style={s.rowBetween}>
            <Button
              title="← Customer Details"
              variant="outline"
              onPress={() => setStep("customer")}
              style={s.flex}
            />
            <Button
              title={assistedOrderMutation.isPending ? "Placing Order…" : "✓ Confirm & Place Order"}
              loading={assistedOrderMutation.isPending}
              disabled={assistedOrderMutation.isPending}
              onPress={handleCreateOrder}
              style={s.flex}
            />
          </View>
        </View>
      )}

      {/* STEP 5: SUCCESS & RECEIPT */}
      {step === "success" && createdOrder && (
        <View style={s.gap}>
          <Card style={[s.gap, { alignItems: "center", paddingVertical: 20 }]}>
            <View style={s.successIcon}>
              <Ionicons name="checkmark-circle" size={56} color="#16a34a" />
            </View>
            <AppText role="pageTitle" style={{ textAlign: "center", color: "#16a34a" }}>
              Order Placed Successfully!
            </AppText>
            <View style={s.orderNumberBadge}>
              <AppText style={[s.orderNumberText, { color: t.colors.text }]}>#{createdOrder.orderNumber}</AppText>
              <View style={s.adminOrderBadge}>
                <AppText style={s.adminOrderBadgeText}>Admin Order</AppText>
              </View>
            </View>

            <View style={{ width: "100%", gap: 6, marginTop: 12 }}>
              <View style={s.rowBetween}>
                <AppText style={{ color: t.colors.textMuted }}>Customer Name:</AppText>
                <AppText role="bodyStrong">{createdOrder.customerName}</AppText>
              </View>
              <View style={s.rowBetween}>
                <AppText style={{ color: t.colors.textMuted }}>Mobile:</AppText>
                <AppText>{createdOrder.customerMobile}</AppText>
              </View>
              {createdOrder.deliveryAddress ? (
                <View style={s.rowBetween}>
                  <AppText style={{ color: t.colors.textMuted }}>Address:</AppText>
                  <AppText numberOfLines={1} style={{ maxWidth: 200 }}>
                    {createdOrder.deliveryAddress}
                  </AppText>
                </View>
              ) : null}
              <Divider />
              <View style={s.rowBetween}>
                <AppText style={{ color: t.colors.textMuted }}>Total Order Bill:</AppText>
                <AppText role="bodyStrong" style={{ color: t.colors.brand }}>
                  {formatINR(createdOrder.finalAmount || (createdOrder as any).bill?.finalAmount || createdOrder.subtotal)}
                </AppText>
              </View>
              <View style={s.rowBetween}>
                <AppText style={{ color: t.colors.textMuted }}>Amount Paid Now:</AppText>
                <AppText role="bodyStrong" style={{ color: "#16a34a" }}>
                  {formatINR(
                    createdOrder.paidTotal ||
                    (createdOrder.payments || []).reduce((s, p) => s + Number(p.amount), 0) || paid
                  )}
                </AppText>
              </View>

              {(() => {
                const finalAmt = createdOrder.finalAmount || (createdOrder as any).bill?.finalAmount || createdOrder.subtotal || finalBill;
                const paidAmt = createdOrder.paidTotal || (createdOrder.payments || []).reduce((s, p) => s + Number(p.amount), 0) || paid;
                const excess = Math.max(0, Math.round((paidAmt - finalAmt) * 100) / 100);
                const appliedThis = Math.min(paidAmt, finalAmt);
                if (excess <= 0) return null;
                return (
                  <View style={{ backgroundColor: "rgba(22, 163, 74, 0.1)", padding: 8, borderRadius: 8, gap: 4, marginVertical: 4 }}>
                    <View style={s.rowBetween}>
                      <AppText style={{ color: "#16a34a", fontSize: 12, fontWeight: "600" }}>
                        ↳ Applied to this Order:
                      </AppText>
                      <AppText style={{ color: "#16a34a", fontSize: 12, fontWeight: "700" }}>
                        {formatINR(appliedThis)} (Paid)
                      </AppText>
                    </View>
                    <View style={s.rowBetween}>
                      <AppText style={{ color: "#16a34a", fontSize: 12, fontWeight: "600" }}>
                        ↳ Cleared Previous Dues (पुरानी बकाया):
                      </AppText>
                      <AppText style={{ color: "#16a34a", fontSize: 12, fontWeight: "700" }}>
                        {formatINR(excess)}
                      </AppText>
                    </View>
                  </View>
                );
              })()}
            </View>
          </Card>

          {/* Action Buttons: WhatsApp, Print, PDF */}
          <Card style={s.gap}>
            <AppText role="sectionTitle">Receipt & Share Options</AppText>

            <Pressable
              onPress={handleWhatsAppShare}
              style={[s.shareBtn, { backgroundColor: "#25D366" }]}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#ffffff" />
              <AppText style={s.shareBtnText}>Share Receipt on WhatsApp</AppText>
            </Pressable>

            <View style={s.rowBetween}>
              <Pressable
                onPress={handlePrint}
                disabled={invoiceBusy !== ""}
                style={[
                  s.actionSmallBtn,
                  { backgroundColor: t.colors.surfaceMuted, borderColor: t.colors.border },
                ]}
              >
                {invoiceBusy === "print" ? (
                  <ActivityIndicator size="small" color={t.colors.brand} />
                ) : (
                  <>
                    <Ionicons name="print-outline" size={18} color={t.colors.text} />
                    <AppText style={{ fontWeight: "700", color: t.colors.text }}>Print Receipt</AppText>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={handleSharePdf}
                disabled={invoiceBusy !== ""}
                style={[
                  s.actionSmallBtn,
                  { backgroundColor: t.colors.surfaceMuted, borderColor: t.colors.border },
                ]}
              >
                {invoiceBusy === "pdf" ? (
                  <ActivityIndicator size="small" color={t.colors.brand} />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color={t.colors.text} />
                    <AppText style={{ fontWeight: "700", color: t.colors.text }}>PDF Receipt</AppText>
                  </>
                )}
              </Pressable>
            </View>
          </Card>

          <Button
            title="+ Place Another Order"
            onPress={handleNewOrder}
          />
          <Button
            title="View Orders List ➔"
            variant="outline"
            onPress={() => router.replace("/(admin)/(tabs)/orders" as never)}
          />
        </View>
      )}
    </Screen>
  );
}

// Generate Official Printable Invoice HTML (matches server/src/utils/bill.ts)
function generateReceiptHtml(order: Order, settings?: Settings | null): string {
  const finalAmount = order.finalAmount || (order as any).bill?.finalAmount || order.subtotal || 0;
  const discount = (order as any).bill?.discount || 0;
  const payments = order.payments || [];
  let cashPaid = payments
    .filter((p: any) => p.paymentMode === "CASH")
    .reduce((s: number, p: any) => s + Number(p.amount), 0);
  let onlinePaid = payments
    .filter((p: any) => p.paymentMode === "ONLINE")
    .reduce((s: number, p: any) => s + Number(p.amount), 0);

  const paid = order.paidTotal || (cashPaid + onlinePaid) || 0;
  if (cashPaid === 0 && onlinePaid === 0 && paid > 0) {
    if (order.cashTotal > 0) cashPaid = order.cashTotal;
    else if (order.onlineTotal > 0) onlinePaid = order.onlineTotal;
    else cashPaid = paid;
  }

  const thisBillPaid = Math.min(paid, finalAmount);
  const excessPaid = Math.max(0, Math.round((paid - finalAmount) * 100) / 100);
  const due = order.due !== undefined ? order.due : Math.max(0, finalAmount - thisBillPaid);

  const paymentStatus =
    paid <= 0 ? "DUE" : due <= 0 ? "PAID" : "PARTIALLY_PAID";

  const bizName = settings?.businessName || settings?.companyName || "M/S Sushant Construction";
  const bizTagline = settings?.tagline || "Your trusted partner · Complete Building & Construction Materials Supplier";
  const bizAddr = settings?.businessAddress || settings?.address || "Ghatotand, Mandu, Ramgarh, Jharkhand - 825314";
  const bizGst = settings?.gstNumber || "";
  const bizPhone = settings?.businessMobile || settings?.phone || "+91 99391 30538";
  const bizEmail = settings?.businessEmail || settings?.email || "mssushantconstruction@gmail.com";
  const bizLogo = settings?.businessLogoUrl || settings?.logoUrl || "";

  const rows = (order.items || [])
    .map(
      (it) => `
        <tr>
          <td>${escapeHtml(it.productName)}</td>
          <td class="num">${it.quantity} ${escapeHtml(it.unit)}</td>
          <td class="num">${formatINR(it.price)}</td>
          <td class="num">${formatINR(it.total)}</td>
        </tr>`
    )
    .join("");

  const discountRow =
    discount > 0
      ? `<p class="discount">Discount: <strong>-${formatINR(discount)}</strong></p>`
      : "";

  const dueRow =
    due > 0
      ? `<div class="row due"><span class="label">Remaining Due</span><span class="val">${formatINR(due)}</span></div>`
      : "";

  const paymentStatusBadge =
    paymentStatus === "PAID"
      ? `<span class="pstatus paid">PAID</span>`
      : paymentStatus === "DUE"
      ? `<span class="pstatus due">DUE</span>`
      : `<span class="pstatus partial">PARTIALLY PAID</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Invoice ${escapeHtml(order.orderNumber)}</title>
<style>
  @page { size: A4 portrait; margin: 7mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Noto Sans Devanagari', 'Noto Sans', 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 8px; font-size: 10px; line-height: 1.3; }
  .container { width: 100%; max-width: 158mm; margin: 0 auto; border: 1px solid #dbe3ec; border-radius: 7px; overflow: hidden; }
  .header { background: #1e293b; color: #fff; padding: 10px 14px; text-align: center; position: relative; break-inside: avoid; page-break-inside: avoid; }
  .header .logo { max-height: 38px; max-width: 120px; object-fit: contain; margin-bottom: 3px; }
  .header h1 { margin: 0; font-size: 16px; letter-spacing: 0.2px; line-height: 1.25; }
  .header p { margin: 2px 0 0; opacity: 0.85; font-size: 9px; }
  .business-details { background: #f8fafc; padding: 6px 10px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 5px 12px; border-bottom: 1px solid #e2e8f0; font-size: 9px; break-inside: avoid; page-break-inside: avoid; }
  .business-details .left { text-align: left; }
  .business-details .right { text-align: right; }
  .business-details p { margin: 2px 0; }
  .business-details .label { font-weight: 600; color: #64748b; }
  .meta { padding: 7px 10px; display: grid; grid-template-columns: 0.8fr 1fr 1.2fr; gap: 8px; border-bottom: 1px solid #e2e8f0; break-inside: avoid; page-break-inside: avoid; }
  .meta div p { margin: 1px 0; font-size: 9px; overflow-wrap: anywhere; }
  .meta .label { font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 7.5px; margin-top: 3px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th:first-child, td:first-child { width: 43%; overflow-wrap: anywhere; }
  th, td { padding: 4px 6px; text-align: left; font-size: 9px; line-height: 1.25; }
  thead { display: table-header-group; }
  thead th { background: #f1f5f9; color: #475569; text-transform: uppercase; font-size: 8px; letter-spacing: 0.2px; }
  tbody tr { border-bottom: 1px solid #f1f5f9; break-inside: avoid; page-break-inside: avoid; }
  .num { text-align: right; }
  .totals { padding: 6px 10px; text-align: right; break-inside: avoid; page-break-inside: avoid; }
  .totals p { margin: 2px 0; font-size: 9px; }
  .totals .grand { font-size: 12px; font-weight: 700; color: #0f766e; margin-top: 3px; }
  .discount { color: #b91c1c; font-weight: 600; }
  .due { color: #b45309; font-weight: 700; }
  .payment-box { margin: 0 10px 7px; border: 1px solid #e2e8f0; border-radius: 5px; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
  .payment-box .head { background: #f1f5f9; padding: 4px 7px; font-weight: 700; color: #334155; text-transform: uppercase; font-size: 8px; letter-spacing: 0.2px; }
  .payment-box .row { display: flex; justify-content: space-between; gap: 8px; padding: 3px 7px; font-size: 9px; border-top: 1px solid #f1f5f9; }
  .payment-box .row span.label { color: #64748b; }
  .payment-box .row span.val { font-weight: 600; color: #0f172a; }
  .pstatus { display: inline-block; padding: 1px 5px; border-radius: 999px; font-size: 7.5px; font-weight: 700; white-space: nowrap; }
  .pstatus.paid { background: #dcfce7; color: #15803d; }
  .pstatus.due { background: #fee2e2; color: #b91c1c; }
  .pstatus.partial { background: #fef3c7; color: #b45309; }
  .footer { padding: 6px 10px; text-align: center; color: #64748b; font-size: 8px; border-top: 1px solid #e2e8f0; break-inside: avoid; page-break-inside: avoid; }
  .footer p { margin: 1px 0; }
  .footer .tagline { font-weight: 600; color: #334155; margin-top: 3px; }
  @media print {
    body { padding: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .container { border-radius: 0; }
    h1, h2, h3, thead { break-after: avoid; page-break-after: avoid; }
  }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${bizLogo ? `<img src="${bizLogo}" alt="Logo" class="logo" />` : ""}
      <h1>🙏 ${escapeHtml(bizName)} 🙏</h1>
      <p>${escapeHtml(bizTagline)}</p>
    </div>

    ${
      bizAddr || bizGst || bizPhone || bizEmail
        ? `<div class="business-details">
            <div class="left">
              ${bizAddr ? `<p>📍 ${escapeHtml(bizAddr)}</p>` : ""}
              ${bizGst ? `<p>🆔 GST: ${escapeHtml(bizGst)}</p>` : ""}
            </div>
            <div class="right">
              ${bizPhone ? `<p>📞 ${escapeHtml(bizPhone)}</p>` : ""}
              ${bizEmail ? `<p>✉️ ${escapeHtml(bizEmail)}</p>` : ""}
            </div>
          </div>`
        : ""
    }

    <div class="meta">
      <div>
        <p class="label">Invoice No</p>
        <p>${escapeHtml(order.orderNumber)}</p>
        <p class="label">Invoice Date</p>
        <p>${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
      </div>
      <div>
        <p class="label">Customer Name</p>
        <p>${escapeHtml(order.customerName)}</p>
        <p class="label">Customer Mobile</p>
        <p>${escapeHtml(order.customerMobile)}</p>
      </div>
      <div>
        <p class="label">Status</p>
        <p>${escapeHtml(order.status)} · ${paymentStatusBadge}</p>
        ${
          order.deliveryAddress
            ? `<p class="label">Delivery Address</p><p>${escapeHtml(order.deliveryAddress)}</p>`
            : ""
        }
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th class="num">Qty</th>
          <th class="num">Price</th>
          <th class="num">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="totals">
      <p>Subtotal: <strong>${formatINR(order.subtotal)}</strong></p>
      ${discountRow}
      <p class="grand">Final Amount: ${formatINR(finalAmount)}</p>
    </div>

    <div class="payment-box">
      <div class="head">Payment Details</div>
      <div class="row">
        <span class="label">Total Order Bill</span>
        <span class="val">${formatINR(finalAmount)}</span>
      </div>
      <div class="row">
        <span class="label">Total Paid Amount</span>
        <span class="val" style="color: #15803d; font-weight: 700;">${formatINR(paid)}</span>
      </div>
      ${
        cashPaid > 0
          ? `<div class="row"><span class="label">Cash Received</span><span class="val">${formatINR(cashPaid)}</span></div>`
          : ""
      }
      ${
        onlinePaid > 0
          ? `<div class="row"><span class="label">Online Received</span><span class="val">${formatINR(onlinePaid)}</span></div>`
          : ""
      }
      ${
        excessPaid > 0
          ? `<div class="row" style="background: #f0fdf4;">
              <span class="label" style="color: #15803d; font-weight: 600;">↳ Applied to Previous Dues (पुरानी बकाया चुकता)</span>
              <span class="val" style="color: #15803d; font-weight: 700;">${formatINR(excessPaid)}</span>
             </div>
             <div class="row">
              <span class="label">↳ Applied to This Order Bill</span>
              <span class="val" style="font-weight: 700;">${formatINR(thisBillPaid)} (PAID)</span>
             </div>`
          : ""
      }
      <div class="row">
        <span class="label">Payment Status</span>
        <span class="val">${paymentStatusBadge}</span>
      </div>
      ${dueRow}
    </div>

    <div class="footer">
      <p>Thank you for your valuable business 🙏</p>
      <p>आपके विश्वास और सहयोग के लिए M/S SUSHANT CONSTRUCTION आपका आभारी है।</p>
      <p>हम हमेशा बेहतर गुणवत्ता और भरोसेमंद सेवा देने के लिए प्रतिबद्ध हैं।</p>
      <p>Visit us again and experience the best construction material service.</p>
      <p class="tagline">${escapeHtml(bizName)}</p>
      ${bizAddr ? `<p>${escapeHtml(bizAddr)}</p>` : ""}
      ${bizPhone ? `<p>📞 ${escapeHtml(bizPhone)}</p>` : ""}
    </div>
  </div>
</body>
</html>`;
}

const s = StyleSheet.create({
  page: { gap: 14, paddingBottom: 48 },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  flex: { flex: 1 },
  cartBadgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cartBadgeText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 12,
  },
  stepsHeader: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "rgba(15, 23, 42, 0.05)",
    padding: 4,
    borderRadius: 12,
  },
  stepPill: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "rgba(15, 23, 42, 0.06)",
  },
  stepPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  stepPillActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  gap: {
    gap: 12,
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  productCardGrid: {
    width: "48%",
    padding: 10,
    borderWidth: 1,
    borderRadius: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 5,
  },
  imageWrapper: {
    width: "100%",
    aspectRatio: 1.15,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  stockBadge: {
    position: "absolute",
    left: 6,
    top: 6,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  stockText: {
    fontSize: 9,
    fontWeight: "800",
  },
  inCartBadge: {
    position: "absolute",
    right: 6,
    top: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  inCartBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  productName: {
    fontSize: 13,
    fontWeight: "700",
    minHeight: 34,
    lineHeight: 17,
  },
  priceBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    flexWrap: "wrap",
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 13.5,
    fontWeight: "900",
  },
  unitText: {
    fontSize: 11,
    fontWeight: "600",
  },
  mrpText: {
    fontSize: 10.5,
    textDecorationLine: "line-through",
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  qtyInputBox: {
    flex: 1.1,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 6,
  },
  directQtyInput: {
    flex: 1,
    height: "100%",
    paddingVertical: 0,
    fontWeight: "700",
    fontSize: 13,
    textAlign: "center",
  },
  unitSuffix: {
    fontSize: 9.5,
    fontWeight: "700",
    marginLeft: 2,
  },
  addCartBtn: {
    flex: 1,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 9,
    paddingHorizontal: 4,
  },
  addCartBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  disabledBtn: {
    opacity: 0.5,
    backgroundColor: "#94a3b8",
  },
  cartItemCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  cartItemThumb: {
    width: 60,
    height: 70,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  cartQtyControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cartQtyInput: {
    width: 48,
    height: 32,
    paddingHorizontal: 4,
    paddingVertical: 0,
    textAlign: "center",
    borderWidth: 1,
    borderRadius: 7,
    fontWeight: "800",
    fontSize: 12,
  },
  stepperBtn: {
    width: 28,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 7,
  },
  stepperBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  dueAlertBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  modeSelector: {
    flexDirection: "row",
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    borderRadius: 10,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  successIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  orderNumberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  orderNumberText: {
    fontSize: 16,
    fontWeight: "800",
  },
  adminOrderBadge: {
    backgroundColor: "#e0f2fe",
    borderColor: "#bae6fd",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminOrderBadgeText: {
    color: "#0369a1",
    fontSize: 10,
    fontWeight: "800",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },
  actionSmallBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
});
