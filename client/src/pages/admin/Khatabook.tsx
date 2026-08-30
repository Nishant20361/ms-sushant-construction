import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../lib/api";
import type { CustomerDetail, CustomerDue, PaymentMode, Product } from "../../types";
import { formatINR, formatDate } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/Loading";
import { useToast } from "../../components/Toast";
import { generateCustomerStatementPdfHtml, downloadPdfHtml, safeFilename } from "../../lib/pdf";
import {
  BookOpen,
  Wallet,
  Receipt,
  Package,
  MessageSquare,
  FileText,
  Download,
  PlusCircle,
  Search,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  X,
  Lock,
  KeyRound,
  Mail,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

const UNLOCK_STORAGE_KEY = "khatabook_session_unlocked_v1";

export default function Khatabook() {
  const { success, error: toastError } = useToast();

  // Security Lock State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem(UNLOCK_STORAGE_KEY) === "true";
  });
  const [pinInput, setPinInput] = useState("");
  const [pinVerifying, setPinVerifying] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);

  // Auth Status (from server)
  const [authStatus, setAuthStatus] = useState<{
    isPinSet: boolean;
    maskedEmail: string;
    defaultPinActive: boolean;
  } | null>(null);

  // Modals for Security
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [recoveryEmailInput, setRecoveryEmailInput] = useState("");
  const [changePinSaving, setChangePinSaving] = useState(false);
  const [changePinError, setChangePinError] = useState<string | null>(null);

  // Forgot PIN / Gmail OTP Modal
  const [showForgotPinModal, setShowForgotPinModal] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [resetNewPin, setResetNewPin] = useState("");
  const [resetConfirmPin, setResetConfirmPin] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Active Tab: "customers" (ग्राहक खाता) or "stock" (स्टॉक खाता)
  const [activeTab, setActiveTab] = useState<"customers" | "stock">("customers");

  // Customer Khata State
  const [customers, setCustomers] = useState<CustomerDue[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterDueOnly, setFilterDueOnly] = useState<"ALL" | "DUE" | "CLEARED">("ALL");

  // Customer Detail / Passbook Modal
  const [selectedMobile, setSelectedMobile] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Quick Payment Modal
  const [payCustomer, setPayCustomer] = useState<CustomerDetail["customer"] | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<PaymentMode>("CASH");
  const [payDate, setPayDate] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Stock Khata State
  const [products, setProducts] = useState<Product[]>([]);
  const [stockSearch, setStockSearch] = useState("");
  const [stockCategory, setStockCategory] = useState("ALL");

  // Load Auth Status
  const loadAuthStatus = useCallback(() => {
    adminApi
      .getKhatabookAuthStatus()
      .then((status) => {
        setAuthStatus(status);
        if (status.recoveryEmail) {
          setRecoveryEmailInput(status.recoveryEmail);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadAuthStatus();
  }, [loadAuthStatus]);

  // Load Customer Dues / Ledger (only when unlocked)
  const loadCustomers = useCallback(() => {
    if (!isUnlocked) return;
    setLoading(true);
    setLoadError(null);
    adminApi
      .getDuesSummary({
        search: search || undefined,
      })
      .then((res) => setCustomers(res.customers))
      .catch(() => setLoadError("Failed to load Khatabook customer ledger"))
      .finally(() => setLoading(false));
  }, [isUnlocked, search]);

  // Load Products for Stock Khata (only when unlocked)
  const loadProducts = useCallback(() => {
    if (!isUnlocked) return;
    adminApi
      .getProducts({ limit: 100 })
      .then((res: { products: Product[] }) => setProducts(res.products))
      .catch(() => {});
  }, [isUnlocked]);

  useEffect(() => {
    if (isUnlocked) {
      loadCustomers();
      loadProducts();
    }
  }, [isUnlocked, loadCustomers, loadProducts]);

  // Handle Verify PIN
  const handleVerifyPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput.trim()) {
      setPinError("कृपया सुरक्षा पिन दर्ज करें (Enter PIN)");
      return;
    }
    setPinVerifying(true);
    setPinError(null);

    try {
      await adminApi.verifyKhatabookPin(pinInput.trim());
      sessionStorage.setItem(UNLOCK_STORAGE_KEY, "true");
      setIsUnlocked(true);
      setPinInput("");
      success("खाताबुक सफलतापूर्वक अनलॉक हो गया!");
    } catch (err: any) {
      setPinError(err?.message || "गलत पिन! कृपया पुनः प्रयास करें।");
    } finally {
      setPinVerifying(false);
    }
  };

  // Handle Lock
  const handleLock = () => {
    sessionStorage.removeItem(UNLOCK_STORAGE_KEY);
    setIsUnlocked(false);
    setPinInput("");
    setPinError(null);
    success("खाताबुक लॉक कर दिया गया है (Khatabook Locked)");
  };

  // Handle In-App Change PIN & Save Recovery Email
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();

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

    try {
      const res = await adminApi.changeKhatabookPin({
        currentPin: currentPin.trim() || undefined,
        adminPassword: adminPassword.trim() || undefined,
        newPin: newPin.trim() || undefined,
        recoveryEmail: recoveryEmailInput.trim() || undefined,
      });
      success(res.message || "सुरक्षा सेटिंग्स सफलतापूर्वक सुरक्षित हो गई!");
      setShowChangePinModal(false);
      setCurrentPin("");
      setAdminPassword("");
      setNewPin("");
      setConfirmPin("");
      loadAuthStatus();
    } catch (err: any) {
      setChangePinError(err?.message || "पिन या ईमेल सुरक्षित करने में त्रुटि हुई");
    } finally {
      setChangePinSaving(false);
    }
  };

  // Handle Request OTP via Gmail
  const handleRequestOtp = async () => {
    setOtpSending(true);
    setResetError(null);
    try {
      const res = await adminApi.requestKhatabookForgotPin();
      setOtpSent(true);
      success(res.message || "OTP आपके Gmail पर भेज दिया गया है!");
    } catch (err: any) {
      setResetError(err?.message || "OTP भेजने में त्रुटि हुई");
    } finally {
      setOtpSending(false);
    }
  };

  // Handle Reset PIN with OTP
  const handleResetPinWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const res = await adminApi.resetKhatabookPin({
        otp: otpInput.trim(),
        newPin: resetNewPin.trim(),
      });
      success(res.message || "पिन सफलतापूर्वक रीसेट हो गया!");
      setShowForgotPinModal(false);
      setOtpSent(false);
      setOtpInput("");
      setResetNewPin("");
      setResetConfirmPin("");
      // Unlock session
      sessionStorage.setItem(UNLOCK_STORAGE_KEY, "true");
      setIsUnlocked(true);
      loadAuthStatus();
    } catch (err: any) {
      setResetError(err?.message || "पिन रीसेट विफल रहा");
    } finally {
      setResetSaving(false);
    }
  };

  // Aggregated KPIs
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
    () => products.filter((p) => p.stock <= 10).length,
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

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category?.name) cats.add(p.category.name);
    });
    return Array.from(cats);
  }, [products]);

  // View Customer Ledger / Passbook
  const openPassbook = async (mobile: string) => {
    setSelectedMobile(mobile);
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await adminApi.getCustomerDetail(mobile);
      setDetail(data);
    } catch (e: any) {
      toastError(e?.message || "Failed to load customer passbook");
    } finally {
      setDetailLoading(false);
    }
  };

  const closePassbook = () => {
    setSelectedMobile(null);
    setDetail(null);
  };

  // Open Payment Modal
  const openPaymentModal = (cust: CustomerDetail["customer"] | CustomerDue) => {
    setPayCustomer({
      customerName: cust.customerName,
      customerMobile: cust.customerMobile,
      totalOrders: cust.totalOrders,
      totalPurchase: cust.totalPurchase,
      totalPaid: cust.totalPaid,
      totalDue: cust.totalDue,
    });
    setPayAmount(cust.totalDue > 0 ? String(cust.totalDue) : "");
    setPayMode("CASH");
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayNotes("");
    setPayError(null);
  };

  const closePaymentModal = () => {
    setPayCustomer(null);
    setPayAmount("");
    setPayError(null);
  };

  // Submit Payment
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
      await adminApi.receiveCustomerPayment(
        payCustomer.customerMobile,
        amt,
        payMode,
        payDate || undefined,
        payNotes || undefined
      );
      success(`₹${amt.toLocaleString("en-IN")} सफलतापूर्वक जमा कर दिया गया!`);
      closePaymentModal();
      loadCustomers();
      if (selectedMobile === payCustomer.customerMobile) {
        openPassbook(payCustomer.customerMobile);
      }
    } catch (e: any) {
      setPayError(e?.message || "भुगतान दर्ज करने में त्रुटि हुई");
    } finally {
      setPaySaving(false);
    }
  };

  // Download PDF Statement
  const handleDownloadPdf = async (mobile: string) => {
    try {
      const statement = await adminApi.getCustomerStatement(mobile);
      const html = generateCustomerStatementPdfHtml(statement);
      const filename = safeFilename(
        `khatabook-${statement.customer.customerMobile || statement.customer.customerName}`,
        "khatabook-statement"
      );
      downloadPdfHtml(html, filename);
    } catch (e: any) {
      toastError(e?.message || "Failed to download PDF statement");
    }
  };

  // ==========================================
  // VIEW 1: LOCKED SCREEN (ENTER PIN TO OPEN)
  // ==========================================
  if (!isUnlocked) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center p-4">
        <div className="card w-full max-w-md border-2 border-slate-200 p-6 sm:p-8 space-y-6 text-center shadow-2xl animate-in fade-in zoom-in duration-200">
          {/* Header Icon */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-red-600 to-amber-500 text-white shadow-xl shadow-red-500/20">
            <Lock className="h-10 w-10" />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-0.5 text-xs font-bold text-red-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              सुरक्षित खाताबुक (Protected Ledger)
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              खाताबुक पिन दर्ज करें
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              ग्राहक उधारी, लेनदेन एवं स्टॉक बैलेंस देखने के लिए अपना गोपनीय सुरक्षा पिन दर्ज करें।
            </p>
          </div>

          {authStatus?.defaultPinActive && (
            <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs text-amber-900 text-left">
              <p className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                डिफ़ॉल्ट पिन: 1234
              </p>
              <p className="mt-0.5 text-[11px] text-amber-700">
                पहली बार लॉगिन करने के लिए <strong>1234</strong> डालें, फिर अंदर जाकर पिन बदल लें।
              </p>
            </div>
          )}

          {pinError && (
            <div className="rounded-xl bg-red-100 p-3 text-xs font-bold text-red-800 flex items-center gap-2 text-left animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleVerifyPin} className="space-y-4 text-left">
            <div>
              <label className="label text-xs font-bold text-slate-700">
                सुरक्षा पिन (Security PIN) *
              </label>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  maxLength={8}
                  autoFocus
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (pinError) setPinError(null);
                  }}
                  placeholder="••••"
                  className="input pr-10 text-center text-2xl font-black tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={pinVerifying || !pinInput.trim()}
              className="btn-primary w-full py-3 text-sm font-bold bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 shadow-lg shadow-red-500/20 active:scale-95 transition"
            >
              {pinVerifying ? "सत्यापित हो रहा है…" : "🔓 खाताबुक खोलें (Unlock Khatabook)"}
            </button>
          </form>

          {/* Forgot PIN / Reset Link */}
          <div className="border-t border-slate-100 pt-4 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForgotPinModal(true);
                setResetError(null);
              }}
              className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1.5"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>पिन भूल गए? Gmail पर OTP भेजें (Forgot PIN)</span>
            </button>
            <p className="text-[11px] text-slate-400">
              OTP आपके पंजीकृत Gmail ({authStatus?.maskedEmail || "Admin Gmail"}) पर भेजा जाएगा।
            </p>
          </div>
        </div>

        {/* FORGOT PIN / GMAIL OTP MODAL (WHEN LOCKED) */}
        {showForgotPinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="card w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">खाताबुक पिन रीसेट करें</h3>
                    <p className="text-xs text-slate-500">Gmail OTP सत्यापन</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowForgotPinModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {resetError && (
                <div className="rounded-xl bg-red-100 p-3 text-xs font-bold text-red-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {!otpSent ? (
                <div className="space-y-4 text-center py-2">
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600 text-left space-y-2">
                    <p className="font-semibold text-slate-800">
                      हम आपके पंजीकृत एडमिन Gmail पर 6-अंकीय गोपनीय OTP भेजेंगे:
                    </p>
                    <p className="font-mono text-sm font-bold text-red-700 bg-red-50 p-2 rounded-lg border border-red-100">
                      📧 {authStatus?.maskedEmail || "Admin Gmail"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      OTP प्राप्त होने के बाद आप नया 4-अंकीय पिन सेट कर सकते हैं।
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={otpSending}
                    className="btn-primary w-full py-2.5 text-xs font-bold bg-red-600 hover:bg-red-700"
                  >
                    {otpSending ? "OTP भेजा जा रहा है…" : "📩 Gmail पर OTP भेजें (Send OTP)"}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPinWithOtp} className="space-y-3">
                  <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-200 text-xs text-emerald-800">
                    <p className="font-bold">✓ OTP सफलता से भेज दिया गया है!</p>
                    <p className="text-[11px] text-emerald-700">
                      कृपया अपना Gmail चेक करें और 6-अंकीय कोड दर्ज करें।
                    </p>
                  </div>

                  <div>
                    <label className="label">6-अंकीय OTP (Enter OTP from Gmail) *</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      placeholder="e.g. 849201"
                      className="input text-center text-xl font-bold tracking-widest"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="label">नया पिन (New 4-digit PIN) *</label>
                    <input
                      type="password"
                      maxLength={8}
                      value={resetNewPin}
                      onChange={(e) => setResetNewPin(e.target.value)}
                      placeholder="••••"
                      className="input text-center text-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="label">नया पिन दोबारा दर्ज करें (Confirm New PIN) *</label>
                    <input
                      type="password"
                      maxLength={8}
                      value={resetConfirmPin}
                      onChange={(e) => setResetConfirmPin(e.target.value)}
                      placeholder="••••"
                      className="input text-center text-lg font-bold"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      disabled={otpSending}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      {otpSending ? "भेज रहा है…" : "OTP दोबारा भेजें (Resend)"}
                    </button>
                    <button
                      type="submit"
                      disabled={resetSaving}
                      className="btn-primary text-xs bg-red-600 hover:bg-red-700"
                    >
                      {resetSaving ? "रीसेट हो रहा है…" : "✓ पिन रीसेट करें और खोलें"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: UNLOCKED KHATABOOK DASHBOARD
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950 via-slate-900 to-brand-950 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-0.5 text-xs font-bold text-red-300 border border-red-500/30">
                <BookOpen className="h-3.5 w-3.5" />
                डिजिटल खाताबुक (Digital Khatabook)
              </span>
              <span className="text-xs text-slate-400">M/S Sushant Construction</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              खाताबुक और उधारी लेजर (Khata & Ledger)
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              सभी ग्राहकों का उधारी हिसाब-किताब, पैसा जमा, WhatsApp पेमेंट रिमाइंडर और गोदाम स्टॉक खाता एक ही जगह प्रबंधित करें।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Change PIN Button */}
            <button
              onClick={() => {
                setShowChangePinModal(true);
                setChangePinError(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition active:scale-95 shadow-sm"
              title="खाताबुक सुरक्षा पिन बदलें"
            >
              <KeyRound className="h-3.5 w-3.5 text-amber-400" />
              <span>पिन बदलें (Change PIN)</span>
            </button>

            {/* Lock Button */}
            <button
              onClick={handleLock}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-800 bg-red-950/60 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-900 hover:text-white transition active:scale-95 shadow-sm"
              title="खाताबुक लॉक करें"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>लॉक करें (Lock)</span>
            </button>

            {/* Refresh */}
            <button
              onClick={() => {
                loadCustomers();
                loadProducts();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition active:scale-95 shadow-sm"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>रिफ्रेश</span>
            </button>

            {/* Create New Bill */}
            <Link
              to="/admin/billing"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:from-emerald-500 hover:to-teal-500 transition active:scale-95"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ नया बिल</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Financial KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Market Due */}
        <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-white to-red-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700">
              मार्केट में कुल बाकी (लेना है)
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-red-600 tracking-tight">
            {formatINR(totalMarketDue)}
          </p>
          <p className="mt-1 text-xs text-red-700 font-medium">
            {customersWithDue} ग्राहकों से बकाया राशि वसूलनी है
          </p>
        </div>

        {/* Total Paid / Collected */}
        <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-white to-emerald-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              कुल जमा राशि (मिला है)
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-emerald-700 tracking-tight">
            {formatINR(totalPaid)}
          </p>
          <p className="mt-1 text-xs text-emerald-700 font-medium">
            Cash & Online पेमेंट्स के जरिए प्राप्त
          </p>
        </div>

        {/* Total Khata Customers */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              कुल खाता ग्राहक (Customers)
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
            {customers.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            दर्ज ग्राहक खाते (Active Ledger Accounts)
          </p>
        </div>

        {/* Low Stock Items Alert */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              गोदाम स्टॉक चेतावनी (Low Stock)
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-amber-600 tracking-tight">
            {lowStockCount} Items
          </p>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            10 से कम यूनिट बची हुई सामग्रियां
          </p>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("customers")}
          className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition ${
            activeTab === "customers"
              ? "border-brand-600 text-brand-700 bg-brand-50/50"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>👥 ग्राहक खाता व उधारी (Customer Khata)</span>
          <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 font-bold">
            {customersWithDue} उधारी
          </span>
        </button>

        <button
          onClick={() => setActiveTab("stock")}
          className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition ${
            activeTab === "stock"
              ? "border-brand-600 text-brand-700 bg-brand-50/50"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Package className="h-4 w-4" />
          <span>📦 गोदाम स्टॉक खाता (Warehouse Stock Khata)</span>
          <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 font-bold">
            {products.length} Products
          </span>
        </button>
      </div>

      {/* TAB 1: CUSTOMER KHATA */}
      {activeTab === "customers" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-1 items-center gap-2 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ग्राहक का नाम या मोबाइल नंबर खोजें..."
                  className="input pl-9"
                />
              </div>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">फ़िल्टर:</span>
              <div className="inline-flex rounded-xl bg-slate-100 p-1">
                <button
                  onClick={() => setFilterDueOnly("ALL")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                    filterDueOnly === "ALL"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  सभी ({customers.length})
                </button>
                <button
                  onClick={() => setFilterDueOnly("DUE")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                    filterDueOnly === "DUE"
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-red-700 hover:text-red-900"
                  }`}
                >
                  बाकी वाले ({customersWithDue})
                </button>
                <button
                  onClick={() => setFilterDueOnly("CLEARED")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                    filterDueOnly === "CLEARED"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-emerald-700 hover:text-emerald-900"
                  }`}
                >
                  क्लियर खाता ({customers.length - customersWithDue})
                </button>
              </div>
            </div>
          </div>

          {/* Customers Table */}
          {loading ? (
            <LoadingState label="खाताबुक लोड हो रहा है…" />
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={loadCustomers} />
          ) : filteredCustomers.length === 0 ? (
            <div className="card text-center p-12 space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <BookOpen className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">कोई ग्राहक खाता नहीं मिला</h3>
              <p className="text-xs text-slate-500">कृपया अलग नाम या नंबर से सर्च करें।</p>
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="p-3.5">ग्राहक का नाम (Customer)</th>
                    <th className="p-3.5">मोबाइल</th>
                    <th className="p-3.5 text-right">कुल ख़रीद</th>
                    <th className="p-3.5 text-right">कुल जमा</th>
                    <th className="p-3.5 text-right">बाकी उधारी (Due)</th>
                    <th className="p-3.5 text-center">स्थिति</th>
                    <th className="p-3.5 text-center">त्वरित कार्य (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((c) => {
                    const hasDue = c.totalDue > 0;
                    const cleanPhone = c.customerMobile.replace(/\D/g, "");
                    const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                      `नमस्ते ${c.customerName} जी, M/S Sushant Construction की तरफ से आपका कुल बकाया ₹${c.totalDue.toLocaleString(
                        "en-IN"
                      )} है। कृपया समय पर भुगतान करने की कृपा करें। धन्यवाद! \n\n- M/S Sushant Construction`
                    )}`;

                    return (
                      <tr key={c.customerMobile} className="hover:bg-slate-50 transition">
                        <td className="p-3.5">
                          <p className="font-bold text-slate-900 text-sm">{c.customerName}</p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {c.totalOrders} ऑर्डर्स
                          </p>
                        </td>
                        <td className="p-3.5 text-slate-600 font-semibold">
                          {c.customerMobile}
                        </td>
                        <td className="p-3.5 text-right font-medium text-slate-800">
                          {formatINR(c.totalPurchase)}
                        </td>
                        <td className="p-3.5 text-right font-bold text-emerald-700">
                          {formatINR(c.totalPaid)}
                        </td>
                        <td className="p-3.5 text-right">
                          <span
                            className={`text-base font-black ${
                              hasDue ? "text-red-600" : "text-emerald-700"
                            }`}
                          >
                            {formatINR(c.totalDue)}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          {hasDue ? (
                            <span className="badge bg-red-100 text-red-800 font-bold px-2.5 py-1">
                              बाकी (DUE)
                            </span>
                          ) : (
                            <span className="badge bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1">
                              साफ खाता (PAID)
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Payment button */}
                            {hasDue && (
                              <button
                                onClick={() => openPaymentModal(c)}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition"
                                title="पैसा जमा करें"
                              >
                                <Wallet className="h-3.5 w-3.5" />
                                <span>+ जमा करें</span>
                              </button>
                            )}

                            {/* WhatsApp reminder */}
                            {hasDue && (
                              <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg bg-green-500 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-green-600 active:scale-95 transition"
                                title="WhatsApp पर तकादा भेजें"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>WhatsApp</span>
                              </a>
                            )}

                            {/* Passbook button */}
                            <button
                              onClick={() => openPassbook(c.customerMobile)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition"
                              title="पासबुक देखें"
                            >
                              <FileText className="h-3.5 w-3.5 text-slate-500" />
                              <span>पासबुक</span>
                            </button>

                            {/* PDF Statement */}
                            <button
                              onClick={() => handleDownloadPdf(c.customerMobile)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-50 active:scale-95 transition"
                              title="PDF डाउनलोड करें"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STOCK KHATA */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-1 items-center gap-2 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  placeholder="सीमेंट, सरिया, बालू या सामग्री का नाम खोजें..."
                  className="input pl-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">कैटेगरी:</span>
              <select
                value={stockCategory}
                onChange={(e) => setStockCategory(e.target.value)}
                className="input py-1.5 text-xs font-semibold"
              >
                <option value="ALL">सभी सामग्रियां (All Categories)</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-3.5">सामग्री का नाम (Product)</th>
                  <th className="p-3.5">कैटेगरी (Category)</th>
                  <th className="p-3.5">वर्तमान स्टॉक (Remaining Stock)</th>
                  <th className="p-3.5">स्टॉक स्थिति</th>
                  <th className="p-3.5 text-right">बिक्री दर (Selling Price)</th>
                  <th className="p-3.5 text-right">MRP</th>
                  <th className="p-3.5 text-center">स्टॉक मैनेजमेंट</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStock.map((p) => {
                  const isOut = p.stock <= 0;
                  const isLow = p.stock > 0 && p.stock <= 10;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900">{p.name}</p>
                      </td>
                      <td className="p-3.5 text-slate-600">{p.category?.name || "General"}</td>
                      <td className="p-3.5">
                        <span
                          className={`text-base font-black ${
                            isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-slate-900"
                          }`}
                        >
                          {p.stock} {p.unit}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {isOut ? (
                          <span className="badge bg-red-100 text-red-800 font-bold">स्टॉक खत्म</span>
                        ) : isLow ? (
                          <span className="badge bg-amber-100 text-amber-800 font-bold">कम स्टॉक</span>
                        ) : (
                          <span className="badge bg-emerald-100 text-emerald-800 font-bold">पर्याप्त स्टॉक</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        {formatINR(p.price)}
                      </td>
                      <td className="p-3.5 text-right text-slate-400 line-through">
                        {formatINR(p.mrp)}
                      </td>
                      <td className="p-3.5 text-center">
                        <Link
                          to="/admin/products"
                          className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1 text-xs font-bold text-white hover:bg-brand-700 transition"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          <span>+ स्टॉक जोड़ें</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CUSTOMER PASSBOOK / DETAIL MODAL */}
      {selectedMobile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card max-h-[90vh] w-full max-w-4xl overflow-y-auto p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
                  डिजिटल ग्राहक लेजर पासबुक
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  {detail?.customer.customerName || selectedMobile}
                </h2>
                <p className="text-xs text-slate-500">{detail?.customer.customerMobile}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPdf(selectedMobile)}
                  className="btn-secondary text-xs"
                >
                  <Download className="h-4 w-4" />
                  <span>PDF रसीद</span>
                </button>
                <button
                  onClick={closePassbook}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {detailLoading ? (
              <LoadingState label="पासबुक विवरण लोड हो रहा है…" />
            ) : detail ? (
              <div className="space-y-6">
                {/* Financial Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                    <p className="text-xs font-bold text-slate-500">कुल माल दिया (Total Purchase)</p>
                    <p className="text-xl font-black text-slate-900 mt-1">
                      {formatINR(detail.customer.totalPurchase)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-200">
                    <p className="text-xs font-bold text-emerald-800">कुल जमा (Total Received)</p>
                    <p className="text-xl font-black text-emerald-700 mt-1">
                      {formatINR(detail.customer.totalPaid)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-red-50 p-4 border border-red-200">
                    <p className="text-xs font-bold text-red-800">वर्तमान बाकी (Balance Due)</p>
                    <p className="text-xl font-black text-red-600 mt-1">
                      {formatINR(detail.customer.totalDue)}
                    </p>
                  </div>
                </div>

                {/* Orders History */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                    ख़रीदे गए ऑर्डर्स (Orders History)
                  </h3>
                  <div className="space-y-3">
                    {detail.orders.map((ord) => (
                      <div key={ord.id} className="rounded-xl border border-slate-200 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900">{ord.orderNumber}</span>
                            <span className="text-xs text-slate-500 ml-2">
                              {formatDate(ord.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-600">
                              बिल: {formatINR(ord.finalAmount)}
                            </span>
                            <span
                              className={`badge ${
                                ord.due <= 0
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800 font-bold"
                              }`}
                            >
                              {ord.due <= 0 ? "PAID" : `बाकी: ${formatINR(ord.due)}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payments History */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                    भुगतान रसीदें (Payment Transactions)
                  </h3>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                        <tr>
                          <th className="p-3">तारीख़</th>
                          <th className="p-3">ऑर्डर नंबर</th>
                          <th className="p-3 text-right">जमा राशि</th>
                          <th className="p-3">माध्यम (Mode)</th>
                          <th className="p-3 text-right">बाकी राशि</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detail.paymentHistory.map((pmt) => (
                          <tr key={pmt.id} className="hover:bg-slate-50">
                            <td className="p-3 text-slate-600">{formatDate(pmt.paymentDate)}</td>
                            <td className="p-3 font-semibold">{pmt.orderNumber}</td>
                            <td className="p-3 text-right font-black text-emerald-700">
                              {formatINR(pmt.amount)}
                            </td>
                            <td className="p-3">
                              <span className="badge bg-slate-100 text-slate-700">
                                {pmt.paymentMode}
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold text-slate-800">
                              {formatINR(pmt.remainingDue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* RECEIVE PAYMENT MODAL */}
      {payCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  पैसा जमा करें (Receive Payment)
                </span>
                <h3 className="text-lg font-black text-slate-900">{payCustomer.customerName}</h3>
                <p className="text-xs text-slate-500">{payCustomer.customerMobile}</p>
              </div>
              <button
                onClick={closePaymentModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-red-50 p-3 border border-red-200 flex items-center justify-between">
              <span className="text-xs font-bold text-red-800">वर्तमान कुल बाकी (Current Due):</span>
              <span className="text-lg font-black text-red-600">
                {formatINR(payCustomer.totalDue)}
              </span>
            </div>

            {payError && (
              <div className="rounded-xl bg-red-100 p-3 text-xs font-bold text-red-800">
                {payError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="label">जमा राशि (Amount to Receive in ₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="input text-lg font-bold"
                  autoFocus
                />
              </div>

              <div>
                <label className="label">भुगतान माध्यम (Payment Mode) *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMode("CASH")}
                    className={`rounded-xl border-2 py-2 text-xs font-bold transition ${
                      payMode === "CASH"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    💵 Cash (नकद)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMode("ONLINE")}
                    className={`rounded-xl border-2 py-2 text-xs font-bold transition ${
                      payMode === "ONLINE"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    📱 Online (UPI / Bank)
                  </button>
                </div>
              </div>

              <div>
                <label className="label">भुगतान दिनांक (Payment Date)</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="label">नोट्स / विवरण (Optional Notes)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="उदा. PhonePe से प्राप्त, आदि"
                  className="input text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button onClick={closePaymentModal} className="btn-outline text-xs">
                रद्द करें (Cancel)
              </button>
              <button
                onClick={handleSavePayment}
                disabled={paySaving}
                className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700"
              >
                {paySaving ? "जमा हो रहा है…" : "✓ भुगतान जमा करें"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PIN MODAL (INSIDE KHATABOOK) */}
      {showChangePinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">खाताबुक सुरक्षा पिन बदलें</h3>
                  <p className="text-xs text-slate-500">नया सुरक्षा कोड सेट करें</p>
                </div>
              </div>
              <button
                onClick={() => setShowChangePinModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {changePinError && (
              <div className="rounded-xl bg-red-100 p-3 text-xs font-bold text-red-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{changePinError}</span>
              </div>
            )}

            <form onSubmit={handleChangePin} className="space-y-4">
              <div>
                <label className="label text-xs font-bold text-slate-700">
                  वर्तमान पिन (Current PIN) या एडमिन पासवर्ड *
                </label>
                <input
                  type="password"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  placeholder="वर्तमान पिन (या डिफ़ॉल्ट 1234)"
                  className="input text-sm"
                  autoFocus
                />
              </div>

              {/* Recovery Gmail Section */}
              <div className="rounded-xl bg-blue-50/70 p-3.5 border-2 border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span>रिकवरी जीमेल (Forgot PIN / OTP Email) *</span>
                  </label>
                  <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                    OTP यहीं जाएगा
                  </span>
                </div>
                <input
                  type="email"
                  value={recoveryEmailInput}
                  onChange={(e) => setRecoveryEmailInput(e.target.value)}
                  placeholder="उदा. sushant.admin@gmail.com"
                  className="input text-xs bg-white font-medium text-slate-900 border-blue-300 focus:border-blue-500"
                />
                <p className="text-[11px] text-blue-800 leading-tight font-medium">
                  पिन भूल जाने पर OTP कोड और पासवर्ड रीसेट लिंक इसी Gmail पर भेजा जाएगा।
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs font-bold text-slate-700">नया पिन (New PIN)</label>
                  <input
                    type="password"
                    maxLength={8}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="••••"
                    className="input text-center text-base font-bold"
                  />
                </div>

                <div>
                  <label className="label text-xs font-bold text-slate-700">पुष्टि पिन (Confirm PIN)</label>
                  <input
                    type="password"
                    maxLength={8}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="••••"
                    className="input text-center text-base font-bold"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                * यदि केवल ईमेल बदलना है तो नया पिन खाली छोड़ सकते हैं।
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowChangePinModal(false)}
                  className="btn-outline text-xs"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={changePinSaving}
                  className="btn-primary text-xs bg-amber-600 hover:bg-amber-700 font-bold shadow-md shadow-amber-600/20"
                >
                  {changePinSaving ? "सुरक्षित हो रहा है…" : "✓ सेटिंग्स सुरक्षित करें (Save)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
