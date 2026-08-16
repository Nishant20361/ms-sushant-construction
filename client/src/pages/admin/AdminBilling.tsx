import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { adminApi, ApiRequestError } from "../../lib/api";
import type { Bill, Order } from "../../types";
import { formatINR, formatDate } from "../../lib/format";
import { printInvoice } from "../../lib/printInvoice";
import { LoadingState, ErrorState } from "../../components/Loading";
import { useToast } from "../../components/Toast";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  OUT_FOR_DELIVERY: "Out For Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default function AdminBilling() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedId = Number(searchParams.get("order") ?? "") || null;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(preselectedId);
  const [order, setOrder] = useState<Order | null>(null);
  const [bill, setBill] = useState<Bill | null>(null);
  const [discount, setDiscount] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingBill, setLoadingBill] = useState(false);

  // Load order list
  useEffect(() => {
    setLoadingOrders(true);
    setOrdersError(null);
    adminApi
      .getOrders({ page: 1, limit: 100, search: search || undefined })
      .then((res) => setOrders(res.orders))
      .catch(() => setOrdersError("Failed to load orders"))
      .finally(() => setLoadingOrders(false));
  }, [search]);

  // Load selected order + bill
  useEffect(() => {
    if (!selectedOrderId) {
      setOrder(null);
      setBill(null);
      setDiscount("");
      return;
    }
    setLoadingBill(true);
    Promise.all([adminApi.getOrder(selectedOrderId), adminApi.getBill(selectedOrderId)])
      .then(([{ order: ord }, b]) => {
        setOrder(ord);
        setBill(b.bill);
        setDiscount(b.bill ? String(b.bill.discount) : "");
      })
      .catch(() => error("Failed to load order bill"))
      .finally(() => setLoadingBill(false));
  }, [selectedOrderId, error]);

  const handleSaveBill = async () => {
    if (!selectedOrderId || !order) return;
    const d = parseFloat(discount);
    if (Number.isNaN(d) || d < 0) {
      error("Enter a valid discount amount");
      return;
    }
    if (d > order.subtotal) {
      error("Discount cannot be greater than the order subtotal");
      return;
    }
    setSaving(true);
    try {
      const { bill: saved } = await adminApi.saveBill(selectedOrderId, d);
      setBill(saved);
      setDiscount(String(saved.discount));
      success("Bill saved successfully");
    } catch (e) {
      if (e instanceof ApiRequestError) error(e.message);
      else error("Failed to save bill");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyText = async () => {
    if (!order) return;
    try {
      const res = await fetch(adminApi.getBillTextUrl(order.id), { credentials: "include" });
      if (!res.ok) throw new Error();
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      success("Bill text copied to clipboard");
    } catch {
      error("Failed to copy bill text");
    }
  };

const openPrintView = () => {
    if (!order) return;
    const win = printInvoice(order.id);
    if (!win) {
      error("Popup blocked. Please allow popups for this site and try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Billing</h2>
        <p className="text-sm text-slate-500">
          Generate invoices, add discounts, print invoices and share via WhatsApp.
        </p>
      </div>

      {/* Order search/select */}
      <div className="card p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            placeholder="Search by order number, customer name or mobile…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input flex-1"
          />
        </div>
        {loadingOrders ? (
          <LoadingState label="Loading orders…" />
        ) : ordersError ? (
          <ErrorState message={ordersError} />
        ) : (
          <div className="mt-3 max-h-64 overflow-y-auto">
            {orders.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">No orders found.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <li key={o.id}>
                    <button
                      onClick={() => setSelectedOrderId(o.id)}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${
                        selectedOrderId === o.id ? "bg-brand-50" : ""
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{o.orderNumber}</p>
                        <p className="text-xs text-slate-500">
                          {o.customerName} · {o.customerMobile} · {formatDate(o.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">{formatINR(o.subtotal)}</p>
                        <p className="text-xs text-slate-500">{STATUS_LABELS[o.status] ?? o.status}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Selected order details + billing */}
      {selectedOrderId && (
        <div className="card p-6">
          {loadingBill ? (
            <LoadingState label="Loading bill…" />
          ) : order ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{order.orderNumber}</h3>
                  <p className="text-sm text-slate-500">
                    {order.customerName} · {order.customerMobile}
                  </p>
                  <p className="text-sm text-slate-500">{order.deliveryAddress || "Address not provided"}</p>
                </div>
                <div className="text-right">
                  <span className="badge bg-brand-100 text-brand-800">
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(order.createdAt)}</p>
                </div>
              </div>

              {/* Items */}
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Items</p>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {order.items.map((it) => (
                    <li key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium text-slate-900">{it.productName}</p>
                        <p className="text-xs text-slate-500">
                          {it.unit} · {formatINR(it.price)} × {it.quantity}
                        </p>
                      </div>
                      <span className="font-semibold text-slate-900">{formatINR(it.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Totals */}
              <div className="mt-5 flex flex-col gap-2 rounded-lg bg-slate-50 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-semibold text-slate-900">{formatINR(order.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Discount</span>
                  <span className="font-semibold text-slate-900">
                    {bill && bill.discount > 0 ? formatINR(bill.discount) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                  <span className="font-semibold text-slate-800">Final Amount (Total)</span>
                  <span className="text-lg font-bold text-brand-600">
                    {formatINR(bill?.finalAmount ?? order.subtotal)}
                  </span>
                </div>
              </div>

              {/* Payment details */}
              <div className="mt-5 rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Payment Details</p>
                  <span
                    className={`badge ${
                      order.paymentStatus === "PAID"
                        ? "bg-green-100 text-green-700"
                        : order.paymentStatus === "PARTIALLY_PAID"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {order.paymentStatus === "PARTIALLY_PAID" ? "PARTIALLY PAID" : order.paymentStatus}
                  </span>
                </div>

                {/* Vertical rows: label left, value right */}
                <div className="mt-3 divide-y divide-slate-100">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-600">Total Amount</span>
                    <span className="font-semibold text-slate-900">{formatINR(order.finalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-600">Cash Paid</span>
                    <span className="font-semibold text-green-700">{formatINR(order.cashTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-600">Online Paid</span>
                    <span className="font-semibold text-blue-700">{formatINR(order.onlineTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-600">Total Paid</span>
                    <span className="font-semibold text-green-700">{formatINR(order.paidTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="font-semibold text-slate-800">Due Amount</span>
                    <span className={`font-bold ${order.due > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {formatINR(order.due)}
                    </span>
                  </div>
                </div>

                {/* Payment history — below Due Amount */}
                {order.payments.length > 0 && (
                  <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100">
                    {order.payments.map((p) => (
                      <li key={p.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <span className="text-slate-500">
                          {p.paymentMode === "CASH" ? "Cash" : "Online"} · {formatDate(p.paymentDate)}
                        </span>
                        <span className="font-semibold text-slate-800">{formatINR(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Receive Payment — below Payment History */}
                {order.due > 0 && (
                  <button
                    onClick={() => navigate(`/admin/payments/receive/${order.id}`)}
                    className="btn-primary mt-4 text-sm"
                  >
                    💰 Receive Payment
                  </button>
                )}
              </div>

              {/* Discount editor */}
              <div className="mt-5 rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-800">Special Discount (विशेष छूट)</p>
                <p className="text-xs text-slate-500">
                  Enter 0 to remove the discount. The discount line is hidden when it's 0.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="Discount amount (₹)"
                    className="input sm:w-48"
                  />
                  <button
                    onClick={handleSaveBill}
                    disabled={saving}
                    className="btn-primary disabled:opacity-50"
                  >
                    {saving ? "Saving…" : bill ? "Update Bill" : "Generate Bill"}
                  </button>
                </div>
              </div>

{/* Bill actions */}
              <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={openPrintView} className="btn-primary">
                  🖨️ Print Invoice
                </button>
                <button onClick={handleCopyText} className="btn-secondary">
                  📋 Copy Bill Text
                </button>
              </div>
            </>
          ) : (
            <p className="py-6 text-center text-slate-500">Select an order to generate a bill.</p>
          )}
        </div>
      )}
    </div>
  );
}
