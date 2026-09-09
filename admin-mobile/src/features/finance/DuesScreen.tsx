import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useNetInfo } from "@react-native-community/netinfo";
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
  ModalShell,
  StatusBadge,
} from "@/components/ui";
import { useTheme } from "@/theme";
import { formatDateTime, formatINR } from "@/utils/formatters";
import { statementPdf, statementPdfFilename } from "@/features/insights/pdfReports";
import type { Product } from "@/features/products/types";
import { useProductMutations } from "@/features/products/useProducts";
import { financeService } from "./financeService";
import type { CustomerDetail, DueCustomer, PaymentMode } from "./types";
import {
  useCustomerDue,
  useDueSnapshot,
  useFinanceMutations,
  useKhatabookAuthStatus,
  useKhatabookProfit,
  useKhatabookStock,
} from "./useFinance";

export function DuesScreen() {
  const t = useTheme();
  const net = useNetInfo();
  const mut = useFinanceMutations();

  // Security Lock State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinVerifying, setPinVerifying] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);

  // Auth status query
  const authStatusQ = useKhatabookAuthStatus();
  const authStatus = authStatusQ.data;

  // Change PIN Modal State
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [recoveryEmailInput, setRecoveryEmailInput] = useState("");
  const [changePinSaving, setChangePinSaving] = useState(false);
  const [changePinError, setChangePinError] = useState<string | null>(null);
  const [changePinSuccess, setChangePinSuccess] = useState<string | null>(null);

  // Forgot PIN / Gmail OTP Modal State
  const [showForgotPinModal, setShowForgotPinModal] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [resetNewPin, setResetNewPin] = useState("");
  const [resetConfirmPin, setResetConfirmPin] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Tabs: "customers" (ग्राहक खाता) | "profit" (मुनाफा खाता) | "stock" (स्टॉक खाता)
  const [activeTab, setActiveTab] = useState<"customers" | "profit" | "stock">("customers");

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [filterDueOnly, setFilterDueOnly] = useState<"ALL" | "DUE" | "CLEARED">("ALL");

  // Stock Filter State
  const [stockSearch, setStockSearch] = useState("");
  const [stockCategory, setStockCategory] = useState("ALL");

  // Stock Action Modals State
  const [selectedAddProduct, setSelectedAddProduct] = useState<Product | null>(null);
  const [selectedRemoveProduct, setSelectedRemoveProduct] = useState<Product | null>(null);

  // Customer Ledger / Passbook Modal State
  const [selectedMobile, setSelectedMobile] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Quick Payment Modal State
  const [payCustomer, setPayCustomer] = useState<{
    customerName: string;
    customerMobile: string;
    totalDue: number;
    totalPurchase: number;
    totalPaid: number;
  } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<PaymentMode>("CASH");
  const [payDate, setPayDate] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Profit Khata Date Filter
  const [profitFromInput, setProfitFromInput] = useState("");
  const [profitToInput, setProfitToInput] = useState("");
  const [appliedProfitFrom, setAppliedProfitFrom] = useState("");
  const [appliedProfitTo, setAppliedProfitTo] = useState("");
  const [profitDatePreset, setProfitDatePreset] = useState<"ALL" | "TODAY" | "THIS_MONTH" | "CUSTOM">("ALL");
  const [showProfitDateModal, setShowProfitDateModal] = useState(false);
  const [profitFilterError, setProfitFilterError] = useState<string | null>(null);

  const getTodayIso = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getMonthStartIso = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  };

  const applyProfitDateFilter = (from: string, to: string, preset: "ALL" | "TODAY" | "THIS_MONTH" | "CUSTOM") => {
    setAppliedProfitFrom(from);
    setAppliedProfitTo(to);
    setProfitFromInput(from);
    setProfitToInput(to);
    setProfitDatePreset(preset);
  };

  const profitFilters = useMemo(() => {
    if (appliedProfitFrom || appliedProfitTo) {
      return { from: appliedProfitFrom || undefined, to: appliedProfitTo || undefined };
    }
    return undefined;
  }, [appliedProfitFrom, appliedProfitTo]);

  // Data Queries (Active only when unlocked)
  const duesQ = useDueSnapshot({ search: "", dateRange: "", paymentStatus: "", from: "", to: "" }, isUnlocked);
  const stockQ = useKhatabookStock(isUnlocked);
  const profitQ = useKhatabookProfit(profitFilters, isUnlocked);

  // Automatically refresh Khatabook ledger, stock and profit upon screen focus
  useFocusEffect(
    useCallback(() => {
      if (isUnlocked) {
        void duesQ.refetch();
        void stockQ.refetch();
        void profitQ.refetch();
      }
    }, [isUnlocked])
  );

  const customers = duesQ.data ?? [];
  const products = stockQ.data ?? [];

  // Update recovery email default when authStatus changes
  useEffect(() => {
    if (authStatus?.recoveryEmail) {
      setRecoveryEmailInput(authStatus.recoveryEmail);
    }
  }, [authStatus?.recoveryEmail]);

  // Verify PIN
  const handleVerifyPin = async () => {
    if (!pinInput.trim()) {
      setPinError("कृपया सुरक्षा पिन दर्ज करें (Enter PIN)");
      return;
    }
    setPinVerifying(true);
    setPinError(null);
    try {
      await mut.verifyPin.mutateAsync(pinInput.trim());
      setIsUnlocked(true);
      setPinInput("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "गलत पिन! कृपया पुनः प्रयास करें।";
      setPinError(msg);
    } finally {
      setPinVerifying(false);
    }
  };

  // Lock Khatabook
  const handleLock = () => {
    setIsUnlocked(false);
    setPinInput("");
    setPinError(null);
  };

  // Refresh data
  const handleRefresh = async () => {
    await Promise.allSettled([duesQ.refetch(), stockQ.refetch(), authStatusQ.refetch()]);
  };

  // Change PIN handler
  const handleChangePin = async () => {
    if (newPin.trim() && newPin.trim().length < 4) {
      setChangePinError("नया पिन कम से कम 4 अंकों का होना चाहिए");
      return;
    }
    if (newPin.trim() && newPin !== confirmPin) {
      setChangePinError("नया पिन और पुष्टि पिन मेल नहीं खाते");
      return;
    }
    if (recoveryEmailInput.trim() && (!recoveryEmailInput.includes("@") || !recoveryEmailInput.includes("."))) {
      setChangePinError("कृपया सही रिकवरी जीमेल (Gmail) दर्ज करें");
      return;
    }

    setChangePinSaving(true);
    setChangePinError(null);
    setChangePinSuccess(null);
    try {
      const res = await mut.changePin.mutateAsync({
        currentPin: currentPin.trim() || undefined,
        adminPassword: adminPassword.trim() || undefined,
        newPin: newPin.trim() || undefined,
        recoveryEmail: recoveryEmailInput.trim() || undefined,
      });
      setChangePinSuccess(res.message || "सुरक्षा सेटिंग्स सफलतापूर्वक सुरक्षित हो गई!");
      setTimeout(() => {
        setShowChangePinModal(false);
        setCurrentPin("");
        setAdminPassword("");
        setNewPin("");
        setConfirmPin("");
        setChangePinSuccess(null);
      }, 1200);
    } catch (err: unknown) {
      setChangePinError(err instanceof Error ? err.message : "पिन या ईमेल सुरक्षित करने में त्रुटि हुई");
    } finally {
      setChangePinSaving(false);
    }
  };

  // Request OTP for Forgot PIN
  const handleRequestOtp = async () => {
    setOtpSending(true);
    setResetError(null);
    try {
      await mut.forgotPin.mutateAsync();
      setOtpSent(true);
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "OTP भेजने में त्रुटि हुई");
    } finally {
      setOtpSending(false);
    }
  };

  // Reset PIN with OTP
  const handleResetPinWithOtp = async () => {
    if (!otpInput.trim() || otpInput.trim().length !== 6) {
      setResetError("कृपया 6-अंकीय मान्य OTP दर्ज करें");
      return;
    }
    if (!resetNewPin.trim() || resetNewPin.trim().length < 4) {
      setResetError("नया पिन कम से कम 4 अंकों का होना चाहिए");
      return;
    }
    if (resetNewPin !== resetConfirmPin) {
      setResetError("नया पिन और पुष्टि पिन मेल नहीं खाते");
      return;
    }

    setResetSaving(true);
    setResetError(null);
    try {
      await mut.resetPin.mutateAsync({
        otp: otpInput.trim(),
        newPin: resetNewPin.trim(),
      });
      setShowForgotPinModal(false);
      setOtpSent(false);
      setOtpInput("");
      setResetNewPin("");
      setResetConfirmPin("");
      setIsUnlocked(true);
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "पिन रीसेट विफल रहा");
    } finally {
      setResetSaving(false);
    }
  };

  // Open Passbook Modal
  const openPassbook = async (mobile: string) => {
    setSelectedMobile(mobile);
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await financeService.customer(mobile);
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // Open Payment Modal
  const openPaymentModal = (cust: {
    customerName: string;
    customerMobile: string;
    totalDue: number;
    totalPurchase: number;
    totalPaid: number;
  }) => {
    setPayCustomer(cust);
    setPayAmount(cust.totalDue > 0 ? String(cust.totalDue) : "");
    setPayMode("CASH");
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayNotes("");
    setPayError(null);
  };

  // Save Payment
  const handleSavePayment = async () => {
    if (!payCustomer) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      setPayError("कृपया सही राशि दर्ज करें (Enter valid amount)");
      return;
    }
    setPaySaving(true);
    setPayError(null);
    try {
      await mut.customerPayment.mutateAsync({
        mobile: payCustomer.customerMobile,
        p: {
          amount: amt,
          paymentMode: payMode,
          paymentDate: payDate || undefined,
          notes: payNotes || undefined,
        },
      });
      const savedMobile = payCustomer.customerMobile;
      setPayCustomer(null);
      setPayAmount("");
      if (selectedMobile === savedMobile) {
        openPassbook(savedMobile);
      }
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : "भुगतान दर्ज करने में त्रुटि हुई");
    } finally {
      setPaySaving(false);
    }
  };

  // Share Statement PDF
  const handleDownloadPdf = async (mobile: string) => {
    setPdfGenerating(true);
    try {
      const statementData = await financeService.statement(mobile);
      const html = statementPdf(statementData);
      const file = await Print.printToFileAsync({ html });
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error("Sharing is not available on this device");
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/pdf",
        dialogTitle: statementPdfFilename(mobile),
      });
    } catch {
      // Handled gracefully
    } finally {
      setPdfGenerating(false);
    }
  };

  // Calculated Aggregations
  const totalMarketDue = useMemo(
    () => customers.reduce((s, c) => s + Math.max(0, c.totalDue), 0),
    [customers]
  );
  const totalPaid = useMemo(
    () => customers.reduce((s, c) => s + c.totalPaid, 0),
    [customers]
  );
  const customersWithDue = useMemo(
    () => customers.filter((c) => c.totalDue > 0).length,
    [customers]
  );
  const lowStockCount = useMemo(
    () => products.filter((p) => p.stock > 0 && p.stock <= 10).length,
    [products]
  );
  const outOfStockCount = useMemo(
    () => products.filter((p) => p.stock <= 0).length,
    [products]
  );

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (filterDueOnly === "DUE" && c.totalDue <= 0) return false;
      if (filterDueOnly === "CLEARED" && c.totalDue > 0) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const nameMatch = c.customerName.toLowerCase().includes(q);
        const phoneMatch = c.customerMobile.includes(q);
        if (!nameMatch && !phoneMatch) return false;
      }
      return true;
    });
  }, [customers, filterDueOnly, search]);

  // Filtered Stock
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category?.name) cats.add(p.category.name);
    });
    return Array.from(cats);
  }, [products]);

  const filteredStock = useMemo(() => {
    return products.filter((p) => {
      if (stockCategory !== "ALL" && p.category?.name !== stockCategory) return false;
      if (stockSearch.trim()) {
        const q = stockSearch.trim().toLowerCase();
        if (!p.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [products, stockCategory, stockSearch]);

  // ==========================================
  // VIEW 1: LOCKED SCREEN (ENTER PIN TO OPEN)
  // ==========================================
  if (!isUnlocked) {
    return (
      <Screen centered contentStyle={s.lockScreen}>
        <Card style={s.lockCard}>
          {/* Header Icon */}
          <View style={s.lockIconWrapper}>
            <Ionicons name="lock-closed" size={38} color="#ffffff" />
          </View>

          <View style={s.lockBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#991b1b" />
            <AppText role="caption" style={{ color: "#991b1b", fontWeight: "700" }}>
              सुरक्षित खाताबुक (Protected Ledger)
            </AppText>
          </View>

          <AppText role="pageTitle" style={{ textAlign: "center", fontSize: 22 }}>
            खाताबुक पिन दर्ज करें
          </AppText>
          <AppText style={{ textAlign: "center", color: t.colors.textSecondary, fontSize: 12 }}>
            ग्राहक उधारी, लेनदेन एवं स्टॉक बैलेंस देखने के लिए अपना गोपनीय सुरक्षा पिन दर्ज करें।
          </AppText>

          {pinError && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#991b1b" />
              <AppText style={{ color: "#991b1b", fontSize: 12, flex: 1, fontWeight: "600" }}>
                {pinError}
              </AppText>
            </View>
          )}

          {/* PIN Input */}
          <View style={{ gap: 6 }}>
            <AppText role="label">सुरक्षा पिन (Security PIN) *</AppText>
            <View style={[s.pinInputWrap, { borderColor: pinError ? t.colors.danger : t.colors.border }]}>
              <TextInput
                secureTextEntry={!showPin}
                maxLength={8}
                keyboardType="number-pad"
                value={pinInput}
                onChangeText={(val) => {
                  setPinInput(val);
                  if (pinError) setPinError(null);
                }}
                placeholder="••••"
                placeholderTextColor={t.colors.placeholder}
                style={[s.pinInput, { color: t.colors.text }]}
              />
              <Pressable
                onPress={() => setShowPin(!showPin)}
                hitSlop={8}
                style={{ padding: 6 }}
              >
                <Ionicons
                  name={showPin ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={t.colors.textMuted}
                />
              </Pressable>
            </View>
          </View>

          <Button
            title={pinVerifying ? "सत्यापित हो रहा है…" : "🔓 खाताबुक खोलें (Unlock Khatabook)"}
            loading={pinVerifying}
            disabled={!pinInput.trim() || pinVerifying}
            onPress={handleVerifyPin}
            style={{ backgroundColor: "#dc2626" }}
          />

          {/* Forgot PIN / Reset Link */}
          <View style={s.forgotWrap}>
            <Pressable
              onPress={() => {
                setShowForgotPinModal(true);
                setResetError(null);
              }}
              style={s.rowAlign}
            >
              <Ionicons name="mail-outline" size={14} color="#dc2626" />
              <AppText style={{ color: "#dc2626", fontWeight: "700", fontSize: 12 }}>
                पिन भूल गए? Gmail पर OTP भेजें (Forgot PIN)
              </AppText>
            </Pressable>
            <AppText style={{ color: t.colors.textMuted, fontSize: 10, textAlign: "center" }}>
              OTP आपके पंजीकृत Gmail ({authStatus?.maskedEmail || "Admin Gmail"}) पर भेजा जाएगा।
            </AppText>
          </View>
        </Card>

        {/* FORGOT PIN / GMAIL OTP MODAL */}
        <ModalShell
          visible={showForgotPinModal}
          onClose={() => setShowForgotPinModal(false)}
          title="खाताबुक पिन रीसेट करें"
        >
          <View style={{ gap: 14 }}>
            {resetError && (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#991b1b" />
                <AppText style={{ color: "#991b1b", fontSize: 12, flex: 1 }}>
                  {resetError}
                </AppText>
              </View>
            )}

            {!otpSent ? (
              <View style={{ gap: 12 }}>
                <View style={[s.infoBox, { backgroundColor: t.colors.surfaceMuted }]}>
                  <AppText style={{ fontSize: 12, color: t.colors.text }}>
                    हम आपके पंजीकृत एडमिन Gmail पर 6-अंकीय गोपनीय OTP भेजेंगे:
                  </AppText>
                  <AppText style={{ color: "#dc2626", fontWeight: "700", fontSize: 13 }}>
                    📧 {authStatus?.maskedEmail || "Admin Gmail"}
                  </AppText>
                  <AppText style={{ color: t.colors.textMuted, fontSize: 11 }}>
                    OTP प्राप्त होने के बाद आप नया 4-अंकीय पिन सेट कर सकते हैं।
                  </AppText>
                </View>

                <Button
                  title={otpSending ? "OTP भेजा जा रहा है…" : "📩 Gmail पर OTP भेजें (Send OTP)"}
                  loading={otpSending}
                  disabled={otpSending}
                  onPress={handleRequestOtp}
                  style={{ backgroundColor: "#dc2626" }}
                />
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <View style={[s.successBox, { backgroundColor: "#ecfdf5" }]}>
                  <AppText style={{ color: "#065f46", fontWeight: "700", fontSize: 12 }}>
                    ✓ OTP सफलता से भेज दिया गया है!
                  </AppText>
                  <AppText style={{ color: "#047857", fontSize: 11 }}>
                    कृपया अपना Gmail चेक करें और 6-अंकीय कोड दर्ज करें।
                  </AppText>
                </View>

                <Input
                  label="6-अंकीय OTP (Enter OTP from Gmail) *"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otpInput}
                  onChangeText={setOtpInput}
                  placeholder="उदा. 849201"
                />

                <Input
                  label="नया पिन (New 4-digit PIN) *"
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={8}
                  value={resetNewPin}
                  onChangeText={setResetNewPin}
                  placeholder="••••"
                />

                <Input
                  label="नया पिन दोबारा दर्ज करें (Confirm New PIN) *"
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={8}
                  value={resetConfirmPin}
                  onChangeText={setResetConfirmPin}
                  placeholder="••••"
                />

                <View style={s.rowBetween}>
                  <Button
                    title={otpSending ? "भेज रहा है…" : "OTP दोबारा भेजें"}
                    variant="ghost"
                    disabled={otpSending}
                    onPress={handleRequestOtp}
                  />
                  <Button
                    title={resetSaving ? "रीसेट हो रहा है…" : "✓ पिन रीसेट करें और खोलें"}
                    loading={resetSaving}
                    disabled={resetSaving || !otpInput.trim() || !resetNewPin.trim()}
                    onPress={handleResetPinWithOtp}
                    style={{ backgroundColor: "#dc2626" }}
                  />
                </View>
              </View>
            )}
          </View>
        </ModalShell>
      </Screen>
    );
  }

  // ==========================================
  // VIEW 2: UNLOCKED KHATABOOK DASHBOARD
  // ==========================================
  return (
    <Screen
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={duesQ.isRefetching || stockQ.isRefetching}
            onRefresh={handleRefresh}
            colors={[t.colors.brand]}
            tintColor={t.colors.brand}
          />
        ),
      }}
      contentStyle={[s.page, { paddingBottom: 60 }]}
    >
      {/* Top Banner Header */}
      <View style={s.bannerHeader}>
        <View style={s.bannerBadge}>
          <Ionicons name="book" size={13} color="#fca5a5" />
          <AppText style={{ color: "#fca5a5", fontSize: 11, fontWeight: "700" }}>
            डिजिटल खाताबुक (Digital Khatabook)
          </AppText>
          <AppText style={{ color: "#94a3b8", fontSize: 11 }}>· M/S Sushant</AppText>
        </View>

        <AppText style={s.bannerTitle}>खाताबुक और उधारी लेजर</AppText>
        <AppText style={s.bannerSubtitle}>
          सभी ग्राहकों का उधारी हिसाब-किताब, पैसा जमा, WhatsApp पेमेंट रिमाइंडर और गोदाम स्टॉक खाता।
        </AppText>

        {/* Action buttons */}
        <View style={s.bannerActions}>
          <Pressable
            onPress={() => {
              setShowChangePinModal(true);
              setChangePinError(null);
              setChangePinSuccess(null);
            }}
            style={s.actionChip}
          >
            <Ionicons name="key" size={13} color="#fbbf24" />
            <AppText style={s.actionChipText}>पिन बदलें</AppText>
          </Pressable>

          <Pressable onPress={handleLock} style={[s.actionChip, { borderColor: "#991b1b" }]}>
            <Ionicons name="lock-closed" size={13} color="#f87171" />
            <AppText style={[s.actionChipText, { color: "#f87171" }]}>लॉक करें</AppText>
          </Pressable>

          <Pressable onPress={handleRefresh} style={s.actionChip}>
            <Ionicons name="refresh" size={13} color="#e2e8f0" />
            <AppText style={s.actionChipText}>रिफ्रेश</AppText>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(admin)/place-order" as never)}
            style={[s.actionChip, { backgroundColor: "#059669", borderColor: "#059669" }]}
          >
            <Ionicons name="cart" size={13} color="#ffffff" />
            <AppText style={[s.actionChipText, { color: "#ffffff", fontWeight: "700" }]}>
              + ग्राहक ऑर्डर
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(admin)/billing" as never)}
            style={s.actionChip}
          >
            <Ionicons name="document-text" size={13} color="#e2e8f0" />
            <AppText style={s.actionChipText}>
              बिलिंग
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* Offline Alert */}
      {net.isConnected === false && (
        <Card style={{ backgroundColor: t.colors.warningSoft }}>
          <View style={s.rowAlign}>
            <Ionicons name="cloud-offline" size={16} color={t.colors.warning} />
            <AppText role="caption" style={{ color: t.colors.warning, flex: 1 }}>
              Offline · cached balances may be stale.
            </AppText>
          </View>
        </Card>
      )}

      {/* 4 Hero Financial KPI Cards */}
      <View style={s.kpiGrid}>
        {/* Total Market Due */}
        <View style={[s.kpiCard, { borderColor: "#fecaca", backgroundColor: "#fef2f2" }]}>
          <View style={s.kpiTopRow}>
            <AppText numberOfLines={1} style={{ color: "#b91c1c", fontSize: 11, fontWeight: "800", flex: 1, marginRight: 6 }}>
              मार्केट में कुल बाकी
            </AppText>
            <View style={[s.kpiIconBox, { backgroundColor: "#fee2e2" }]}>
              <Ionicons name="trending-down" size={16} color="#dc2626" />
            </View>
          </View>
          <AppText style={{ color: "#dc2626", fontSize: 20, fontWeight: "900", marginTop: 4 }}>
            {formatINR(totalMarketDue)}
          </AppText>
          <AppText numberOfLines={1} style={{ color: "#991b1b", fontSize: 10, marginTop: 2 }}>
            {customersWithDue} ग्राहकों से बाकी है
          </AppText>
        </View>

        {/* Total Collected */}
        <View style={[s.kpiCard, { borderColor: "#a7f3d0", backgroundColor: "#ecfdf5" }]}>
          <View style={s.kpiTopRow}>
            <AppText numberOfLines={1} style={{ color: "#047857", fontSize: 11, fontWeight: "800", flex: 1, marginRight: 6 }}>
              कुल जमा राशि
            </AppText>
            <View style={[s.kpiIconBox, { backgroundColor: "#d1fae5" }]}>
              <Ionicons name="trending-up" size={16} color="#059669" />
            </View>
          </View>
          <AppText style={{ color: "#059669", fontSize: 20, fontWeight: "900", marginTop: 4 }}>
            {formatINR(totalPaid)}
          </AppText>
          <AppText numberOfLines={1} style={{ color: "#065f46", fontSize: 10, marginTop: 2 }}>
            प्राप्त पेमेंट (Collected)
          </AppText>
        </View>

        {/* Total Customers */}
        <View style={[s.kpiCard, { borderColor: t.colors.border, backgroundColor: t.colors.surfaceElevated }]}>
          <View style={s.kpiTopRow}>
            <AppText numberOfLines={1} style={{ color: t.colors.textSecondary, fontSize: 11, fontWeight: "800", flex: 1, marginRight: 6 }}>
              कुल खाता ग्राहक
            </AppText>
            <View style={[s.kpiIconBox, { backgroundColor: "rgba(37, 99, 235, 0.15)" }]}>
              <Ionicons name="people" size={16} color="#3b82f6" />
            </View>
          </View>
          <AppText style={{ color: t.colors.text, fontSize: 20, fontWeight: "900", marginTop: 4 }}>
            {customers.length}
          </AppText>
          <AppText numberOfLines={1} style={{ color: t.colors.textMuted, fontSize: 10, marginTop: 2 }}>
            दर्ज ग्राहक खाते (Ledger)
          </AppText>
        </View>

        {/* Low Stock Warning */}
        <View style={[s.kpiCard, { borderColor: t.colors.border, backgroundColor: t.colors.surfaceElevated }]}>
          <View style={s.kpiTopRow}>
            <AppText numberOfLines={1} style={{ color: t.colors.textSecondary, fontSize: 11, fontWeight: "800", flex: 1, marginRight: 6 }}>
              गोदाम स्टॉक चेतावनी
            </AppText>
            <View style={[s.kpiIconBox, { backgroundColor: "rgba(217, 119, 6, 0.15)" }]}>
              <Ionicons name="cube" size={16} color="#f59e0b" />
            </View>
          </View>
          <AppText style={{ color: "#d97706", fontSize: 20, fontWeight: "900", marginTop: 4 }}>
            {lowStockCount} Items
          </AppText>
          <AppText numberOfLines={1} style={{ color: t.colors.textMuted, fontSize: 10, marginTop: 2 }}>
            कम यूनिट बची सामग्रियां
          </AppText>
        </View>
      </View>

      {/* Modern Segmented Tab Switcher */}
      <View style={s.segmentedWrap}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === "customers" }}
          onPress={() => setActiveTab("customers")}
          style={[
            s.segmentedItem,
            activeTab === "customers" && s.segmentedItemActive,
          ]}
        >
          <Ionicons
            name="people-outline"
            size={16}
            color={activeTab === "customers" ? "#ffffff" : t.colors.textSecondary}
          />
          <AppText
            numberOfLines={1}
            style={[
              s.segmentedLabel,
              {
                color: activeTab === "customers" ? "#ffffff" : t.colors.textSecondary,
                fontWeight: activeTab === "customers" ? "800" : "600",
              },
            ]}
          >
            ग्राहक खाता
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === "profit" }}
          onPress={() => {
            setActiveTab("profit");
            void profitQ.refetch();
          }}
          style={[
            s.segmentedItem,
            activeTab === "profit" && s.segmentedItemActive,
          ]}
        >
          <Ionicons
            name="trending-up-outline"
            size={16}
            color={activeTab === "profit" ? "#ffffff" : t.colors.textSecondary}
          />
          <AppText
            numberOfLines={1}
            style={[
              s.segmentedLabel,
              {
                color: activeTab === "profit" ? "#ffffff" : t.colors.textSecondary,
                fontWeight: activeTab === "profit" ? "800" : "600",
              },
            ]}
          >
            मुनाफा खाता
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === "stock" }}
          onPress={() => setActiveTab("stock")}
          style={[
            s.segmentedItem,
            activeTab === "stock" && s.segmentedItemActive,
          ]}
        >
          <Ionicons
            name="cube-outline"
            size={16}
            color={activeTab === "stock" ? "#ffffff" : t.colors.textSecondary}
          />
          <AppText
            numberOfLines={1}
            style={[
              s.segmentedLabel,
              {
                color: activeTab === "stock" ? "#ffffff" : t.colors.textSecondary,
                fontWeight: activeTab === "stock" ? "800" : "600",
              },
            ]}
          >
            गोदाम स्टॉक
          </AppText>
        </Pressable>
      </View>

      {/* ========================================== */}
      {/* TAB 1: CUSTOMER KHATA                      */}
      {/* ========================================== */}
      {activeTab === "customers" && (
        <View style={{ gap: 12 }}>
          {/* Search & Filter Bar */}
          <Card style={{ gap: 10 }}>
            <View style={s.rowAlign}>
              <View style={{ flex: 1 }}>
                <Input
                  placeholder="ग्राहक का नाम या मोबाइल नंबर खोजें..."
                  value={search}
                  onChangeText={setSearch}
                  prefix={<Ionicons name="search" size={18} color={t.colors.textMuted} />}
                  suffix={
                    search ? (
                      <Pressable onPress={() => setSearch("")} hitSlop={8}>
                        <Ionicons name="close-circle" size={18} color={t.colors.textMuted} />
                      </Pressable>
                    ) : null
                  }
                />
              </View>
            </View>

            {/* Filter Chips */}
            <View style={s.filterChipsWrap}>
              <FilterChip
                label={`सभी (${customers.length})`}
                selected={filterDueOnly === "ALL"}
                onPress={() => setFilterDueOnly("ALL")}
              />
              <FilterChip
                label={`बाकी वाले (${customersWithDue})`}
                selected={filterDueOnly === "DUE"}
                onPress={() => setFilterDueOnly("DUE")}
              />
              <FilterChip
                label={`क्लियर खाता (${customers.length - customersWithDue})`}
                selected={filterDueOnly === "CLEARED"}
                onPress={() => setFilterDueOnly("CLEARED")}
              />
            </View>
          </Card>

          {/* Customers List */}
          {duesQ.isPending ? (
            <LoadingState label="खाताबुक लोड हो रहा है…" />
          ) : duesQ.isError ? (
            <ErrorState
              description={duesQ.error?.message ?? "Failed to load Khatabook ledger"}
              onRetry={() => duesQ.refetch()}
            />
          ) : filteredCustomers.length === 0 ? (
            <EmptyState
              title="कोई ग्राहक खाता नहीं मिला"
              description="कृपया अलग नाम या नंबर से सर्च करें।"
            />
          ) : (
            <FlatList
              data={filteredCustomers}
              scrollEnabled={false}
              keyExtractor={(c) => c.customerMobile}
              contentContainerStyle={{ gap: 10 }}
              renderItem={({ item: c }) => {
                const hasDue = c.totalDue > 0;
                const cleanPhone = c.customerMobile.replace(/\D/g, "");
                const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                  `नमस्ते ${c.customerName} जी, M/S Sushant Construction की तरफ से आपका कुल बकाया ₹${c.totalDue.toLocaleString(
                    "en-IN"
                  )} है। कृपया समय पर भुगतान करने की कृपा करें। धन्यवाद! \n\n- M/S Sushant Construction`
                )}`;

                return (
                  <Card style={s.customerCard}>
                    {/* Header: Name, Mobile, Status */}
                    <View style={s.rowBetween}>
                      <View style={{ flex: 1 }}>
                        <AppText role="bodyStrong" numberOfLines={1} style={{ fontSize: 15 }}>
                          {c.customerName}
                        </AppText>
                        <AppText style={{ color: t.colors.textSecondary, fontSize: 12 }}>
                          {c.customerMobile} · {c.totalOrders} ऑर्डर्स
                        </AppText>
                      </View>
                      <StatusBadge
                        label={hasDue ? "बाकी (DUE)" : "साफ खाता (PAID)"}
                        tone={hasDue ? "danger" : "success"}
                      />
                    </View>

                    {/* Financial stats row */}
                    <View style={s.custStatsRow}>
                      <View style={{ flex: 1 }}>
                        <AppText style={{ color: t.colors.textMuted, fontSize: 10 }}>कुल ख़रीद</AppText>
                        <AppText style={{ fontWeight: "700", fontSize: 12 }}>
                          {formatINR(c.totalPurchase)}
                        </AppText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText style={{ color: t.colors.textMuted, fontSize: 10 }}>कुल जमा</AppText>
                        <AppText style={{ color: "#059669", fontWeight: "700", fontSize: 12 }}>
                          {formatINR(c.totalPaid)}
                        </AppText>
                      </View>
                      <View style={{ flex: 1, alignItems: "flex-end" }}>
                        <AppText style={{ color: t.colors.textMuted, fontSize: 10 }}>बाकी उधारी</AppText>
                        <AppText
                          style={{
                            color: hasDue ? "#dc2626" : "#059669",
                            fontWeight: "900",
                            fontSize: 14,
                          }}
                        >
                          {formatINR(c.totalDue)}
                        </AppText>
                      </View>
                    </View>

                    <Divider />

                    {/* Action buttons */}
                    <View style={s.custActionsRow}>
                      {hasDue && (
                        <Pressable
                          onPress={() => openPaymentModal(c)}
                          style={[s.btnSmall, { backgroundColor: "#059669" }]}
                        >
                          <Ionicons name="wallet-outline" size={13} color="#ffffff" />
                          <AppText style={{ color: "#ffffff", fontSize: 11, fontWeight: "700" }}>
                            + जमा करें
                          </AppText>
                        </Pressable>
                      )}

                      {hasDue && (
                        <Pressable
                          onPress={() => void Linking.openURL(whatsappUrl)}
                          style={[s.btnSmall, { backgroundColor: "#22c55e" }]}
                        >
                          <Ionicons name="logo-whatsapp" size={13} color="#ffffff" />
                          <AppText style={{ color: "#ffffff", fontSize: 11, fontWeight: "700" }}>
                            WhatsApp
                          </AppText>
                        </Pressable>
                      )}

                      <Pressable
                        onPress={() => openPassbook(c.customerMobile)}
                        style={[s.btnSmall, { backgroundColor: t.colors.surfaceMuted, borderWidth: 1, borderColor: t.colors.border }]}
                      >
                        <Ionicons name="document-text-outline" size={13} color={t.colors.text} />
                        <AppText style={{ color: t.colors.text, fontSize: 11, fontWeight: "600" }}>
                          पासबुक
                        </AppText>
                      </Pressable>

                      <Pressable
                        onPress={() => handleDownloadPdf(c.customerMobile)}
                        style={[s.btnSmall, { backgroundColor: t.colors.surfaceMuted, borderWidth: 1, borderColor: t.colors.border }]}
                      >
                        <Ionicons name="download-outline" size={13} color={t.colors.text} />
                        <AppText style={{ color: t.colors.text, fontSize: 11, fontWeight: "600" }}>
                          PDF
                        </AppText>
                      </Pressable>
                    </View>
                  </Card>
                );
              }}
            />
          )}
        </View>
      )}

      {/* ========================================== */}
      {/* TAB 2: PROFIT & LOSS KHATA (मुनाफा खाता)   */}
      {/* ========================================== */}
      {activeTab === "profit" && (
        <View style={{ gap: 14 }}>
          {profitQ.isLoading ? (
            <LoadingState label="मुनाफा व लागत हिसाब लोड हो रहा है..." />
          ) : profitQ.isError ? (
            <ErrorState description="मुनाफा लोड करने में समस्या आई" onRetry={() => void profitQ.refetch()} />
          ) : !profitQ.data ? (
            <EmptyState title="डेटा उपलब्ध नहीं है" description="मुनाफा हिसाब अभी उपलब्ध नहीं है" />
          ) : (
            <>
              {!profitQ.data.costingCoverage.isComplete && (
                <Card style={{ gap: 4, borderColor: "#f59e0b", backgroundColor: "#fffbeb" }}>
                  <AppText style={{ color: "#92400e", fontWeight: "900" }}>⚠ कुछ पुराने स्टॉक की खरीद लागत उपलब्ध नहीं है</AppText>
                  <AppText role="caption" style={{ color: "#92400e" }}>{formatINR(profitQ.data.costingCoverage.uncostedRevenue)} बिक्री को मुनाफे में शामिल नहीं किया गया।</AppText>
                </Card>
              )}

              {/* Date Range Filter Card */}
              <Card style={{ gap: 10, padding: 12 }}>
                <View style={s.rowBetween}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="calendar" size={16} color={t.colors.brand} />
                    <AppText style={{ fontSize: 13, fontWeight: "800", color: t.colors.text }}>
                      अवधि चुनें (Date Filter)
                    </AppText>
                  </View>
                  {(appliedProfitFrom || appliedProfitTo) && (
                    <Pressable onPress={() => applyProfitDateFilter("", "", "ALL")} hitSlop={8}>
                      <AppText style={{ color: "#dc2626", fontSize: 12, fontWeight: "700" }}>
                        रीसेट (Clear) ✕
                      </AppText>
                    </Pressable>
                  )}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  <FilterChip
                    label="📅 सभी (All Time)"
                    selected={profitDatePreset === "ALL"}
                    onPress={() => applyProfitDateFilter("", "", "ALL")}
                  />
                  <FilterChip
                    label="🟢 आज (Today)"
                    selected={profitDatePreset === "TODAY"}
                    onPress={() => applyProfitDateFilter(getTodayIso(), getTodayIso(), "TODAY")}
                  />
                  <FilterChip
                    label="🔵 इस महीने (This Month)"
                    selected={profitDatePreset === "THIS_MONTH"}
                    onPress={() => applyProfitDateFilter(getMonthStartIso(), getTodayIso(), "THIS_MONTH")}
                  />
                  <FilterChip
                    label={
                      appliedProfitFrom || appliedProfitTo
                        ? `🗓️ ${appliedProfitFrom || 'Start'} से ${appliedProfitTo || 'Today'}`
                        : "🗓️ तारीख से तारीख (Custom)"
                    }
                    selected={profitDatePreset === "CUSTOM"}
                    onPress={() => setShowProfitDateModal(true)}
                  />
                </ScrollView>
              </Card>

              {/* Custom Date Range Active Highlight Banner */}
              {(appliedProfitFrom || appliedProfitTo) && profitQ.data?.customRange && (
                <Card style={{ gap: 10, padding: 14, backgroundColor: "#eff6ff", borderColor: "#3b82f6", borderWidth: 1.5 }}>
                  <View style={s.rowBetween}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#3b82f6", alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="calendar-outline" size={16} color="#ffffff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText style={{ color: "#1e40af", fontWeight: "900", fontSize: 14 }}>
                          कस्टम अवधि का कुल मुनाफा
                        </AppText>
                        <AppText role="caption" style={{ color: "#3b82f6", fontWeight: "700" }}>
                          📅 {appliedProfitFrom || "शुरुआत"} से {appliedProfitTo || "आज"} तक
                        </AppText>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => setShowProfitDateModal(true)}
                      style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#bfdbfe" }}
                    >
                      <AppText style={{ color: "#1d4ed8", fontSize: 11, fontWeight: "800" }}>
                        ✏️ बदलें
                      </AppText>
                    </Pressable>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 2 }}>
                    <AppText style={{ fontSize: 26, fontWeight: "900", color: "#15803d" }}>
                      {formatINR(profitQ.data.customRange.netProfit)}
                    </AppText>
                    <AppText style={{ fontSize: 12, color: "#166534", fontWeight: "700" }}>
                      ({profitQ.data.customRange.ordersCount} ऑर्डर्स)
                    </AppText>
                  </View>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 8, borderTopWidth: 1, borderTopColor: "#bfdbfe" }}>
                    <View>
                      <AppText role="caption" style={{ color: "#64748b" }}>कुल बिक्री राजस्व</AppText>
                      <AppText style={{ color: "#1e293b", fontSize: 13, fontWeight: "800" }}>
                        {formatINR(profitQ.data.customRange.totalRevenue)}
                      </AppText>
                    </View>
                    <View>
                      <AppText role="caption" style={{ color: "#64748b" }}>क्रय लागत</AppText>
                      <AppText style={{ color: "#1e293b", fontSize: 13, fontWeight: "800" }}>
                        {formatINR(profitQ.data.customRange.totalCost)}
                      </AppText>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <AppText role="caption" style={{ color: "#64748b" }}>दी गई छूट</AppText>
                      <AppText style={{ color: "#dc2626", fontSize: 13, fontWeight: "800" }}>
                        -{formatINR(profitQ.data.customRange.discountGiven)}
                      </AppText>
                    </View>
                  </View>
                </Card>
              )}

              {/* 4 Hero KPI Cards */}
              <View style={s.kpiGrid}>
                {/* Today Profit */}
                <Card style={[s.kpiCard, { borderColor: "#10b981", backgroundColor: "#f0fdf4" }]}>
                  <View style={s.kpiTopRow}>
                    <AppText role="caption" style={{ color: "#166534", fontWeight: "800" }}>
                      आज का मुनाफा (Today)
                    </AppText>
                    <View style={[s.kpiIconBox, { backgroundColor: "#10b981" }]}>
                      <Ionicons name="trending-up" size={16} color="#ffffff" />
                    </View>
                  </View>
                  <AppText style={{ color: "#15803d", fontSize: 22, fontWeight: "900", marginTop: 4 }}>
                    {formatINR(profitQ.data.dailyProfit.netProfit)}
                  </AppText>
                  <AppText style={{ color: "#166534", fontSize: 10, marginTop: 2, fontWeight: "600" }}>
                    {profitQ.data.dailyProfit.ordersCount} ऑर्डर्स · ग्रॉस: {formatINR(profitQ.data.dailyProfit.grossProfit)}
                  </AppText>
                </Card>

                {/* Month Profit */}
                <Card style={[s.kpiCard, { borderColor: "#3b82f6", backgroundColor: "#eff6ff" }]}>
                  <View style={s.kpiTopRow}>
                    <AppText role="caption" style={{ color: "#1e40af", fontWeight: "800" }}>
                      इस महीने (This Month)
                    </AppText>
                    <View style={[s.kpiIconBox, { backgroundColor: "#3b82f6" }]}>
                      <Ionicons name="calendar-outline" size={16} color="#ffffff" />
                    </View>
                  </View>
                  <AppText style={{ color: "#1d4ed8", fontSize: 22, fontWeight: "900", marginTop: 4 }}>
                    {formatINR(profitQ.data.monthlyProfit.netProfit)}
                  </AppText>
                  <AppText style={{ color: "#1e40af", fontSize: 10, marginTop: 2, fontWeight: "600" }}>
                    {profitQ.data.monthlyProfit.ordersCount} ऑर्डर्स इस महीने
                  </AppText>
                </Card>

                {/* All-time Profit */}
                <Card style={[s.kpiCard, { borderColor: "#8b5cf6", backgroundColor: "#f5f3ff" }]}>
                  <View style={s.kpiTopRow}>
                    <AppText role="caption" style={{ color: "#5b21b6", fontWeight: "800" }}>
                      कुल मुनाफा (All-Time)
                    </AppText>
                    <View style={[s.kpiIconBox, { backgroundColor: "#8b5cf6" }]}>
                      <Ionicons name="bar-chart-outline" size={16} color="#ffffff" />
                    </View>
                  </View>
                  <AppText style={{ color: "#6d28d9", fontSize: 22, fontWeight: "900", marginTop: 4 }}>
                    {formatINR(profitQ.data.allTimeProfit.netProfit)}
                  </AppText>
                  <AppText style={{ color: "#5b21b6", fontSize: 10, marginTop: 2, fontWeight: "600" }}>
                    कुल {profitQ.data.allTimeProfit.ordersCount} ऑर्डर्स का संचयी लाभ
                  </AppText>
                </Card>

                {/* Stock Capital Value */}
                <Card style={[s.kpiCard, { borderColor: "#f59e0b", backgroundColor: "#fffbeb" }]}>
                  <View style={s.kpiTopRow}>
                    <AppText role="caption" style={{ color: "#92400e", fontWeight: "800" }}>
                      गोदाम में फंसा पैसा
                    </AppText>
                    <View style={[s.kpiIconBox, { backgroundColor: "#f59e0b" }]}>
                      <Ionicons name="layers-outline" size={16} color="#ffffff" />
                    </View>
                  </View>
                  <AppText style={{ color: "#b45309", fontSize: 22, fontWeight: "900", marginTop: 4 }}>
                    {formatINR(profitQ.data.currentStockValuation)}
                  </AppText>
                  <AppText style={{ color: "#92400e", fontSize: 10, marginTop: 2, fontWeight: "600" }}>
                    {profitQ.data.activeBatchesCount} सक्रिय खरीद बैच का कुल मूल्य
                  </AppText>
                </Card>
              </View>

              {/* Product-wise Profit Margins */}
              <View style={{ gap: 8 }}>
                <View style={s.rowBetween}>
                  <AppText style={{ fontSize: 15, fontWeight: "800", color: t.colors.text }}>
                    📊 सामग्री अनुसार मुनाफा व मार्जिन
                  </AppText>
                  <AppText role="caption" style={{ color: t.colors.textMuted }}>
                    {profitQ.data.productProfits.length} सामग्री
                  </AppText>
                </View>

                {profitQ.data.productProfits.length === 0 ? (
                  <Card style={{ padding: 20, alignItems: "center" }}>
                    <AppText style={{ color: t.colors.textMuted, fontSize: 12 }}>अभी तक कोई बिक्री दर्ज नहीं हुई है।</AppText>
                  </Card>
                ) : (
                  profitQ.data.productProfits.map((item) => (
                    <Card key={item.productId} style={{ gap: 6, padding: 12 }}>
                      <View style={s.rowBetween}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <AppText style={{ fontSize: 14, fontWeight: "800", color: t.colors.text }}>
                            {item.productName}
                          </AppText>
                          <AppText role="caption" style={{ color: t.colors.textMuted }}>
                            {item.categoryName} · बिक्री: {item.unitsSold} {item.unit}
                          </AppText>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <View
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 6,
                              backgroundColor: item.marginPercent >= 20 ? "#dcfce7" : item.marginPercent >= 10 ? "#dbeafe" : "#fef3c7",
                            }}
                          >
                            <AppText
                              style={{
                                fontSize: 11,
                                fontWeight: "800",
                                color: item.marginPercent >= 20 ? "#166534" : item.marginPercent >= 10 ? "#1e40af" : "#92400e",
                              }}
                            >
                              {item.marginPercent}% मार्जिन
                            </AppText>
                          </View>
                          <AppText style={{ fontSize: 15, fontWeight: "900", color: "#166534", marginTop: 2 }}>
                            +{formatINR(item.netProfit)}
                          </AppText>
                          {item.discountGiven > 0 ? <AppText role="caption" style={{ color: t.colors.textMuted }}>छूट -{formatINR(item.discountGiven)}</AppText> : null}
                          {item.uncostedRevenue > 0 ? <AppText role="caption" style={{ color: "#92400e" }}>लागत अज्ञात {formatINR(item.uncostedRevenue)}</AppText> : null}
                        </View>
                      </View>

                      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 6, borderTopWidth: 1, borderTopColor: t.colors.border }}>
                        <AppText style={{ fontSize: 11, color: t.colors.textSecondary }}>
                          बिक्री राजस्व: <AppText style={{ fontWeight: "700" }}>{formatINR(item.totalRevenue)}</AppText>
                        </AppText>
                        <AppText style={{ fontSize: 11, color: t.colors.textSecondary }}>
                          क्रय लागत: <AppText style={{ fontWeight: "700", color: t.colors.textMuted }}>{formatINR(item.totalCost)}</AppText>
                        </AppText>
                      </View>
                    </Card>
                  ))
                )}
              </View>

              {/* Recent Purchase Batches */}
              <View style={{ gap: 8, marginTop: 6 }}>
                <View style={s.rowBetween}>
                  <AppText style={{ fontSize: 15, fontWeight: "800", color: t.colors.text }}>
                    🚚 हालिया खरीद बैच (Recent Batches)
                  </AppText>
                  <AppText role="caption" style={{ color: t.colors.textMuted }}>
                    {profitQ.data.recentBatches.length} बैच
                  </AppText>
                </View>

                {profitQ.data.recentBatches.length === 0 ? (
                  <Card style={{ padding: 20, alignItems: "center" }}>
                    <AppText style={{ color: t.colors.textMuted, fontSize: 12 }}>कोई खरीद बैच उपलब्ध नहीं है।</AppText>
                  </Card>
                ) : (
                  profitQ.data.recentBatches.map((b) => (
                    <Card key={b.id} style={{ gap: 6, padding: 12, backgroundColor: "#f8fafc" }}>
                      <View style={s.rowBetween}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <AppText style={{ fontSize: 13, fontWeight: "800", color: t.colors.text }}>
                            {b.productName}
                          </AppText>
                          <AppText role="caption" style={{ color: t.colors.textMuted }}>
                            {b.supplierName ? `${b.supplierName}` : "सप्लायर: सामान्य"}{b.invoiceNumber ? ` · बिल #${b.invoiceNumber}` : ""}
                          </AppText>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <AppText style={{ fontSize: 13, fontWeight: "800", color: t.colors.text }}>
                            {formatINR(b.totalPurchaseCost)}
                          </AppText>
                          <AppText role="caption" style={{ color: "#166534", fontWeight: "700" }}>
                            {formatINR(b.costPricePerUnit)}/{b.unit} दर
                          </AppText>
                        </View>
                      </View>

                      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 4 }}>
                        <AppText style={{ fontSize: 11, color: t.colors.textMuted }}>
                          खरीदी मात्रा: {b.initialQuantity} {b.unit}
                        </AppText>
                        <AppText style={{ fontSize: 11, color: b.remainingQuantity > 0 ? "#166534" : t.colors.textMuted, fontWeight: "700" }}>
                          बचा स्टॉक: {b.remainingQuantity} {b.unit}
                        </AppText>
                      </View>
                    </Card>
                  ))
                )}
              </View>
            </>
          )}
        </View>
      )}

      {/* ========================================== */}
      {/* TAB 3: STOCK KHATA (गोदाम स्टॉक)          */}
      {/* ========================================== */}
      {activeTab === "stock" && (
        <View style={{ gap: 12 }}>
          {/* Stock KPI Summary Cards */}
          <View style={s.kpiGrid}>
            {/* Total Products */}
            <Card style={[s.kpiCard, { borderColor: "#3b82f6" }]}>
              <View style={s.kpiTopRow}>
                <AppText role="caption" style={{ color: t.colors.textSecondary, fontWeight: "700" }}>
                  कुल प्रोडक्ट्स
                </AppText>
                <View style={[s.kpiIconBox, { backgroundColor: "#eff6ff" }]}>
                  <Ionicons name="cube-outline" size={16} color="#3b82f6" />
                </View>
              </View>
              <AppText style={{ fontSize: 18, fontWeight: "900", color: "#1e40af", marginTop: 4 }}>
                {products.length} आइटम्स
              </AppText>
            </Card>

            {/* Low Stock Items */}
            <Card style={[s.kpiCard, { borderColor: "#f59e0b" }]}>
              <View style={s.kpiTopRow}>
                <AppText role="caption" style={{ color: "#b45309", fontWeight: "700" }}>
                  कम स्टॉक चेतावनी
                </AppText>
                <View style={[s.kpiIconBox, { backgroundColor: "#fef3c7" }]}>
                  <Ionicons name="alert-circle-outline" size={16} color="#d97706" />
                </View>
              </View>
              <AppText style={{ fontSize: 18, fontWeight: "900", color: "#b45309", marginTop: 4 }}>
                {lowStockCount} आइटम्स
              </AppText>
            </Card>

            {/* Out of Stock Items */}
            <Card style={[s.kpiCard, { borderColor: "#ef4444" }]}>
              <View style={s.kpiTopRow}>
                <AppText role="caption" style={{ color: "#dc2626", fontWeight: "700" }}>
                  स्टॉक खत्म (Out)
                </AppText>
                <View style={[s.kpiIconBox, { backgroundColor: "#fee2e2" }]}>
                  <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
                </View>
              </View>
              <AppText style={{ fontSize: 18, fontWeight: "900", color: "#dc2626", marginTop: 4 }}>
                {outOfStockCount} आइटम्स
              </AppText>
            </Card>
          </View>

          {/* Action Bar: + New Product & Refresh */}
          <View style={s.rowBetween}>
            <Button
              title="+ नया प्रोडक्ट जोड़ें"
              onPress={() => router.push("/(admin)/products/new" as never)}
              style={{ flex: 1 }}
            />
            <Pressable
              onPress={() => stockQ.refetch()}
              style={[
                s.btnSmall,
                {
                  backgroundColor: t.colors.surfaceMuted,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                },
              ]}
            >
              <Ionicons name="refresh" size={16} color={t.colors.text} />
              <AppText style={{ color: t.colors.text, fontSize: 12, fontWeight: "700" }}>
                रीफ्रेश
              </AppText>
            </Pressable>
          </View>

          {/* Search & Category Filter */}
          <Card style={{ gap: 10 }}>
            <Input
              placeholder="सीमेंट, सरिया, बालू या सामग्री का नाम खोजें..."
              value={stockSearch}
              onChangeText={setStockSearch}
              prefix={<Ionicons name="search" size={18} color={t.colors.textMuted} />}
              suffix={
                stockSearch ? (
                  <Pressable onPress={() => setStockSearch("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={t.colors.textMuted} />
                  </Pressable>
                ) : null
              }
            />

            {/* Category horizontal filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              <FilterChip
                label="सभी सामग्रियां (All)"
                selected={stockCategory === "ALL"}
                onPress={() => setStockCategory("ALL")}
              />
              {uniqueCategories.map((cat) => (
                <FilterChip
                  key={cat}
                  label={cat}
                  selected={stockCategory === cat}
                  onPress={() => setStockCategory(cat)}
                />
              ))}
            </ScrollView>
          </Card>

          {/* Stock Items List */}
          {stockQ.isPending ? (
            <LoadingState label="गोदाम स्टॉक लोड हो रहा है…" />
          ) : stockQ.isError ? (
            <ErrorState
              description={stockQ.error?.message ?? "Failed to load warehouse stock"}
              onRetry={() => stockQ.refetch()}
            />
          ) : filteredStock.length === 0 ? (
            <EmptyState
              title="कोई सामग्री नहीं मिली"
              description="सर्च या कैटेगरी बदलकर प्रयास करें।"
            />
          ) : (
            <FlatList
              data={filteredStock}
              scrollEnabled={false}
              keyExtractor={(p) => String(p.id)}
              contentContainerStyle={{ gap: 10 }}
              renderItem={({ item: p }) => {
                const isOut = p.stock <= 0;
                const isLow = p.stock > 0 && p.stock <= 10;

                return (
                  <Card style={{ gap: 10 }}>
                    <View style={s.rowBetween}>
                      <View style={{ flex: 1 }}>
                        <AppText role="bodyStrong" numberOfLines={1} style={{ fontSize: 14 }}>
                          {p.name}
                        </AppText>
                        <AppText style={{ color: t.colors.textSecondary, fontSize: 11 }}>
                          {p.category?.name || "General"}
                        </AppText>
                      </View>
                      <StatusBadge
                        label={isOut ? "स्टॉक खत्म" : isLow ? "कम स्टॉक" : "पर्याप्त स्टॉक"}
                        tone={isOut ? "danger" : isLow ? "warning" : "success"}
                      />
                    </View>

                    <View style={s.custStatsRow}>
                      <View style={{ flex: 1 }}>
                        <AppText style={{ color: t.colors.textMuted, fontSize: 10 }}>वर्तमान स्टॉक</AppText>
                        <AppText
                          style={{
                            color: isOut ? "#dc2626" : isLow ? "#d97706" : t.colors.text,
                            fontWeight: "900",
                            fontSize: 14,
                          }}
                        >
                          {p.stock} {p.unit}
                        </AppText>
                      </View>

                      <View style={{ flex: 1 }}>
                        <AppText style={{ color: t.colors.textMuted, fontSize: 10 }}>बिक्री दर</AppText>
                        <AppText style={{ fontWeight: "700", fontSize: 13 }}>
                          {formatINR(p.price)} / {p.unit}
                        </AppText>
                      </View>

                      <View style={{ flex: 1, alignItems: "flex-end" }}>
                        <AppText style={{ color: t.colors.textMuted, fontSize: 10 }}>MRP</AppText>
                        <AppText style={{ color: t.colors.textMuted, textDecorationLine: "line-through", fontSize: 12 }}>
                          {formatINR(p.mrp)}
                        </AppText>
                      </View>
                    </View>

                    <Divider />

                    {/* Stock Actions: + Add Stock, - Remove Stock, History */}
                    <View style={s.custActionsRow}>
                      <Pressable
                        onPress={() => setSelectedAddProduct(p)}
                        style={[s.btnSmall, { backgroundColor: "#15803d", flex: 1, justifyContent: "center" }]}
                      >
                        <Ionicons name="add-circle-outline" size={15} color="#ffffff" />
                        <AppText style={{ color: "#ffffff", fontSize: 12, fontWeight: "700" }}>
                          + स्टॉक जोड़ें
                        </AppText>
                      </Pressable>

                      <Pressable
                        onPress={() => setSelectedRemoveProduct(p)}
                        disabled={p.stock <= 0}
                        style={[
                          s.btnSmall,
                          {
                            backgroundColor: p.stock <= 0 ? "#cbd5e1" : "#dc2626",
                            flex: 1,
                            justifyContent: "center",
                          },
                        ]}
                      >
                        <Ionicons name="remove-circle-outline" size={15} color="#ffffff" />
                        <AppText style={{ color: "#ffffff", fontSize: 12, fontWeight: "700" }}>
                          - स्टॉक घटाएँ
                        </AppText>
                      </Pressable>

                      <Pressable
                        onPress={() => router.push(`/(admin)/stock-history/${p.id}` as never)}
                        style={[
                          s.btnSmall,
                          {
                            backgroundColor: t.colors.surfaceMuted,
                            borderWidth: 1,
                            borderColor: t.colors.border,
                            justifyContent: "center",
                          },
                        ]}
                      >
                        <Ionicons name="time-outline" size={15} color={t.colors.text} />
                        <AppText style={{ color: t.colors.text, fontSize: 11, fontWeight: "700" }}>
                          History
                        </AppText>
                      </Pressable>
                    </View>
                  </Card>
                );
              }}
            />
          )}
        </View>
      )}

      {/* ========================================== */}
      {/* CUSTOMER PASSBOOK / DETAIL MODAL           */}
      {/* ========================================== */}
      <ModalShell
        visible={!!selectedMobile}
        onClose={() => setSelectedMobile(null)}
        title="डिजिटल ग्राहक लेजर पासबुक"
      >
        {detailLoading ? (
          <LoadingState label="पासबुक विवरण लोड हो रहा है…" />
        ) : detail ? (
          <View style={{ gap: 14 }}>
            {/* Header info & PDF button */}
            <View style={s.rowBetween}>
              <View style={{ flex: 1 }}>
                <AppText role="pageTitle" style={{ fontSize: 18 }}>
                  {detail.customer.customerName}
                </AppText>
                <AppText style={{ color: t.colors.textSecondary, fontSize: 12 }}>
                  {detail.customer.customerMobile}
                </AppText>
              </View>
              <Button
                title={pdfGenerating ? "…" : "PDF रसीद"}
                variant="outline"
                leftIcon={<Ionicons name="download-outline" size={14} color={t.colors.brand} />}
                onPress={() => handleDownloadPdf(detail.customer.customerMobile)}
                disabled={pdfGenerating}
              />
            </View>

            {/* Financial Summary 3 Cards */}
            <View style={s.passbookSummary}>
              <View style={[s.passbookStatBox, { backgroundColor: t.colors.surfaceMuted }]}>
                <AppText style={{ fontSize: 9, color: t.colors.textMuted }}>कुल ख़रीद</AppText>
                <AppText style={{ fontWeight: "800", fontSize: 13, marginTop: 2 }}>
                  {formatINR(detail.customer.totalPurchase)}
                </AppText>
              </View>
              <View style={[s.passbookStatBox, { backgroundColor: "#ecfdf5" }]}>
                <AppText style={{ fontSize: 9, color: "#065f46" }}>कुल जमा</AppText>
                <AppText style={{ color: "#059669", fontWeight: "800", fontSize: 13, marginTop: 2 }}>
                  {formatINR(detail.customer.totalPaid)}
                </AppText>
              </View>
              <View style={[s.passbookStatBox, { backgroundColor: "#fef2f2" }]}>
                <AppText style={{ fontSize: 9, color: "#991b1b" }}>वर्तमान बाकी</AppText>
                <AppText style={{ color: "#dc2626", fontWeight: "900", fontSize: 13, marginTop: 2 }}>
                  {formatINR(detail.customer.totalDue)}
                </AppText>
              </View>
            </View>

            {/* Orders History */}
            <View style={{ gap: 8 }}>
              <AppText role="sectionTitle" style={{ fontSize: 14 }}>
                ख़रीदे गए ऑर्डर्स (Orders History)
              </AppText>
              {detail.orders.length ? (
                detail.orders.map((ord) => (
                  <View key={ord.id} style={s.orderItemCard}>
                    <View style={s.rowBetween}>
                      <AppText role="bodyStrong" style={{ fontSize: 13 }}>
                        {ord.orderNumber}
                      </AppText>
                      <StatusBadge
                        label={ord.due <= 0 ? "PAID" : `बाकी: ${formatINR(ord.due)}`}
                        tone={ord.due <= 0 ? "success" : "danger"}
                      />
                    </View>
                    <View style={s.rowBetween}>
                      <AppText style={{ color: t.colors.textMuted, fontSize: 11 }}>
                        {formatDateTime(ord.createdAt)}
                      </AppText>
                      <AppText style={{ fontSize: 12, fontWeight: "600" }}>
                        बिल: {formatINR(ord.finalAmount)}
                      </AppText>
                    </View>
                  </View>
                ))
              ) : (
                <AppText style={{ color: t.colors.textMuted, fontSize: 12 }}>कोई ऑर्डर नहीं</AppText>
              )}
            </View>

            {/* Payment Transactions */}
            <View style={{ gap: 8 }}>
              <AppText role="sectionTitle" style={{ fontSize: 14 }}>
                भुगतान रसीदें (Payment Transactions)
              </AppText>
              {detail.paymentHistory.length ? (
                detail.paymentHistory.map((pmt) => (
                  <View key={pmt.id} style={s.orderItemCard}>
                    <View style={s.rowBetween}>
                      <View>
                        <AppText role="bodyStrong" style={{ fontSize: 13 }}>
                          {pmt.paymentMode === "CASH" ? "💵 Cash" : "📱 Online"} · {pmt.orderNumber}
                        </AppText>
                        <AppText style={{ color: t.colors.textMuted, fontSize: 10 }}>
                          {formatDateTime(pmt.paymentDate)}
                        </AppText>
                      </View>
                      <AppText style={{ color: "#059669", fontWeight: "900", fontSize: 14 }}>
                        +{formatINR(pmt.amount)}
                      </AppText>
                    </View>
                    <View style={s.rowBetween}>
                      <AppText style={{ color: t.colors.textMuted, fontSize: 10 }}>
                        {pmt.notes || "No notes"}
                      </AppText>
                      <AppText style={{ color: t.colors.textSecondary, fontSize: 10 }}>
                        बाकी: {formatINR(pmt.remainingDue)}
                      </AppText>
                    </View>
                  </View>
                ))
              ) : (
                <AppText style={{ color: t.colors.textMuted, fontSize: 12 }}>कोई भुगतान दर्ज नहीं है</AppText>
              )}
            </View>
          </View>
        ) : (
          <EmptyState title="विवरण अनुपलब्ध" description="पासबुक लोड नहीं हो सकी।" />
        )}
      </ModalShell>

      {/* ========================================== */}
      {/* RECEIVE PAYMENT MODAL                      */}
      {/* ========================================== */}
      <ModalShell
        visible={!!payCustomer}
        onClose={() => setPayCustomer(null)}
        title="पैसा जमा करें (Receive Payment)"
      >
        {payCustomer && (
          <View style={{ gap: 14 }}>
            <View style={[s.infoBox, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }]}>
              <AppText style={{ color: "#991b1b", fontSize: 11, fontWeight: "700" }}>
                {payCustomer.customerName} ({payCustomer.customerMobile})
              </AppText>
              <View style={s.rowBetween}>
                <AppText style={{ color: "#b91c1c", fontSize: 12 }}>वर्तमान कुल बाकी:</AppText>
                <AppText style={{ color: "#dc2626", fontSize: 16, fontWeight: "900" }}>
                  {formatINR(payCustomer.totalDue)}
                </AppText>
              </View>
            </View>

            {payError && (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#991b1b" />
                <AppText style={{ color: "#991b1b", fontSize: 12, flex: 1 }}>{payError}</AppText>
              </View>
            )}

            <Input
              label="जमा राशि (Amount in ₹) *"
              keyboardType="decimal-pad"
              value={payAmount}
              onChangeText={setPayAmount}
              placeholder="e.g. 5000"
            />

            <View style={{ gap: 6 }}>
              <AppText role="label">भुगतान माध्यम (Payment Mode) *</AppText>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={() => setPayMode("CASH")}
                  style={[
                    s.payModeBtn,
                    payMode === "CASH" && { borderColor: "#059669", backgroundColor: "#ecfdf5" },
                  ]}
                >
                  <AppText
                    style={{
                      color: payMode === "CASH" ? "#065f46" : t.colors.textSecondary,
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    💵 Cash (नकद)
                  </AppText>
                </Pressable>

                <Pressable
                  onPress={() => setPayMode("ONLINE")}
                  style={[
                    s.payModeBtn,
                    payMode === "ONLINE" && { borderColor: "#059669", backgroundColor: "#ecfdf5" },
                  ]}
                >
                  <AppText
                    style={{
                      color: payMode === "ONLINE" ? "#065f46" : t.colors.textSecondary,
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    📱 Online (UPI / Bank)
                  </AppText>
                </Pressable>
              </View>
            </View>

            <Input
              label="भुगतान दिनांक (Payment Date)"
              value={payDate}
              onChangeText={setPayDate}
              placeholder="YYYY-MM-DD"
            />

            <Input
              label="नोट्स / विवरण (Optional Notes)"
              value={payNotes}
              onChangeText={setPayNotes}
              placeholder="उदा. PhonePe से प्राप्त, आदि"
            />

            <View style={s.rowBetween}>
              <Button
                title="रद्द करें"
                variant="outline"
                onPress={() => setPayCustomer(null)}
                style={{ flex: 1 }}
              />
              <Button
                title={paySaving ? "जमा हो रहा है…" : "✓ भुगतान जमा करें"}
                loading={paySaving}
                disabled={paySaving || !payAmount.trim()}
                onPress={handleSavePayment}
                style={{ flex: 1, backgroundColor: "#059669" }}
              />
            </View>
          </View>
        )}
      </ModalShell>

      {/* ========================================== */}
      {/* CHANGE PIN MODAL                           */}
      {/* ========================================== */}
      <ModalShell
        visible={showChangePinModal}
        onClose={() => setShowChangePinModal(false)}
        title="खाताबुक सुरक्षा पिन बदलें"
      >
        <View style={{ gap: 12 }}>
          {changePinSuccess && (
            <View style={[s.successBox, { backgroundColor: "#ecfdf5" }]}>
              <AppText style={{ color: "#065f46", fontWeight: "700", fontSize: 12 }}>
                ✓ {changePinSuccess}
              </AppText>
            </View>
          )}

          {changePinError && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#991b1b" />
              <AppText style={{ color: "#991b1b", fontSize: 12, flex: 1 }}>
                {changePinError}
              </AppText>
            </View>
          )}

          <Input
            label="वर्तमान पिन (Current PIN) या एडमिन पासवर्ड *"
            secureTextEntry
            value={currentPin}
            onChangeText={setCurrentPin}
            placeholder="वर्तमान पिन (या डिफ़ॉल्ट 1234)"
          />

          {/* Recovery Gmail Section */}
          <View style={[s.infoBox, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]}>
            <View style={s.rowBetween}>
              <AppText style={{ color: "#1e3a8a", fontWeight: "700", fontSize: 11 }}>
                रिकवरी जीमेल (Forgot PIN / OTP Email) *
              </AppText>
              <AppText style={{ color: "#1d4ed8", fontSize: 9, fontWeight: "700" }}>
                OTP यहीं जाएगा
              </AppText>
            </View>
            <Input
              value={recoveryEmailInput}
              onChangeText={setRecoveryEmailInput}
              placeholder="उदा. sushant.admin@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <AppText style={{ color: "#1e40af", fontSize: 10 }}>
              पिन भूल जाने पर OTP कोड और पासवर्ड रीसेट लिंक इसी Gmail पर भेजा जाएगा।
            </AppText>
          </View>

          <Input
            label="नया पिन (New 4-digit PIN)"
            secureTextEntry
            keyboardType="number-pad"
            maxLength={8}
            value={newPin}
            onChangeText={setNewPin}
            placeholder="••••"
          />

          <Input
            label="पुष्टि पिन (Confirm PIN)"
            secureTextEntry
            keyboardType="number-pad"
            maxLength={8}
            value={confirmPin}
            onChangeText={setConfirmPin}
            placeholder="••••"
          />

          <AppText style={{ color: t.colors.textMuted, fontSize: 10, fontStyle: "italic" }}>
            * यदि केवल ईमेल बदलना है तो नया पिन खाली छोड़ सकते हैं।
          </AppText>

          <View style={s.rowBetween}>
            <Button
              title="रद्द करें"
              variant="outline"
              onPress={() => setShowChangePinModal(false)}
              style={{ flex: 1 }}
            />
            <Button
              title={changePinSaving ? "सुरक्षित हो रहा है…" : "✓ सुरक्षित करें"}
              loading={changePinSaving}
              disabled={changePinSaving}
              onPress={handleChangePin}
              style={{ flex: 1, backgroundColor: "#d97706" }}
            />
          </View>
        </View>
      </ModalShell>

      {/* ========================================== */}
      {/* PROFIT DATE RANGE MODAL                    */}
      {/* ========================================== */}
      <ModalShell
        visible={showProfitDateModal}
        onClose={() => setShowProfitDateModal(false)}
        title="तारीख के अनुसार मुनाफा निकालें"
      >
        <View style={{ gap: 14 }}>
          <AppText style={{ color: t.colors.textSecondary, fontSize: 13 }}>
            शुरुआती और अंतिम तारीख चुनकर उस अवधि का शुद्ध लाभ व बिक्री का हिसाब देखें:
          </AppText>
          {profitFilterError && (
            <AppText style={{ color: t.colors.danger, fontSize: 13, fontWeight: "700" }}>
              {profitFilterError}
            </AppText>
          )}

          <Input
            label="प्रारंभिक तारीख (From Date)"
            placeholder="YYYY-MM-DD (उदा. 2026-08-01)"
            value={profitFromInput}
            onChangeText={setProfitFromInput}
            prefix={<Ionicons name="calendar-outline" size={18} color={t.colors.textMuted} />}
            helper="वर्ष-महीना-दिन प्रारूप (YYYY-MM-DD)"
          />

          <Input
            label="अंतिम तारीख (To Date)"
            placeholder="YYYY-MM-DD (उदा. 2026-09-02)"
            value={profitToInput}
            onChangeText={setProfitToInput}
            prefix={<Ionicons name="calendar-outline" size={18} color={t.colors.textMuted} />}
            helper="वर्ष-महीना-दिन प्रारूप (YYYY-MM-DD)"
          />

          <View style={{ gap: 6 }}>
            <AppText role="caption" style={{ color: t.colors.textMuted, fontWeight: "700" }}>
              त्वरित विकल्प (Quick Presets):
            </AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Button
                title="आज (Today)"
                variant="outline"
                onPress={() => {
                  setProfitFromInput(getTodayIso());
                  setProfitToInput(getTodayIso());
                }}
              />
              <Button
                title="इस महीने (This Month)"
                variant="outline"
                onPress={() => {
                  setProfitFromInput(getMonthStartIso());
                  setProfitToInput(getTodayIso());
                }}
              />
            </View>
          </View>

          <View style={s.rowBetween}>
            <Button
              title="रद्द करें (Cancel)"
              variant="outline"
              style={{ flex: 1 }}
              onPress={() => setShowProfitDateModal(false)}
            />
            <Button
              title="मुनाफा निकालें (Apply)"
              style={{ flex: 1 }}
              onPress={() => {
                const from = profitFromInput.trim();
                const to = profitToInput.trim();
                const isoDate = /^\d{4}-\d{2}-\d{2}$/;
                if (!from && !to) {
                  setProfitFilterError("कम से कम एक तारीख दर्ज करें");
                  return;
                }
                if ((from && !isoDate.test(from)) || (to && !isoDate.test(to))) {
                  setProfitFilterError("तारीख YYYY-MM-DD प्रारूप में दर्ज करें");
                  return;
                }
                if (from && to && from > to) {
                  setProfitFilterError("प्रारंभिक तारीख अंतिम तारीख के बाद नहीं हो सकती");
                  return;
                }
                setProfitFilterError(null);
                applyProfitDateFilter(from, to, "CUSTOM");
                setShowProfitDateModal(false);
              }}
            />
          </View>
        </View>
      </ModalShell>

      {/* ========================================== */}
      {/* ADD STOCK MODAL                            */}
      {/* ========================================== */}
      <AddStockModal
        visible={!!selectedAddProduct}
        product={selectedAddProduct}
        onClose={() => setSelectedAddProduct(null)}
        onSuccess={() => {
          setSelectedAddProduct(null);
          stockQ.refetch();
        }}
      />

      {/* ========================================== */}
      {/* REMOVE STOCK MODAL                         */}
      {/* ========================================== */}
      <RemoveStockModal
        visible={!!selectedRemoveProduct}
        product={selectedRemoveProduct}
        onClose={() => setSelectedRemoveProduct(null)}
        onSuccess={() => {
          setSelectedRemoveProduct(null);
          stockQ.refetch();
        }}
      />
    </Screen>
  );
}

const REMOVAL_REASONS = [
  { key: "Damage", label: "नुकसान / टूट-फूट (Damage)" },
  { key: "Stock Correction", label: "स्टॉक सुधार (Correction)" },
  { key: "Lost / Missing", label: "खो गया / गायब (Lost)" },
  { key: "Returned / Adjustment", label: "वापसी / समायोजन (Return)" },
  { key: "Other", label: "अन्य कारण (Other)" },
];

function AddStockModal({
  product,
  visible,
  onClose,
  onSuccess,
}: {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useTheme();
  const productMut = useProductMutations();
  const [qty, setQty] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [purchaseRate, setPurchaseRate] = useState("");
  const [supplier, setSupplier] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setQty("");
      setTotalCost("");
      setPurchaseRate("");
      setSupplier("");
      setInvoiceNumber("");
      setNote("");
      setError(null);
    }
  }, [visible]);

  if (!product) return null;

  const current = Number(product.stock) || 0;
  const numQty = parseFloat(qty) || 0;
  const nextStock = Math.round((current + numQty) * 1000) / 1000;

  const handleSave = async () => {
    if (numQty <= 0) {
      setError("कृपया 0 से अधिक मात्रा दर्ज करें");
      return;
    }
    const parsedCost = parseFloat(totalCost);
    const parsedRate = parseFloat(purchaseRate);
    if (Number.isNaN(parsedCost) && Number.isNaN(parsedRate)) {
      setError("खरीद की कुल लागत या प्रति यूनिट दर दर्ज करना जरूरी है");
      return;
    }
    setError(null);
    try {
      await productMut.adjustStock.mutateAsync({
        id: product.id,
        payload: {
          action: "ADD",
          quantity: numQty,
          totalPurchaseCost: !Number.isNaN(parsedCost) && parsedCost >= 0 ? parsedCost : undefined,
          purchaseRate: !Number.isNaN(parsedRate) && parsedRate >= 0 ? parsedRate : undefined,
          supplier: supplier.trim() || undefined,
          invoiceNumber: invoiceNumber.trim() || undefined,
          note: note.trim() || undefined,
        },
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "स्टॉक जोड़ने में समस्या आई");
    }
  };

  return (
    <ModalShell visible={visible} onClose={onClose} title="नया स्टॉक व खरीद जोड़ें">
      <View style={{ gap: 12 }}>
        {/* Product preview */}
        <View style={{ padding: 12, borderRadius: 12, backgroundColor: t.colors.surfaceMuted, gap: 4 }}>
          <AppText role="bodyStrong" numberOfLines={1}>{product.name}</AppText>
          <AppText role="caption" style={{ color: t.colors.textSecondary }}>
            {product.category?.name || "General"} · यूनिट: {product.unit}
          </AppText>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
            <AppText style={{ color: t.colors.textMuted, fontSize: 11 }}>वर्तमान स्टॉक (Current Stock):</AppText>
            <AppText style={{ fontWeight: "800", fontSize: 13, color: t.colors.text }}>
              {product.stock} {product.unit}
            </AppText>
          </View>
        </View>

        {/* Input */}
        <Input
          label={`खरीदी गई मात्रा (Quantity in ${product.unit}) *`}
          placeholder="उदा: 50"
          keyboardType="decimal-pad"
          value={qty}
          onChangeText={(v) => {
            setQty(v);
            const q = parseFloat(v);
            const c = parseFloat(totalCost);
            if (!Number.isNaN(q) && q > 0 && !Number.isNaN(c) && c >= 0) {
              setPurchaseRate((c / q).toFixed(2));
            }
          }}
          autoFocus
        />

        {/* Live Preview */}
        {numQty > 0 && (
          <View style={{ padding: 10, borderRadius: 10, backgroundColor: "#dcfce7", borderWidth: 1, borderColor: "#bbf7d0", gap: 4 }}>
            <AppText style={{ fontSize: 11, color: "#166534", fontWeight: "700" }}>
              📊 स्टॉक पूर्वावलोकन (Stock Preview):
            </AppText>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <AppText style={{ fontSize: 12, color: "#166534" }}>पुराना: {current} {product.unit}</AppText>
              <AppText style={{ fontSize: 12, color: "#166534", fontWeight: "700" }}>+ आया: {numQty}</AppText>
              <AppText style={{ fontSize: 13, color: "#15803d", fontWeight: "900" }}>➔ नया: {nextStock} {product.unit}</AppText>
            </View>
          </View>
        )}

        {/* Purchase Cost & Rate Section */}
        <View style={{ padding: 12, borderRadius: 12, backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", gap: 10 }}>
          <AppText style={{ fontSize: 12, fontWeight: "800", color: "#166534" }}>
            💰 खरीद लागत व FIFO बैच (Purchase Cost)
          </AppText>

          <Input
            label="कुल खरीद मूल्य (Total Purchase Cost ₹) - उदा: 5000"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={totalCost}
            onChangeText={(v) => {
              setTotalCost(v);
              const c = parseFloat(v);
              const q = parseFloat(qty);
              if (!Number.isNaN(c) && !Number.isNaN(q) && q > 0) {
                setPurchaseRate((c / q).toFixed(2));
              }
            }}
          />

          <Input
            label={`प्रति ${product.unit} खरीद दर (Rate ₹) - उदा: 100`}
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={purchaseRate}
            onChangeText={(v) => {
              setPurchaseRate(v);
              const r = parseFloat(v);
              const q = parseFloat(qty);
              if (!Number.isNaN(r) && !Number.isNaN(q) && q > 0) {
                setTotalCost((r * q).toFixed(2));
              }
            }}
          />

          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="सप्लायर का नाम"
                placeholder="उदा: ACC Plant"
                value={supplier}
                onChangeText={setSupplier}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="बिल / चालान #"
                placeholder="उदा: INV-089"
                value={invoiceNumber}
                onChangeText={setInvoiceNumber}
              />
            </View>
          </View>
        </View>

        <Input
          label="अतिरिक्त नोट / रिमार्क"
          placeholder="गाड़ी नंबर, चालान नंबर या टिप्पणी"
          value={note}
          onChangeText={setNote}
        />

        {error && (
          <Card style={{ backgroundColor: t.colors.dangerSoft }}>
            <AppText style={{ color: t.colors.danger, fontSize: 12 }}>{error}</AppText>
          </Card>
        )}

        <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
          <Button title="रद्द करें (Cancel)" variant="outline" onPress={onClose} style={{ flex: 1 }} />
          <Button
            title="✓ स्टॉक व खरीद सुरक्षित करें"
            loading={productMut.adjustStock.isPending}
            disabled={productMut.adjustStock.isPending || numQty <= 0}
            onPress={handleSave}
            style={{ flex: 2 }}
          />
        </View>
      </View>
    </ModalShell>
  );
}

function RemoveStockModal({
  product,
  visible,
  onClose,
  onSuccess,
}: {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useTheme();
  const productMut = useProductMutations();
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("Damage");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setQty("");
      setReason("Damage");
      setNote("");
      setError(null);
    }
  }, [visible]);

  if (!product) return null;

  const current = Number(product.stock) || 0;
  const numQty = parseFloat(qty) || 0;
  const nextStock = Math.round((current - numQty) * 1000) / 1000;
  const isInvalid = numQty <= 0 || numQty > current || !reason;

  const handleSave = async () => {
    if (numQty <= 0) {
      setError("कृपया 0 से अधिक मात्रा दर्ज करें");
      return;
    }
    if (numQty > current) {
      setError(`गोदाम में केवल ${current} ${product.unit} उपलब्ध हैं। इससे अधिक नहीं घटा सकते।`);
      return;
    }
    if (!reason.trim()) {
      setError("स्टॉक घटाने का कारण चुनना अनिवार्य है।");
      return;
    }
    setError(null);
    try {
      await productMut.adjustStock.mutateAsync({
        id: product.id,
        payload: {
          action: "DEDUCT",
          quantity: numQty,
          reason,
          note: note.trim() || undefined,
        },
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "स्टॉक घटाने में समस्या आई");
    }
  };

  return (
    <ModalShell visible={visible} onClose={onClose} title="स्टॉक घटाएँ (Remove Stock)">
      <View style={{ gap: 12 }}>
        {/* Product preview */}
        <View style={{ padding: 12, borderRadius: 12, backgroundColor: t.colors.surfaceMuted, gap: 4 }}>
          <AppText role="bodyStrong" numberOfLines={1}>{product.name}</AppText>
          <AppText role="caption" style={{ color: t.colors.textSecondary }}>
            {product.category?.name || "General"} · यूनिट: {product.unit}
          </AppText>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
            <AppText style={{ color: t.colors.textMuted, fontSize: 11 }}>वर्तमान स्टॉक (Current Stock):</AppText>
            <AppText style={{ fontWeight: "800", fontSize: 13, color: t.colors.text }}>
              {product.stock} {product.unit}
            </AppText>
          </View>
        </View>

        {/* Input */}
        <Input
          label={`कितना स्टॉक कम करना है? (${product.unit}) *`}
          placeholder="उदा: 25"
          keyboardType="decimal-pad"
          value={qty}
          onChangeText={setQty}
          autoFocus
        />

        {/* Live Preview */}
        {numQty > 0 && (
          <View
            style={{
              padding: 10,
              borderRadius: 10,
              backgroundColor: numQty > current ? "#fee2e2" : "#fef3c7",
              borderWidth: 1,
              borderColor: numQty > current ? "#fecaca" : "#fde68a",
              gap: 4,
            }}
          >
            <AppText style={{ fontSize: 11, color: numQty > current ? "#dc2626" : "#b45309", fontWeight: "700" }}>
              {numQty > current ? "⚠️ त्रुटि: उपलब्ध स्टॉक से अधिक है!" : "📊 स्टॉक पूर्वावलोकन (Stock Preview):"}
            </AppText>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <AppText style={{ fontSize: 12, color: "#475569" }}>पुराना: {current}</AppText>
              <AppText style={{ fontSize: 12, color: "#dc2626", fontWeight: "700" }}>- कम: {numQty}</AppText>
              <AppText style={{ fontSize: 13, color: nextStock <= 0 ? "#dc2626" : "#b45309", fontWeight: "900" }}>
                ➔ नया: {Math.max(0, nextStock)} {product.unit}
              </AppText>
            </View>
          </View>
        )}

        {/* Reason Selector (Mandatory) */}
        <View style={{ gap: 6 }}>
          <AppText role="label">कारण चुनें (Select Reason) *</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {REMOVAL_REASONS.map((r) => (
              <FilterChip
                key={r.key}
                label={r.label}
                selected={reason === r.key}
                onPress={() => setReason(r.key)}
              />
            ))}
          </View>
        </View>

        {/* Optional note */}
        <Input
          label="अतिरिक्त विवरण / नोट (वैकल्पिक)"
          placeholder="उदा: बारिश में भीगने के कारण खराब हो गया"
          value={note}
          onChangeText={setNote}
        />

        {error && (
          <Card style={{ backgroundColor: t.colors.dangerSoft }}>
            <AppText style={{ color: t.colors.danger, fontSize: 12 }}>{error}</AppText>
          </Card>
        )}

        <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
          <Button title="रद्द करें (Cancel)" variant="outline" onPress={onClose} style={{ flex: 1 }} />
          <Button
            title="✓ स्टॉक घटाएँ"
            variant="danger"
            loading={productMut.adjustStock.isPending}
            disabled={productMut.adjustStock.isPending || isInvalid}
            onPress={handleSave}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </ModalShell>
  );
}

const s = StyleSheet.create({
  page: { gap: 14 },
  lockScreen: { padding: 16 },
  lockCard: { width: "100%", maxWidth: 420, padding: 22, gap: 14, alignItems: "center" },
  lockIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#dc2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fee2e2",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  defaultPinBox: {
    width: "100%",
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  errorBox: {
    width: "100%",
    backgroundColor: "#fee2e2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  successBox: {
    width: "100%",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  infoBox: {
    width: "100%",
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pinInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  pinInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 6,
  },
  forgotWrap: {
    alignItems: "center",
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
    paddingTop: 12,
    width: "100%",
  },
  bannerHeader: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  bannerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(220, 38, 38, 0.2)",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.4)",
  },
  bannerTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  bannerSubtitle: {
    color: "#cbd5e1",
    fontSize: 11,
    lineHeight: 15,
  },
  bannerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(71, 85, 105, 0.8)",
  },
  actionChipText: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "600",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpiCard: {
    width: "48.5%",
    minWidth: 140,
    flexGrow: 1,
    borderWidth: 1.2,
    borderRadius: 14,
    padding: 12,
    overflow: "hidden",
  },
  kpiTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kpiIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  segmentedWrap: {
    flexDirection: "row",
    backgroundColor: "rgba(15, 23, 42, 0.08)",
    borderRadius: 14,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  segmentedItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentedItemActive: {
    backgroundColor: "#059669",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentedLabel: {
    fontSize: 12.5,
  },
  filterChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  customerCard: {
    gap: 10,
  },
  custStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  custActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  btnSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  passbookSummary: {
    flexDirection: "row",
    gap: 8,
  },
  passbookStatBox: {
    flex: 1,
    borderRadius: 10,
    padding: 8,
    alignItems: "center",
  },
  orderItemCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  payModeBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowAlign: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
});
