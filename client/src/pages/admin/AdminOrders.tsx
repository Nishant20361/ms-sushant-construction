import { useCallback, useEffect, useState } from "react";
import { adminApi, ApiRequestError } from "../../lib/api";
import type { Order, PaymentMode } from "../../types";
import { formatINR, formatDate } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/Loading";
import { useToast } from "../../components/Toast";

const STATUS_OPTIONS = ["PENDING", "CONFIRMED", "PROCESSING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] as const;
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  OUT_FOR_DELIVERY: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  DUE: "bg-red-100 text-red-700",
};

export default function AdminOrders() {
  const { success, error } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [changingStatus, setChangingStatus] = useState<{ id: number; status: string } | null>(null);
  // Edit modal state
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editItems, setEditItems] = useState<{ productId: number; productName: string; unit: string; price: number; quantity: number }[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  // Receive payment modal state
  const [payOrder, setPayOrder] = useState<Order | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<PaymentMode>("CASH");
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    adminApi
      .getOrders({
        page,
        limit: 10,
        search: search || undefined,
        status: statusFilter || undefined,
        payment: paymentFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      })
      .then((res) => {
        setOrders(res.orders);
        setPages(res.pages);
        setTotal(res.total);
      })
      .catch(() => setLoadError("Failed to load orders"))
      .finally(() => setLoading(false));
  }, [page, search, statusFilter, paymentFilter, fromDate, toDate]);

  useEffect(load, [load]);

  // Open edit modal and load products
  const openEdit = (order: Order) => {
    setEditingOrder(order);
    setEditOpen(true);
    setEditError(null);
    setEditItems(order.items.map((it) => ({
      productId: it.productId,
      productName: it.productName,
      unit: it.unit,
      price: it.price,
      quantity: it.quantity,
    })));
    adminApi.getProducts({ page: 1, limit: 200 }).then((res) => setAllProducts(res.products)).catch(() => setAllProducts([]));
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditingOrder(null);
    setEditItems([]);
    setAllProducts([]);
    setEditError(null);
  };

  const updateItemQuantity = (productId: number, quantity: number) => {
    setEditItems((prev) => prev.map((it) => it.productId === productId ? { ...it, quantity } : it));
  };

  const removeEditItem = (productId: number) => {
    setEditItems((prev) => prev.filter((it) => it.productId !== productId));
  };

  const addProductToEdit = (productId: number, qty: number) => {
    const prod = allProducts.find((p) => p.id === productId);
    if (!prod) return;
    if (editItems.find((it) => it.productId === productId)) return;
    setEditItems((prev) => [...prev, { productId: prod.id, productName: prod.name, unit: prod.unit, price: prod.price, quantity: qty }]);
  };

  const validateEditItems = (): string | null => {
    for (const it of editItems) {
      const unit = (it.unit || "").toLowerCase();
      const requiresInteger = unit === "bag" || unit === "piece";
      if (requiresInteger && !Number.isInteger(it.quantity)) return `Quantity for "${it.productName}" must be a whole number (${it.unit}).`;
      if (it.quantity <= 0) return `Quantity for "${it.productName}" must be greater than zero.`;
    }
    return null;
  };

  const saveEdit = async () => {
    if (!editingOrder) return;
    const v = validateEditItems();
    if (v) { setEditError(v); return; }
    setEditSaving(true);
    setEditError(null);
    try {
      const payload = editItems.map((it) => ({ productId: it.productId, quantity: it.quantity }));
      await adminApi.editOrder(editingOrder.id, payload);
      success("Order updated successfully");
      closeEdit();
      load();
    } catch (e: any) {
      if (e instanceof ApiRequestError) setEditError(e.message);
      else setEditError("Failed to save changes");
    } finally {
      setEditSaving(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    setChangingStatus({ id, status: newStatus });
    try {
      await adminApi.updateOrderStatus(id, newStatus);
      success(`Order status updated to ${newStatus}`);
      load();
    } catch (e) {
      if (e instanceof ApiRequestError) error(e.message);
      else error("Status update failed");
    } finally {
      setChangingStatus(null);
    }
  };

  const handleDelete = async (order: Order) => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this order?"
    );
    if (!confirmed) return;
    try {
      await adminApi.deleteOrder(order.id);
      success(`Order ${order.orderNumber} deleted`);
      if (expandedOrder === order.id) setExpandedOrder(null);
      load();
    } catch (e) {
      if (e instanceof ApiRequestError) error(e.message);
      else error("Delete failed");
    }
  };

  // Receive pending payment
  const openReceivePayment = (order: Order) => {
    setPayOrder(order);
    setPayAmount("");
    setPayMode("CASH");
    setPayError(null);
  };

  const closeReceivePayment = () => {
    setPayOrder(null);
    setPayAmount("");
    setPayMode("CASH");
    setPayError(null);
  };

  const submitReceivePayment = async () => {
    if (!payOrder) return;
    const amt = parseFloat(payAmount);
    if (Number.isNaN(amt) || amt <= 0) {
      setPayError("Enter a valid payment amount");
      return;
    }
    if (amt > payOrder.due + 0.001) {
      setPayError(`Amount exceeds the remaining due of ${formatINR(payOrder.due)}`);
      return;
    }
    setPaySaving(true);
    setPayError(null);
    try {
      await adminApi.receivePayment(payOrder.id, amt, payMode);
      success("Payment recorded successfully");
      closeReceivePayment();
      load();
    } catch (e) {
      if (e instanceof ApiRequestError) setPayError(e.message);
      else setPayError("Failed to record payment");
    } finally {
      setPaySaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Edit Modal */}
      {editOpen && editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="max-w-3xl rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-bold">Edit Order {editingOrder.orderNumber}</h3>
            <p className="text-sm text-slate-500">Customer: {editingOrder.customerName} · {editingOrder.customerMobile}</p>
            <div className="mt-4 space-y-3">
              {editItems.map((it) => (
                <div key={it.productId} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-medium">{it.productName}</div>
                    <div className="text-xs text-slate-500">{it.unit} · {formatINR(it.price)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={it.quantity}
                      onChange={(e) => {
                        const q = Number(e.target.value);
                        if (Number.isNaN(q)) return;
                        const unit = (it.unit || "").toLowerCase();
                        const requiresInteger = unit === "bag" || unit === "piece";
                        const newQ = requiresInteger ? Math.max(1, Math.floor(q)) : Math.max(0.001, Math.round(q * 1000) / 1000);
                        updateItemQuantity(it.productId, newQ);
                      }}
                      className="w-28 rounded-md border px-2 py-1"
                    />
                    <button onClick={() => removeEditItem(it.productId)} className="text-red-600">Remove</button>
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t">
                <div className="flex items-center gap-2">
                  <select id="add-product" className="input" defaultValue="">
                    <option value="">Select product to add</option>
                    {allProducts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} · {p.unit} · {formatINR(p.price)}</option>
                    ))}
                  </select>
                  <input id="add-qty" type="number" defaultValue={1} className="input w-28" />
                  <button onClick={() => {
                    const sel = document.getElementById('add-product') as HTMLSelectElement | null;
                    const qEl = document.getElementById('add-qty') as HTMLInputElement | null;
                    if (!sel || !qEl) return;
                    const pid = Number(sel.value);
                    const qty = Number(qEl.value);
                    if (!pid || Number.isNaN(qty)) return;
                    addProductToEdit(pid, qty);
                  }} className="btn-primary">Add</button>
                </div>
              </div>

              {editError && <div className="text-sm text-red-600">{editError}</div>}

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={closeEdit} className="btn-secondary">Cancel</button>
                <button onClick={saveEdit} disabled={editSaving} className="btn-primary">{editSaving ? 'Saving...' : 'Save changes'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receive Payment Modal */}
      {payOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-bold">Receive Payment</h3>
            <p className="text-sm text-slate-500">
              {payOrder.orderNumber} · {payOrder.customerName} · {payOrder.customerMobile}
            </p>
            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Order Total</span>
                <span className="font-bold text-slate-900">{formatINR(payOrder.finalAmount)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-slate-600">Already Paid</span>
                <span className="font-semibold text-green-700">{formatINR(payOrder.paidTotal)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-2">
                <span className="font-semibold text-slate-800">Remaining Due</span>
                <span className="font-bold text-red-600">{formatINR(payOrder.due)}</span>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label" htmlFor="payAmount">Amount Received (₹) *</label>
                <input
                  id="payAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="input"
                  placeholder="0"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="payMode">Payment Mode</label>
                <select
                  id="payMode"
                  className="input"
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                >
                  <option value="CASH">Cash</option>
                  <option value="ONLINE">Online</option>
                </select>
              </div>
              {payError && <div className="text-sm text-red-600">{payError}</div>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={closeReceivePayment} className="btn-secondary">Cancel</button>
              <button onClick={submitReceivePayment} disabled={paySaving} className="btn-primary">
                {paySaving ? "Saving…" : "Record Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-slate-900">Orders</h2>
        <p className="text-sm text-slate-500">{total} total</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-[200px] flex-1">
          <input
            type="search"
            placeholder="Search by order number, customer name, mobile, or date (YYYY-MM-DD)…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="input min-w-[140px]"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "OUT_FOR_DELIVERY" ? "Out For Delivery" : s}
            </option>
          ))}
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => {
            setPaymentFilter(e.target.value);
            setPage(1);
          }}
          className="input min-w-[150px]"
        >
          <option value="">All payments</option>
          <option value="PAID">Paid</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="DUE">Due</option>
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
          className="input w-40"
          aria-label="From date"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => { setToDate(e.target.value); setPage(1); }}
          className="input w-40"
          aria-label="To date"
        />
      </div>

      {loading ? (
        <LoadingState label="Loading orders…" />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : orders.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">No orders found.</div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="card">
              <div
                className="flex cursor-pointer flex-col justify-between gap-2 p-4 sm:flex-row sm:items-center"
                onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{o.orderNumber}</p>
                    <span className={`badge ${STATUS_COLORS[o.status] ?? "bg-slate-200 text-slate-600"}`}>
                      {o.status}
                    </span>
                    <span className={`badge ${PAYMENT_STATUS_STYLES[o.paymentStatus] ?? "bg-slate-200 text-slate-600"}`}>
                      {o.paymentStatus === "PARTIALLY_PAID" ? "PARTIALLY PAID" : o.paymentStatus}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {o.customerName} · {o.customerMobile} · {formatDate(o.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-slate-900">{formatINR(o.subtotal)}</span>
                  <span className="text-slate-400">{expandedOrder === o.id ? "▲" : "▼"}</span>
                </div>
              </div>

              {expandedOrder === o.id && (
                <div className="border-t border-slate-200 p-4">
                  <div className="mb-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{o.customerName}</p>
                      <p className="text-sm text-slate-600">{o.customerMobile}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery Address</p>
                      <p className="mt-1 text-sm text-slate-700">{o.deliveryAddress || "Address not provided"}</p>
                      {o.notes && <p className="mt-1 text-sm italic text-slate-500">Note: {o.notes}</p>}
                    </div>
                  </div>

                  {/* Payment details */}
                  <div className="mb-4 rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment Details</p>
                      <span className={`badge ${PAYMENT_STATUS_STYLES[o.paymentStatus] ?? "bg-slate-200 text-slate-600"}`}>
                        {o.paymentStatus === "PARTIALLY_PAID" ? "PARTIALLY PAID" : o.paymentStatus}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Order Total</span>
                        <span className="font-bold text-slate-900">{formatINR(o.finalAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Cash Paid</span>
                        <span className="font-semibold text-slate-900">{formatINR(o.cashTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Online Paid</span>
                        <span className="font-semibold text-slate-900">{formatINR(o.onlineTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Total Paid</span>
                        <span className="font-semibold text-green-700">{formatINR(o.paidTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                        <span className="font-semibold text-slate-800">Remaining Due</span>
                        <span className={`font-bold ${o.due > 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {formatINR(o.due)}
                        </span>
                      </div>
                    </div>
                    {o.payments.length > 0 && (
                      <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100">
                        {o.payments.map((p) => (
                          <li key={p.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                            <span className="text-slate-500">
                              {p.paymentMode === "CASH" ? "Cash" : "Online"} · {formatDate(p.paymentDate)}
                            </span>
                            <span className="font-semibold text-slate-800">{formatINR(p.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {o.due > 0 && (
                      <button onClick={() => openReceivePayment(o)} className="btn-primary mt-3 text-sm">
                        💰 Receive Payment
                      </button>
                    )}
                  </div>

                  <div className="mb-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Items</p>
                    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                      {o.items.map((it) => (
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

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-600">Update status:</span>
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(o.id, s)}
                        disabled={changingStatus?.id === o.id && changingStatus?.status === s}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          o.status === s
                            ? STATUS_COLORS[s] ?? "bg-slate-200 text-slate-600"
                            : "border border-slate-300 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => openEdit(o)}
                      className="btn-secondary text-sm"
                    >
                      Edit Order
                    </button>
                    <button
                      onClick={() => handleDelete(o)}
                      className="btn-danger text-sm"
                    >
                      Delete Order
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary">
            ← Prev
          </button>
          <span className="text-sm text-slate-600">
            Page {page} of {pages}
          </span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
