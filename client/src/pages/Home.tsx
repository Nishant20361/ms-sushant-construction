import { useEffect, useMemo, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { useCart } from "../context/CartContext";
import { publicApi } from "../lib/api";
import type { Category, Product, TrackedOrder, TrackedOrderSummary } from "../types";
import { formatINR, formatOrderStatus, resolveImageUrl } from "../lib/format";
import { EmptyState, ErrorState, LoadingState } from "../components/Loading";
import { useToast } from "../components/Toast";

const PAGE_SIZE = 12;

export default function Home() {
  const { settings } = useSettings();
  const { addItem } = useCart();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

// ----- Order tracking state -----
const [trackMode, setTrackMode] = useState<"id" | "mobile">("mobile");
  const [trackOrderNumber, setTrackOrderNumber] = useState("");
  const [trackMobile, setTrackMobile] = useState("");
  const [tracking, setTracking] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrder | null>(null);
  const [trackedOrders, setTrackedOrders] = useState<TrackedOrderSummary[]>([]);
  const [selectedTrackedOrder, setSelectedTrackedOrder] = useState<TrackedOrder | null>(null);

  const handleTrackById = async () => {
    if (!trackOrderNumber.trim() || !trackMobile.trim()) {
      setTrackError("Please enter both your Order ID and mobile number.");
      setTrackedOrder(null);
      return;
    }
    setTracking(true);
    setTrackError(null);
    setTrackedOrders([]);
    setSelectedTrackedOrder(null);
    try {
      const { order } = await publicApi.trackOrder(
        trackOrderNumber.trim(),
        trackMobile.trim()
      );
      setTrackedOrder(order);
    } catch (e: any) {
      setTrackedOrder(null);
      setTrackError(e?.message ?? "Could not find your order. Please check the details and try again.");
    } finally {
      setTracking(false);
    }
  };

  const handleTrackByMobile = async () => {
    if (!trackMobile.trim()) {
      setTrackError("Please enter your mobile number.");
      setTrackedOrders([]);
      setSelectedTrackedOrder(null);
      return;
    }
    setTracking(true);
    setTrackError(null);
    setTrackedOrder(null);
    try {
      const { orders } = await publicApi.trackOrdersByMobile(trackMobile.trim());
      if (orders.length === 0) {
        setTrackError("No orders found for this mobile number.");
        setTrackedOrders([]);
      } else {
        setTrackedOrders(orders);
      }
    } catch (e: any) {
      setTrackedOrders([]);
      setTrackError(e?.message ?? "Could not find orders. Please check the details and try again.");
    } finally {
      setTracking(false);
    }
  };

  const handleSelectTrackedOrder = async (orderNumber: string) => {
    if (!trackMobile.trim()) return;
    setTracking(true);
    setTrackError(null);
    try {
      const { order } = await publicApi.trackOrder(orderNumber, trackMobile.trim());
      setSelectedTrackedOrder(order);
    } catch (e: any) {
      setSelectedTrackedOrder(null);
      setTrackError(e?.message ?? "Could not load order details.");
    } finally {
      setTracking(false);
    }
  };

  useEffect(() => {
    publicApi
      .getCategories()
      .then(({ categories }) => setCategories(categories))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [activeCategory, debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    publicApi
      .getProducts({
        category: activeCategory ?? undefined,
        search: debouncedSearch || undefined,
        page,
        limit: PAGE_SIZE,
      })
      .then((res) => {
        if (!cancelled) {
          setProducts(res.products);
          setTotal(res.total);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load products. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCategory, debouncedSearch, page]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const heroBg = useMemo(
    () => ({
      backgroundImage: settings?.heroBannerUrl
        ? `linear-gradient(rgba(15,23,42,0.75), rgba(15,23,42,0.75)), url(${resolveImageUrl(settings.heroBannerUrl) ??
        "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1600&q=80"
        })`
        : "linear-gradient(rgba(15,23,42,0.8), rgba(15,23,42,0.8)), url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1600&q=80')",
      backgroundSize: "cover",
      backgroundPosition: "center",
    }),
    [settings?.heroBannerUrl]
  );

const handleAdd = (p: Product, quantity: number) => {
    if (p.stock <= 0) {
      toast("This product is out of stock", "error");
      return;
    }
    addItem(p, quantity);
    toast(`${p.name} × ${quantity} ${p.unit} added to cart`, "success");
  };

  return (
    <main>
      {/* ============ HERO ============ */}
      <section id="home" className="relative text-white" style={heroBg}>
        <div className="container-page flex min-h-[560px] flex-col justify-center py-20">
          <span className="badge mb-4 w-fit bg-brand-600/90 text-white">
            ★ Trusted Supplier since years
          </span>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
            {settings?.heroTitle || "Quality Construction Materials"}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-200">
            {settings?.heroSubtitle ||
              "Cement, steel rods, roofing sheets, waterproofing chemicals and more — delivered at the best prices."}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href="#products" className="btn-primary !px-7 !py-3 !text-base">
              Browse Products
            </a>
            <a href="#contact" className="btn-secondary !bg-white/10 !border-white/30 !text-white !px-7 !py-3 !text-base hover:!bg-white/20">
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* ============ ABOUT ============ */}
      <section id="about" className="bg-white py-16">
        <div className="container-page grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <span className="badge bg-brand-100 text-brand-800">About Us</span>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              {settings?.companyName || "M/S Sushant Construction"}
            </h2>
            <p className="mt-4 leading-relaxed text-slate-600">
              {settings?.aboutContent ||
                "M/S Sushant Construction is a trusted supplier of construction materials. We supply premium cement, TMT steel rods, roofing sheets, waterproofing chemicals, binding wire, plastic sheets, iron nails and cover blocks at competitive prices."}
            </p>
            <div className="mt-6 grid grid-cols-3 gap-4">
              {[
                { value: "11+", label: "Categories" },
                { value: "35+", label: "Products" },
                { value: "100%", label: "Genuine Materials" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-200 p-4 text-center">
                  <p className="text-2xl font-extrabold text-brand-600">{s.value}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img
              src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80"
              alt="Construction site"
              className="h-56 w-full rounded-xl object-cover"
              loading="lazy"
            />
            <img
              src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=600&q=80"
              alt="Construction materials"
              className="mt-8 h-56 w-full rounded-xl object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* ============ CATEGORIES + PRODUCTS ============ */}
      <section id="categories" className="py-16">
        <div className="container-page">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <span className="badge bg-brand-100 text-brand-800">Our Products</span>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">Browse by Category</h2>
            </div>
            <div className="w-full sm:w-80">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="input"
                aria-label="Search products"
              />
            </div>
          </div>

          {/* Category filter chips */}
          <div id="products" className="mt-8 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeCategory === null
                  ? "bg-brand-600 text-white"
                  : "border border-slate-300 bg-white text-slate-600 hover:border-brand-400"
                }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.slug)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeCategory === c.slug
                    ? "bg-brand-600 text-white"
                    : "border border-slate-300 bg-white text-slate-600 hover:border-brand-400"
                  }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="mt-8">
            {loading ? (
              <LoadingState label="Loading products…" />
            ) : error ? (
              <ErrorState message={error} onRetry={() => setPage((p) => p)} />
            ) : products.length === 0 ? (
              <EmptyState
                title="No products found"
                message={
                  debouncedSearch
                    ? `No products match "${debouncedSearch}". Try a different search or category.`
                    : "No products are available in this category yet."
                }
              />
            ) : (
              <>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
{products.map((p) => (
                    <ProductCard key={p.id} product={p} onAdd={(qty) => handleAdd(p, qty)} />
                  ))}
                </div>

                {pages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="btn-secondary"
                    >
                      ← Prev
                    </button>
                    <span className="px-3 text-sm font-medium text-slate-600">
                      Page {page} of {pages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(pages, p + 1))}
                      disabled={page === pages}
                      className="btn-secondary"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

{/* ============ TRACK ORDER ============ */}
      <section id="track" className="bg-white py-16">
        <div className="container-page max-w-3xl">
          <div className="text-center">
            <span className="badge bg-brand-100 text-brand-800">Order Tracking</span>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">Track Your Order</h2>
            <p className="mx-auto mt-2 max-w-lg text-slate-600">
              Enter your mobile number to find all your orders, or use Order ID + mobile for a specific order.
            </p>
          </div>

          {/* Mode toggle */}
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => { setTrackMode("mobile"); setTrackedOrder(null); setTrackedOrders([]); setSelectedTrackedOrder(null); setTrackError(null); }}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${trackMode === "mobile" ? "bg-brand-600 text-white" : "border border-slate-300 bg-white text-slate-600 hover:border-brand-400"}`}
            >
              📱 All Orders (by Mobile)
            </button>
            <button
              onClick={() => { setTrackMode("id"); setTrackedOrder(null); setTrackedOrders([]); setSelectedTrackedOrder(null); setTrackError(null); }}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${trackMode === "id" ? "bg-brand-600 text-white" : "border border-slate-300 bg-white text-slate-600 hover:border-brand-400"}`}
            >
              🔍 Specific Order
            </button>
          </div>

          {/* Form: track by ID */}
          {trackMode === "id" && (
            <form
              className="mt-6 flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => { e.preventDefault(); handleTrackById(); }}
            >
              <input
                type="text"
                value={trackOrderNumber}
                onChange={(e) => setTrackOrderNumber(e.target.value)}
                placeholder="Order ID (e.g. MSC-20260802-0001)"
                className="input flex-1"
                aria-label="Order ID"
              />
              <input
                type="tel"
                value={trackMobile}
                onChange={(e) => setTrackMobile(e.target.value)}
                placeholder="Mobile number (10 digits)"
                className="input flex-1"
                aria-label="Mobile number"
              />
              <button type="submit" className="btn-primary" disabled={tracking}>
                {tracking ? "Checking…" : "Track"}
              </button>
            </form>
          )}

{/* Form: track by mobile only (default) */}
          {trackMode === "mobile" && (
            <form
              className="mt-6 flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => { e.preventDefault(); handleTrackByMobile(); }}
            >
              <input
                type="tel"
                value={trackMobile}
                onChange={(e) => setTrackMobile(e.target.value)}
                placeholder="Enter your mobile number (10 digits)"
                className="input flex-1"
                aria-label="Mobile number"
              />
              <button type="submit" className="btn-primary" disabled={tracking}>
                {tracking ? "Searching…" : "Find My Orders"}
              </button>
            </form>
          )}

          {trackError && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{trackError}</p>
          )}

          {/* Order list (when tracking by mobile) */}
          {trackedOrders.length > 0 && !selectedTrackedOrder && (
            <div className="card mt-6 p-6">
              <h3 className="text-lg font-bold text-slate-900">Your Orders</h3>
              <p className="mt-1 text-sm text-slate-500">Click on an order to see details.</p>
              <ul className="mt-4 divide-y divide-slate-100">
                {trackedOrders.map((o) => (
                  <li key={o.id}>
                    <button
                      onClick={() => handleSelectTrackedOrder(o.orderNumber)}
                      className="flex w-full items-center justify-between gap-2 px-2 py-3 text-left transition hover:bg-slate-50"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{o.orderNumber}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(o.createdAt).toLocaleString("en-IN")} · {o.items.length} item(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="badge bg-brand-100 text-brand-800">
                          {formatOrderStatus(o.status)}
                        </span>
                        <p className="mt-1 text-xs font-semibold text-slate-700">{formatINR(o.subtotal)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Single tracked order detail */}
          {(trackedOrder || selectedTrackedOrder) && !trackError && (
            <OrderDetailCard order={trackedOrder || selectedTrackedOrder!} />
          )}
        </div>
      </section>

      {/* ============ CONTACT ============ */}
      <section id="contact" className="bg-white py-16">
        <div className="container-page">
          <div className="text-center">
            <span className="badge bg-brand-100 text-brand-800">Contact Us</span>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">Get In Touch</h2>
            <p className="mx-auto mt-2 max-w-lg text-slate-600">
              ### 🙏 आपका हार्दिक स्वागत है!

              **निर्माण सामग्री, कीमत, गुणवत्ता या डिलीवरी से जुड़ा कोई भी सवाल है?**
              बेझिझक हमसे संपर्क करें। हमारी अनुभवी टीम आपकी हर आवश्यकता के अनुसार सही सलाह और सबसे बेहतरीन समाधान देने के लिए हमेशा तैयार है।

              📞 **उचित कीमत • उत्कृष्ट गुणवत्ता • समय पर डिलीवरी • भरोसेमंद सेवा**

              **एक बार सेवा का अवसर अवश्य दें — आपका विश्वास ही हमारी सबसे बड़ी पहचान और प्रेरणा है।**

              **🙏 पुनः आपका हार्दिक स्वागत है।
              हम आपके उज्ज्वल एवं मजबूत निर्माण की कामना करते हैं।
              धन्यवाद!**
            </p>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-slate-900">Our Details</h3>
              <ul className="mt-4 space-y-4 text-sm">
                {settings?.phone && (
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5">📞</span>
                    <div>
                      <p className="font-medium text-slate-700">Phone</p>
                      <a href={`tel:${settings.phone}`} className="text-brand-600 hover:underline">
                        {settings.phone}
                      </a>
                    </div>
                  </li>
                )}
                {settings?.whatsappNumber && (
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5">💬</span>
                    <div>
                      <p className="font-medium text-slate-700">WhatsApp</p>
                      <span className="text-slate-600">{settings.whatsappNumber}</span>
                    </div>
                  </li>
                )}
                {settings?.email && (
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5">✉️</span>
                    <div>
                      <p className="font-medium text-slate-700">Email</p>
                      <a href={`mailto:${settings.email}`} className="text-brand-600 hover:underline">
                        {settings.email}
                      </a>
                    </div>
                  </li>
                )}
                {settings?.address && (
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5">📍</span>
                    <div>
                      <p className="font-medium text-slate-700">Address</p>
                      <p className="text-slate-600">{settings.address}</p>
                    </div>
                  </li>
                )}
              </ul>
            </div>

            <div className="card overflow-hidden">
              {settings?.googleMapsUrl ? (
                <iframe
                  title="Google Maps location"
                  src={settings.googleMapsUrl}
                  className="h-full min-h-[320px] w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full min-h-[320px] w-full items-center justify-center bg-slate-100 text-slate-400">
                  Map location not configured
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProductCard({
  product: p,
  onAdd,
}: {
  product: Product;
  onAdd: (quantity: number) => void;
}) {
const discount = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  const outOfStock = p.stock <= 0;
  // Only "kg" (case-insensitive) permits decimal quantity. All other units are integer-only.
  const isKg = (p.unit || "").trim().toLowerCase() === "kg";
  // Blanks by default so the customer must enter a quantity before adding.
  const [quantity, setQuantity] = useState<number | "">("");

  const handleQuantityChange = (raw: string) => {
    // Allow only positive numbers (with optional decimals). No negatives or text.
    if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
    if (raw === "") {
      setQuantity("");
      return;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    let q = parsed;
    if (isKg) {
      // kg allows decimals (e.g. 0.5, 1.25, 10.50)
      q = Math.max(0.001, q);
    } else {
      // all other units: integer only
      q = Math.max(1, Math.floor(q));
    }
    q = Math.min(q, p.stock);
    setQuantity(q);
  };

  return (
    <article className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {p.imageUrl ? (
          <img
            src={resolveImageUrl(p.imageUrl) ?? ""}
            alt={p.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl">🧱</div>
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {discount > 0 && (
            <span className="badge bg-red-600 text-white">{discount}% OFF</span>
          )}
          {outOfStock && <span className="badge bg-slate-800 text-white">Out of Stock</span>}
        </div>
        {p.category && (
          <span className="absolute right-2 top-2 badge bg-white/90 text-slate-700">
            {p.category.name}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold text-slate-900">{p.name}</h3>
        <p className="mt-0.5 text-xs text-slate-500">{p.unit}</p>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-brand-600">{formatINR(p.price)}</span>
          {p.mrp > p.price && (
            <span className="text-sm text-slate-400 line-through">{formatINR(p.mrp)}</span>
          )}
        </div>

        <div className="mt-1 text-xs">
          {outOfStock ? (
            <span className="font-medium text-red-600">Currently unavailable</span>
          ) : (
            <span className={p.stock < 10 ? "font-medium text-amber-600" : "text-slate-500"}>
              {p.stock < 10 ? `Only ${p.stock} left` : "In stock"}
            </span>
          )}
        </div>

<div className="mt-4 flex items-center gap-2">
          <label htmlFor={`qty-${p.id}`} className="text-xs font-medium text-slate-500">
            Qty
          </label>
          <input
            id={`qty-${p.id}`}
            type="number"
            inputMode={isKg ? "decimal" : "numeric"}
            value={quantity}
            min={isKg ? "0" : "1"}
            max={p.stock}
            step={isKg ? "0.1" : "1"}
            placeholder="Enter the quantity"
            disabled={outOfStock}
            onChange={(e) => handleQuantityChange(e.target.value)}
            className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Quantity for ${p.name}`}
          />
          <span className="text-sm text-slate-600">{p.unit}</span>
        </div>

        <button
          onClick={() => onAdd(quantity === "" || Number(quantity) <= 0 ? 0 : Number(quantity))}
          disabled={outOfStock || quantity === "" || Number(quantity) <= 0}
          className="btn-primary mt-3 w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {outOfStock ? "Out of Stock" : "Add to Cart"}
        </button>
      </div>
    </article>
  );
}

const ORDER_FLOW = [
  { key: "PENDING", label: "Received" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PROCESSING", label: "Processing" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { key: "DELIVERED", label: "Delivered" },
] as const;

function OrderTimeline({ status }: { status: TrackedOrder["status"] }) {
  const current = status === "CANCELLED" ? -1 : ORDER_FLOW.findIndex((s) => s.key === status);

  if (status === "CANCELLED") {
    return (
      <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        This order was cancelled.
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
      {ORDER_FLOW.map((step, idx) => {
        const done = idx <= current;
        return (
          <li key={step.key} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  done ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400"
                }`}
              >
                {done ? "✓" : idx + 1}
              </span>
              <span
                className={`text-xs font-medium ${
                  done ? "text-slate-800" : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < ORDER_FLOW.length - 1 && (
              <div
                className={`mx-2 hidden h-0.5 flex-1 rounded sm:block ${
                  idx < current ? "bg-brand-600" : "bg-slate-200"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Order detail card shown to the customer after tracking. */
function OrderDetailCard({ order }: { order: TrackedOrder }) {
  return (
    <div className="card mt-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{order.orderNumber}</h3>
          <p className="text-sm text-slate-500">
            {order.customerName} · {new Date(order.createdAt).toLocaleString("en-IN")}
          </p>
        </div>
        <span className="badge bg-brand-100 text-brand-800">
          {formatOrderStatus(order.status)}
        </span>
      </div>

      {/* Status timeline */}
      <div className="mt-6">
        <OrderTimeline status={order.status} />
      </div>

      {/* Items */}
      <div className="mt-6">
        <h4 className="font-semibold text-slate-800">Items</h4>
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {order.items.map((it, idx) => (
            <li key={idx} className="flex items-center justify-between py-2">
              <span className="text-slate-700">
                {it.productName} × {it.quantity} {it.unit}
              </span>
              <span className="font-medium text-slate-900">{formatINR(it.total)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Totals with optional bill info */}
      <div className="mt-4 space-y-1 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Subtotal</span>
          <span className="font-semibold text-slate-900">{formatINR(order.subtotal)}</span>
        </div>
        {order.bill && order.bill.discount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Discount</span>
            <span className="font-semibold text-red-600">-{formatINR(order.bill.discount)}</span>
          </div>
        )}
        {order.bill && (
          <div className="flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="text-sm font-semibold text-slate-700">Final Amount</span>
            <span className="text-lg font-bold text-brand-600">{formatINR(order.bill.finalAmount)}</span>
          </div>
        )}
        {!order.bill && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total</span>
            <span className="text-lg font-bold text-brand-600">{formatINR(order.subtotal)}</span>
          </div>
        )}
      </div>

      {/* Delivery address */}
      {order.deliveryAddress && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
          <span className="font-medium text-slate-600">Delivery Address:</span>
          <p className="mt-1 text-slate-700">{order.deliveryAddress}</p>
        </div>
      )}
    </div>
  );
}

