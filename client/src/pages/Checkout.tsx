import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useSettings } from "../context/SettingsContext";
import { publicApi, ApiRequestError } from "../lib/api";
import { formatINR } from "../lib/format";
import { useToast } from "../components/Toast";

export default function Checkout() {
  const { items, subtotal, clearCart, setQuantity, removeItem } = useCart();
  const { settings } = useSettings();
  const { success, error } = useToast();

  const [form, setForm] = useState({
    customerName: "",
    customerMobile: "",
    deliveryAddress: "",
    notes: "",
  });
  const [placing, setPlacing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [placedOrder, setPlacedOrder] = useState<{ orderNumber: string; subtotal: number } | null>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.customerName.trim() || form.customerName.trim().length < 2) {
      errs.customerName = "Please enter your full name";
    }
    const digits = form.customerMobile.replace(/\D/g, "").replace(/^(0|91)/, "");
    if (!/^[6-9]\d{9}$/.test(digits)) {
      errs.customerMobile = "Enter a valid 10-digit Indian mobile number";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;
    if (!validate()) {
      error("Please fix the highlighted fields");
      return;
    }
    setPlacing(true);
    try {
      const res = await publicApi.placeOrder({
        customerName: form.customerName.trim(),
        customerMobile: form.customerMobile.trim(),
        deliveryAddress: form.deliveryAddress.trim(),
        notes: form.notes.trim() || undefined,
        cashAmount: 0,
        onlineAmount: 0,
        items: items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
      });
      setPlacedOrder({ orderNumber: res.order.orderNumber, subtotal: res.order.subtotal });
      clearCart();
      window.scrollTo({ top: 0, behavior: "smooth" });
      success(`Order ${res.order.orderNumber} placed successfully`);
    } catch (e) {
      if (e instanceof ApiRequestError) {
        error(e.message);
      } else {
        error("Failed to place order. Please try again.");
      }
    } finally {
      setPlacing(false);
    }
  };

  if (placedOrder) {
    return (
      <main className="container-page py-20">
        <div className="card mx-auto max-w-lg p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">✅</div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Order Placed!</h1>
          <p className="mt-2 text-slate-600">
            Thank you for your order. Your order number is:
          </p>
          <p className="mt-3 rounded-lg bg-brand-50 px-4 py-3 text-xl font-extrabold tracking-wide text-brand-700">
            {placedOrder.orderNumber}
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Total: {formatINR(placedOrder.subtotal)} · Status: Pending
          </p>
          <p className="mt-2 text-sm text-slate-500">
            We will call you shortly to confirm delivery details.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link to="/" className="btn-primary">
              Continue Shopping
            </Link>
            {settings?.whatsappNumber && (
              <a
                href={`https://wa.me/91${settings.whatsappNumber.replace(/\D/g, "").replace(/^(0|91)/, "")}?text=${encodeURIComponent(
                  `Hello ${settings.companyName}, I just placed order ${placedOrder.orderNumber}. Please confirm it.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Confirm on WhatsApp
              </a>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="container-page py-20">
        <div className="card mx-auto max-w-lg p-8 text-center">
          <div className="text-5xl">🛒</div>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Your cart is empty</h1>
          <p className="mt-2 text-slate-600">Add some products before checking out.</p>
          <Link to="/" className="btn-primary mt-6">
            Browse Products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container-page py-12">
      <h1 className="text-3xl font-bold text-slate-900">Checkout</h1>
      <p className="mt-1 text-slate-600">Fill in your delivery details to place the order.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        {/* Delivery details form */}
        <div className="lg:col-span-3">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900">Delivery Details</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="label" htmlFor="customerName">Full Name *</label>
                <input
                  id="customerName"
                  className="input"
                  placeholder="e.g. Rahul Verma"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                />
                {fieldErrors.customerName && (
                  <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.customerName}</p>
                )}
              </div>

              <div>
                <label className="label" htmlFor="customerMobile">Mobile Number *</label>
                <input
                  id="customerMobile"
                  className="input"
                  placeholder="10-digit mobile number"
                  inputMode="numeric"
                  maxLength={15}
                  value={form.customerMobile}
                  onChange={(e) => setForm({ ...form, customerMobile: e.target.value })}
                />
                {fieldErrors.customerMobile && (
                  <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.customerMobile}</p>
                )}
              </div>

              <div>
                <label className="label" htmlFor="deliveryAddress">Delivery Address <span className="text-slate-400">(optional)</span></label>
                <textarea
                  id="deliveryAddress"
                  className="input min-h-[90px]"
                  placeholder="House no, street, area, city, state, PIN code"
                  value={form.deliveryAddress}
                  onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                />
                {fieldErrors.deliveryAddress && (
                  <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.deliveryAddress}</p>
                )}
              </div>

              <div>
                <label className="label" htmlFor="notes">Notes (optional)</label>
                <textarea
                  id="notes"
                  className="input min-h-[70px]"
                  placeholder="Any special instructions…"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Order summary & Place order action */}
        <div className="lg:col-span-2">
          <div className="card sticky top-20 p-6">
            <h2 className="text-lg font-semibold text-slate-900">Order Summary</h2>
            <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
              {items.map((it) => (
                <li key={it.productId} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{it.name}</p>
                    <p className="text-xs text-slate-500">
                      {formatINR(it.price)} × {it.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity(it.productId, it.quantity - 1)}
                      className="rounded border border-slate-300 px-1.5 text-slate-600 hover:bg-slate-100"
                      aria-label="Decrease"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-semibold">{it.quantity}</span>
                    <button
                      onClick={() => setQuantity(it.productId, it.quantity + 1)}
                      className="rounded border border-slate-300 px-1.5 text-slate-600 hover:bg-slate-100"
                      aria-label="Increase"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeItem(it.productId)}
                      className="ml-1 text-red-500 hover:text-red-700"
                      aria-label={`Remove ${it.name}`}
                    >
                      ✕
                    </button>
                  </div>
                  <span className="font-semibold text-slate-900">{formatINR(it.price * it.quantity)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Subtotal</span>
                <span className="text-xl font-bold text-slate-900">{formatINR(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Delivery charges and final total will be confirmed on call.
              </p>
            </div>

            <button onClick={handlePlaceOrder} disabled={placing} className="btn-primary mt-5 w-full !py-3">
              {placing ? "Placing Order…" : "Place Order"}
            </button>
            <Link to="/" className="btn-secondary mt-2 w-full">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
