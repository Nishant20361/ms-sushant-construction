import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminApi, ApiRequestError } from "../../lib/api";
import type { Category, Product, Order, CustomerLookupResponse } from "../../types";
import { formatINR, resolveImageUrl } from "../../lib/format";
import { printInvoice } from "../../lib/printInvoice";
import { LoadingState } from "../../components/Loading";
import { useToast } from "../../components/Toast";
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Printer,
  Share2,
  ArrowRight,
  UserCheck,
  UserPlus,
  Truck,
  Tag,
  Banknote,
  ArrowLeft,
  Phone,
  MapPin,
  Sparkles,
  Package,
  Clock,
} from "lucide-react";

interface CartItem {
  product: Product;
  quantity: number;
}

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80";

function isWholeUnit(unit: string): boolean {
  const u = (unit || "").trim().toLowerCase();
  return u === "bag" || u === "piece" || u === "pkt" || u === "box" || u === "nos";
}

export default function AdminPlaceOrder() {
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  // Catalogue state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCatalogue, setLoadingCatalogue] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  // Customer state
  const [mobile, setMobile] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<CustomerLookupResponse | null>(null);

  // Bill & Payment state
  const [transportation, setTransportation] = useState("");
  const [discount, setDiscount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "ONLINE">("CASH");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Customer lookup trigger
  const handleLookup = useCallback(async (mobileToLookup = mobile) => {
    const clean = mobileToLookup.replace(/[\s-]/g, "");
    if (clean.length < 10) return;
    setLookingUp(true);
    try {
      const res = await adminApi.lookupCustomer(clean);
      setLookupResult(res);
      if (res.found && res.customer) {
        setCustomerName(res.customer.name);
        if (res.customer.address) {
          setAddress((current) => current || res.customer!.address || "");
        }
        success(`पुराना ग्राहक मिला: ${res.customer.name}`);
      } else {
        setLookupResult({ found: false, customer: null, previousDue: 0, ordersCount: 0 });
      }
    } catch {
      setLookupResult({ found: false, customer: null, previousDue: 0, ordersCount: 0 });
    } finally {
      setLookingUp(false);
    }
  }, [mobile, success]);

  // Load active products & categories
  useEffect(() => {
    setLoadingCatalogue(true);
    Promise.all([
      adminApi.getProducts({ limit: 100 }),
      adminApi.getCategories(),
    ])
      .then(([prodRes, catRes]) => {
        setProducts(prodRes.products.filter((p) => p.isActive));
        setCategories(catRes.categories.filter((c) => c.isActive));
      })
      .catch(() => toastError("सामग्रियां लोड करने में समस्या आई"))
      .finally(() => setLoadingCatalogue(false));
  }, [toastError]);

  // Debounced Customer Lookup when mobile number is entered
  useEffect(() => {
    const clean = mobile.replace(/\D/g, "");
    if (clean.length < 10) {
      setLookupResult(null);
      return;
    }
    const timer = setTimeout(() => {
      handleLookup(clean);
    }, 400);
    return () => clearTimeout(timer);
  }, [mobile, handleLookup]);

  // Filtered catalogue
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.unit.toLowerCase().includes(search.toLowerCase());
      const matchCategory = !selectedCategory || p.categoryId === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [products, search, selectedCategory]);

  // Cart operations
  const addToCart = (product: Product, qtyToAdd?: number) => {
    const qty = qtyToAdd || quantities[product.id] || 1;
    if (qty <= 0) return;
    if (qty > product.stock) {
      toastError(`गोदाम में केवल ${product.stock} ${product.unit} उपलब्ध हैं`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + qty;
        if (newQty > product.stock) {
          toastError(`अधिकतम उपलब्ध स्टॉक: ${product.stock} ${product.unit}`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prev, { product, quantity: qty }];
    });

    setQuantities((prev) => ({ ...prev, [product.id]: 1 }));
    success(`${product.name} कार्ट में जोड़ा गया`);
  };

  const updateCartQty = (productId: number, newQty: number) => {
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    if (newQty > item.product.stock) {
      toastError(`अधिकतम उपलब्ध स्टॉक: ${item.product.stock} ${item.product.unit}`);
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity: newQty } : i))
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  // Financial calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const transportCharge = Math.max(0, Number(transportation) || 0);
  const discountAmount = Math.max(0, Number(discount) || 0);
  const finalBill = Math.max(0, subtotal + transportCharge - discountAmount);
  const paid = Math.max(0, Number(paidAmount) || 0);
  const remainingDue = Math.max(0, Math.round((finalBill - paid) * 100) / 100);

  const paymentStatus =
    paid <= 0 ? "DUE" : remainingDue <= 0 ? "PAID" : "PARTIAL";

  // Create Order Submission
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      toastError("कृपया कार्ट में कम से कम एक सामग्री जोड़ें");
      return;
    }
    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      toastError("कृपया मान्य 10-अंकीय मोबाइल नंबर दर्ज करें");
      return;
    }
    if (!customerName.trim()) {
      toastError("कृपया ग्राहक का नाम दर्ज करें");
      return;
    }
    if (discountAmount > subtotal + transportCharge) {
      toastError("छूट (Discount) कुल बिल राशि से अधिक नहीं हो सकती");
      return;
    }
    if (paid > finalBill) {
      toastError(`जमा राशि (₹${paid}) कुल बिल (₹${finalBill}) से अधिक नहीं हो सकती`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.createAssistedOrder({
        customerMobile: cleanMobile,
        customerName: customerName.trim(),
        deliveryAddress: address.trim() || undefined,
        notes: notes.trim() || undefined,
        items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        transportation: transportCharge,
        discount: discountAmount,
        paidAmount: paid,
        paymentMode,
      });

      setCreatedOrder(res.order);
      success("ऑर्डर सफलतापूर्वक बन गया!");
    } catch (e) {
      if (e instanceof ApiRequestError) {
        toastError(e.message);
      } else {
        toastError("ऑर्डर बनाने में समस्या आई, कृपया पुनः प्रयास करें");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Clean reset for another order
  const handleResetForNewOrder = () => {
    setCart([]);
    setMobile("");
    setCustomerName("");
    setAddress("");
    setNotes("");
    setLookupResult(null);
    setTransportation("");
    setDiscount("");
    setPaidAmount("");
    setCreatedOrder(null);
  };

  // WhatsApp bill text generator
  const getWhatsAppUrl = (order: Order) => {
    const cleanMobile = order.customerMobile.replace(/\D/g, "").slice(-10);
    const prevDuePaid = order.previousDuesPaid || Math.max(0, Math.round(((order.totalPaidNow || Number(paidAmount) || order.paidTotal) - order.finalAmount) * 100) / 100);
    const totalPaidNow = order.totalPaidNow || (order.paidTotal + prevDuePaid);

    let paymentText = `💵 *जमा राशि (Paid Amount):* ${formatINR(totalPaidNow)}`;
    if (prevDuePaid > 0) {
      paymentText += `\n   ↳ *इस बिल में जमा:* ${formatINR(order.paidTotal)} (PAID)\n   ↳ *पुरानी बकाया चुकता (Previous Dues Paid):* ${formatINR(prevDuePaid)}`;
    }
    if (order.due > 0) {
      paymentText += `\n⚠️ *बाकी उधारी (Remaining Due):* ${formatINR(order.due)}`;
    } else {
      paymentText += `\n✅ *खाता स्टेटस:* पूर्ण भुगतान (PAID)`;
    }

    const msg = `नमस्ते ${order.customerName} जी,

M/S Sushant Construction से खरीदारी के लिए धन्यवाद!

🧾 *ऑर्डर नंबर:* #${order.orderNumber}
💰 *कुल बिल (This Bill):* ${formatINR(order.finalAmount)}
${paymentText}

धन्यवाद!
*M/S Sushant Construction*`;

    return `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(msg)}`;
  };

  if (loadingCatalogue) {
    return <LoadingState label="सामग्रियां और कैटलॉग लोड हो रहा है…" />;
  }

  // Success view after order is confirmed
  if (createdOrder) {
    const prevDuePaid = createdOrder.previousDuesPaid || Math.max(0, Math.round(((createdOrder.totalPaidNow || Number(paidAmount) || createdOrder.paidTotal) - createdOrder.finalAmount) * 100) / 100);
    const totalPaidNow = createdOrder.totalPaidNow || (createdOrder.paidTotal + prevDuePaid);

    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-xl">
          {/* Success Banner */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold">ऑर्डर सफलतापूर्वक बन गया!</h2>
            <p className="text-sm text-emerald-100 mt-1">
              Order #{createdOrder.orderNumber} · {new Date(createdOrder.createdAt).toLocaleString("en-IN")}
            </p>
            <span className="inline-flex items-center gap-1 mt-2 rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold text-white border border-white/30">
              Admin Order
            </span>
          </div>

          {/* Order Summary Details */}
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-200 text-sm">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">ग्राहक का नाम</p>
                <p className="font-bold text-slate-800 text-base">{createdOrder.customerName}</p>
                <p className="text-xs text-slate-600 mt-0.5">{createdOrder.customerMobile}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">भुगतान स्टेटस</p>
                <span
                  className={`inline-flex items-center gap-1 mt-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    createdOrder.due <= 0
                      ? "bg-emerald-100 text-emerald-800"
                      : createdOrder.paidTotal > 0
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {createdOrder.due <= 0 ? "PAID (पूर्ण)" : createdOrder.paidTotal > 0 ? "PARTIAL (आंशिक)" : "DUE (उधारी)"}
                </span>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-2 border-t border-slate-200 pt-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>सामग्रियों का योग (Subtotal)</span>
                <span>{formatINR(createdOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-base pt-2 border-t border-slate-200">
                <span>फाइनल बिल (Final Total)</span>
                <span className="text-emerald-700">{formatINR(createdOrder.finalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>कुल जमा की गई राशि (Total Paid)</span>
                <span>{formatINR(totalPaidNow)}</span>
              </div>
              {prevDuePaid > 0 && (
                <div className="rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800 space-y-1 border border-emerald-200">
                  <div className="flex justify-between">
                    <span>↳ इस बिल में जमा (Applied to This Bill):</span>
                    <span className="font-semibold">{formatINR(createdOrder.paidTotal)} (PAID)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>↳ पुरानी बकाया चुकता (Previous Dues Paid):</span>
                    <span className="font-bold">{formatINR(prevDuePaid)}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-between text-red-600 font-bold">
                <span>बाकी उधारी (Remaining Due)</span>
                <span>{formatINR(createdOrder.due)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => printInvoice(createdOrder.id)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow hover:bg-slate-800 transition"
                >
                  <Printer className="h-4 w-4" />
                  बिल प्रिंट करें (Print)
                </button>

                <a
                  href={getWhatsAppUrl(createdOrder)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow hover:bg-emerald-700 transition"
                >
                  <Share2 className="h-4 w-4" />
                  WhatsApp पर भेजें
                </a>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleResetForNewOrder}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  <Plus className="h-4 w-4" />
                  + दूसरा ऑर्डर बनाएँ
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/admin/orders")}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  सभी ऑर्डर्स देखें
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              ऑर्डर्स पर वापस जाएँ
            </Link>
          </div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-emerald-600" />
            ग्राहक के लिए ऑर्डर (Place Customer Order)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            बिना स्मार्टफोन वाले या दुकान पर आए ग्राहकों के लिए रीयल-टाइम ऑर्डर और बिल बनाएँ
          </p>
        </div>

        {cart.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto rounded-xl bg-emerald-50 px-3.5 py-1.5 border border-emerald-200 text-emerald-800 text-xs font-bold">
            <ShoppingBag className="h-4 w-4" />
            <span>{cart.length} सामग्री कार्ट में</span>
            <span>·</span>
            <span>{formatINR(subtotal)}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Catalogue (7 cols - Customer Website Style) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600" />
                1. सामग्री चुनें (Product Catalogue)
              </h2>
              <span className="text-xs text-slate-500">{filteredProducts.length} उपलब्ध</span>
            </div>

            {/* Search & Category Pills */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="सामग्री का नाम या यूनिट खोजें (उदा: सीमेंट, सरिया)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-4 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Category Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className={`rounded-lg px-3 py-1 font-semibold whitespace-nowrap transition ${
                    selectedCategory === null
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  सभी श्रेणियां
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`rounded-lg px-3 py-1 font-semibold whitespace-nowrap transition ${
                      selectedCategory === cat.id
                        ? "bg-emerald-700 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Cards Grid (Matching Website ProductCard Layout) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[540px] overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full p-8 text-center text-slate-400 text-xs">
                  कोई सामग्री नहीं मिली। दूसरा नाम खोजें।
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const inCart = cart.find((i) => i.product.id === product.id);
                  const currentQty = quantities[product.id] || 1;
                  const imgUrl =
                    resolveImageUrl(product.images?.[0]?.url || product.imageUrl) ||
                    FALLBACK_PRODUCT_IMAGE;
                  const discountPercent =
                    product.mrp > product.price
                      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
                      : 0;

                  return (
                    <div
                      key={product.id}
                      className={`flex flex-col overflow-hidden rounded-xl border transition shadow-sm ${
                        inCart
                          ? "border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow"
                      }`}
                    >
                      {/* Product Image Header with Badges */}
                      <div className="relative h-32 w-full bg-slate-100 overflow-hidden">
                        <img
                          src={imgUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute left-2 top-2 flex flex-col gap-1">
                          {product.stock <= 0 ? (
                            <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                              Out of Stock
                            </span>
                          ) : product.stock <= 10 ? (
                            <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                              Only {product.stock} {product.unit} left
                            </span>
                          ) : (
                            <span className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                              In Stock: {product.stock} {product.unit}
                            </span>
                          )}
                          {discountPercent > 0 && (
                            <span className="rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                              {discountPercent}% OFF
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="flex flex-1 flex-col p-3 space-y-2">
                        <div>
                          <p className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 min-h-[2rem]">
                            {product.name}
                          </p>
                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="font-black text-emerald-700 text-sm sm:text-base">
                              {formatINR(product.price)}
                            </span>
                            <span className="text-[11px] text-slate-500 font-semibold">
                              / {product.unit}
                            </span>
                            {product.mrp > product.price && (
                              <span className="line-through text-slate-400 text-[11px]">
                                {formatINR(product.mrp)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stepper + Add to Cart */}
                        <div className="mt-auto pt-2 flex items-center gap-1.5">
                          <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                const step = isWholeUnit(product.unit) ? 1 : 0.5;
                                setQuantities((prev) => ({
                                  ...prev,
                                  [product.id]: Math.max(isWholeUnit(product.unit) ? 1 : 0.001, (prev[product.id] || 1) - step),
                                }));
                              }}
                              className="p-1 text-slate-500 hover:bg-slate-100"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="number"
                              min={isWholeUnit(product.unit) ? "1" : "0.001"}
                              step={isWholeUnit(product.unit) ? "1" : "0.1"}
                              max={product.stock}
                              value={currentQty}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) {
                                  setQuantities((prev) => ({ ...prev, [product.id]: val }));
                                }
                              }}
                              className="w-12 text-center text-xs font-bold py-0.5 border-x border-slate-200 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const step = isWholeUnit(product.unit) ? 1 : 0.5;
                                setQuantities((prev) => ({
                                  ...prev,
                                  [product.id]: Math.min(product.stock, (prev[product.id] || 1) + step),
                                }));
                              }}
                              className="p-1 text-slate-500 hover:bg-slate-100"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => addToCart(product)}
                            disabled={product.stock <= 0}
                            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
                          >
                            <Plus className="h-3 w-3" />
                            {inCart ? "और जोड़ें" : "कार्ट में डालें"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Customer Details, Cart, Bill & Payment (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Customer Details Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-600" />
                2. ग्राहक विवरण (Customer Info)
              </h2>
              {lookingUp ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 animate-pulse">
                  <Clock className="h-3 w-3" />
                  खोज रहे हैं...
                </span>
              ) : lookupResult?.found ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                  <UserCheck className="h-3 w-3" />
                  ✓ पुराना ग्राहक
                </span>
              ) : mobile.replace(/\D/g, "").length >= 10 && lookupResult !== null ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                  <UserPlus className="h-3 w-3" />
                  नया ग्राहक
                </span>
              ) : null}
            </div>

            {/* Mobile Number Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                मोबाइल नंबर (10 Digits) *
              </label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="10-अंकीय मोबाइल नंबर (उदा: 9939130538)"
                    value={mobile}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const cleanDigits = raw.replace(/\D/g, "");
                      setMobile(cleanDigits.length > 10 ? cleanDigits.slice(-10) : cleanDigits);
                    }}
                    className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm font-semibold tracking-wider focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleLookup()}
                  disabled={lookingUp || mobile.length < 10}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  {lookingUp ? "जाँच जारी…" : "चेक करें"}
                </button>
              </div>
            </div>

            {/* Previous Due Callout (Strictly Informational) */}
            {lookupResult && lookupResult.found && lookupResult.previousDue > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-0.5">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
                    पिछली बकाया उधारी (Previous Due):
                  </span>
                  <span className="text-amber-800 text-sm font-black">
                    {formatINR(lookupResult.previousDue)}
                  </span>
                </div>
                <p className="text-[11px] text-amber-700">
                  (यह सिर्फ जानकारी के लिए है — नए बिल में नहीं जोड़ी जा रही है)
                </p>
              </div>
            )}

            {/* Customer Name & Address (Editable) */}
            <div className="grid grid-cols-1 gap-2.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ग्राहक का नाम *
                </label>
                <input
                  type="text"
                  placeholder="ग्राहक का पूरा नाम"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  डिलीवरी का पता (Address)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="गांव, सड़क, या शहर का नाम"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cart & Line Items */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-emerald-600" />
                3. चुनी गई सामग्रियां ({cart.length})
              </span>
              <span className="font-bold text-slate-900">{formatINR(subtotal)}</span>
            </h2>

            {cart.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400">
                बाईं ओर से सामग्रियां कार्ट में जोड़ें।
              </div>
            ) : (
              <div className="space-y-2 divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.product.id} className="pt-2 flex items-center justify-between gap-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 truncate">{item.product.name}</p>
                      <p className="text-slate-500">
                        {formatINR(item.product.price)} / {item.product.unit}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-300 rounded bg-white">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                          className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-100"
                        >
                          -
                        </button>
                        <span className="px-2 font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.product.id, item.quantity + 1)}
                          className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-100"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-bold text-slate-900 w-16 text-right">
                        {formatINR(item.product.price * item.quantity)}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bill Calculation & Payment */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Banknote className="h-4 w-4 text-emerald-600" />
              4. बिल व भुगतान (Bill & Payment)
            </h2>

            {/* Charges Inputs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Truck className="h-3 w-3 text-slate-500" />
                  किराया / परिवहन (₹)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={transportation}
                  onChange={(e) => setTransportation(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Tag className="h-3 w-3 text-slate-500" />
                  छूट / डिस्काउंट (₹)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Final Bill Highlight */}
            <div className="rounded-xl bg-slate-900 p-3.5 text-white flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">कुल देय राशि (Final Bill)</p>
                <p className="text-xl font-black text-emerald-400">{formatINR(finalBill)}</p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>सामग्री: {formatINR(subtotal)}</p>
                {transportCharge > 0 && <p>+ किराया: {formatINR(transportCharge)}</p>}
                {discountAmount > 0 && <p className="text-amber-300">- छूट: {formatINR(discountAmount)}</p>}
              </div>
            </div>

            {/* Paid Amount & Payment Mode */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-slate-700">
                ग्राहक ने अभी कितना पैसा दिया? (Paid Now)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    max={finalBill}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-7 pr-3 py-2 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPaymentMode("CASH")}
                    className={`flex-1 rounded-lg py-1 text-xs font-bold transition ${
                      paymentMode === "CASH"
                        ? "bg-white text-emerald-800 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode("ONLINE")}
                    className={`flex-1 rounded-lg py-1 text-xs font-bold transition ${
                      paymentMode === "ONLINE"
                        ? "bg-white text-emerald-800 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Online / UPI
                  </button>
                </div>
              </div>

              {/* Live Remaining Due & Status */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-200 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">बाकी उधारी:</span>
                  <span className="font-bold text-red-600 text-sm">{formatINR(remainingDue)}</span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 font-bold ${
                    paymentStatus === "PAID"
                      ? "bg-emerald-100 text-emerald-800"
                      : paymentStatus === "PARTIAL"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {paymentStatus === "PAID" ? "PAID (फुल पेमेंट)" : paymentStatus === "PARTIAL" ? "PARTIAL (आंशिक)" : "DUE (पूरी उधारी)"}
                </span>
              </div>
            </div>

            {/* Confirm & Submit Button */}
            <button
              type="button"
              onClick={handleSubmitOrder}
              disabled={submitting || cart.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 py-3.5 text-sm font-black text-white shadow-md hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 transition"
            >
              {submitting ? (
                "ऑर्डर तैयार हो रहा है…"
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  ऑर्डर बनाएँ और बिल तैयार करें
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
