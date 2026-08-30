import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi, ApiRequestError } from "../../lib/api";
import type { Order } from "../../types";
import { formatINR, formatDate, formatOrderStatus } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/Loading";
import { useToast } from "../../components/Toast";
import {
  Search,
  Receipt,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Package,
  Phone,
  MapPin,
  Calendar,
} from "lucide-react";

const STATUS_OPTIONS = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  PROCESSING: "bg-purple-100 text-purple-800 border-purple-200",
  OUT_FOR_DELIVERY: "bg-indigo-100 text-indigo-800 border-indigo-200",
  DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-800 border-emerald-200",
  PARTIALLY_PAID: "bg-amber-100 text-amber-800 border-amber-200",
  DUE: "bg-rose-100 text-rose-800 border-rose-200",
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
  const [editItems, setEditItems] = useState<
    { productId: number; productName: string; unit: string; price: number; quantity: number }[]
  >([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
    setEditItems(
      order.items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        unit: it.unit,
        price: it.price,
        quantity: it.quantity,
      }))
    );
    adminApi
      .getProducts({ page: 1, limit: 200 })
      .then((res) => setAllProducts(res.products))
      .catch(() => setAllProducts([]));
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditingOrder(null);
    setEditItems([]);
    setAllProducts([]);
    setEditError(null);
  };

  const updateItemQuantity = (productId: number, quantity: number) => {
    setEditItems((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, quantity } : it))
    );
  };

  const removeEditItem = (productId: number) => {
    setEditItems((prev) => prev.filter((it) => it.productId !== productId));
  };

  const addProductToEdit = (productId: number, qty: number) => {
    const prod = allProducts.find((p) => p.id === productId);
    if (!prod) return;
    if (editItems.find((it) => it.productId === productId)) return;
    setEditItems((prev) => [
      ...prev,
      { productId: prod.id, productName: prod.name, unit: prod.unit, price: prod.price, quantity: qty },
    ]);
  };

  const validateEditItems = (): string | null => {
    for (const it of editItems) {
      const unit = (it.unit || "").toLowerCase();
      const requiresInteger = unit === "bag" || unit === "piece";
      if (requiresInteger && !Number.isInteger(it.quantity))
        return `Quantity for "${it.productName}" must be a whole number (${it.unit}).`;
      if (it.quantity <= 0)
        return `Quantity for "${it.productName}" must be greater than zero.`;
    }
    return null;
  };

  const saveEdit = async () => {
    if (!editingOrder) return;
    const v = validateEditItems();
    if (v) {
      setEditError(v);
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const payload = editItems.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
      }));
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
      `Are you sure you want to permanently delete order ${order.orderNumber}?`
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

  return (
    <div className="space-y-6">
      {/* Header & Total Stats */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Orders Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Track customer orders, update delivery progress, and open invoices in Billing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700">
            {total} Total Orders
          </span>
          <Link
            to="/admin/billing"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:from-brand-500 hover:to-amber-500 transition"
          >
            <Receipt className="h-4 w-4" />
            <span>Go to Billing</span>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search by order #, customer name, mobile..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input pl-10 text-xs sm:text-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="input min-w-[140px] text-xs sm:text-sm"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {formatOrderStatus(s)}
              </option>
            ))}
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setPage(1);
            }}
            className="input min-w-[140px] text-xs sm:text-sm"
          >
            <option value="">All Payments</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="DUE">Due</option>
          </select>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="input w-36 text-xs"
              aria-label="From date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="input w-36 text-xs"
              aria-label="To date"
            />
          </div>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <LoadingState label="Loading orders…" />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-slate-500 shadow-sm">
          <Package className="mx-auto h-10 w-10 text-slate-300 mb-2" />
          <p className="font-bold text-slate-800">No orders found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or filters.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {orders.map((o) => {
            const isExpanded = expandedOrder === o.id;

            return (
              <div
                key={o.id}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md"
              >
                {/* Header Row */}
                <div
                  className="flex cursor-pointer flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center hover:bg-slate-50/50 transition"
                  onClick={() => setExpandedOrder(isExpanded ? null : o.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-black text-slate-900">
                        #{o.orderNumber}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                          STATUS_COLORS[o.status] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {formatOrderStatus(o.status)}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                          PAYMENT_STATUS_STYLES[o.paymentStatus] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {o.paymentStatus === "PARTIALLY_PAID" ? "PARTIALLY PAID" : o.paymentStatus}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">{o.customerName}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {o.customerMobile}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="h-3 w-3" />
                        {formatDate(o.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t border-slate-100 pt-2 sm:border-t-0 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <p className="text-base font-black text-slate-900">{formatINR(o.finalAmount || o.subtotal)}</p>
                      {o.due > 0 ? (
                        <p className="text-[11px] font-bold text-rose-600">Due: {formatINR(o.due)}</p>
                      ) : (
                        <p className="text-[11px] font-semibold text-emerald-600">Fully Paid</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/admin/billing?order=${o.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-xl bg-brand-50 border border-brand-200 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-600 hover:text-white transition"
                        title="Open in Billing & Invoice"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        <span>Billing & Invoice</span>
                      </Link>

                      <button
                        type="button"
                        className="rounded-xl border border-slate-200 bg-slate-50 p-1.5 text-slate-500 hover:bg-slate-100"
                        aria-label="Toggle details"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/40 p-4 sm:p-5 space-y-4">
                    {/* Customer & Address */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Customer Information
                        </p>
                        <p className="text-sm font-bold text-slate-900">{o.customerName}</p>
                        <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {o.customerMobile}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Delivery Destination
                        </p>
                        <p className="text-xs text-slate-700 flex items-start gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{o.deliveryAddress || "Self pickup / Address not provided"}</span>
                        </p>
                        {o.notes && (
                          <p className="mt-1.5 text-xs italic text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            Note: {o.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Ordered Items */}
                    <div className="rounded-xl border border-slate-200/80 bg-white p-3.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Ordered Items ({o.items.length})
                      </p>
                      <ul className="divide-y divide-slate-100">
                        {o.items.map((it) => (
                          <li key={it.id} className="flex items-center justify-between py-2 text-xs">
                            <div>
                              <p className="font-bold text-slate-900">{it.productName}</p>
                              <p className="text-[11px] text-slate-500">
                                {it.unit} · {formatINR(it.price)} × {it.quantity}
                              </p>
                            </div>
                            <span className="font-bold text-slate-900">{formatINR(it.total)}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                        <span className="font-bold text-slate-700">Subtotal Amount</span>
                        <span className="font-black text-slate-900 text-sm">{formatINR(o.subtotal)}</span>
                      </div>
                    </div>

                    {/* Status Update & Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-500 mr-1">Update Status:</span>
                        {STATUS_OPTIONS.map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(o.id, s)}
                            disabled={changingStatus?.id === o.id && changingStatus?.status === s}
                            className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                              o.status === s
                                ? STATUS_COLORS[s] + " shadow-sm font-bold"
                                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {changingStatus?.id === o.id && changingStatus?.status === s ? (
                              "Updating..."
                            ) : (
                              formatOrderStatus(s)
                            )}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/billing?order=${o.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          <span>Billing & Invoice</span>
                        </Link>
                        <button
                          onClick={() => openEdit(o)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                        >
                          <Edit className="h-3.5 w-3.5 text-slate-400" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(o)}
                          className="inline-flex items-center gap-1 rounded-xl bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-600 hover:text-white transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary text-xs px-3 py-1.5 rounded-xl"
          >
            ← Previous Page
          </button>
          <span className="text-xs font-semibold text-slate-600">
            Page {page} of {pages} ({total} total orders)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="btn-secondary text-xs px-3 py-1.5 rounded-xl"
          >
            Next Page →
          </button>
        </div>
      )}

      {/* Edit Order Modal */}
      {editOpen && editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">
              Edit Order #{editingOrder.orderNumber}
            </h3>
            <p className="text-xs text-slate-500">
              Customer: {editingOrder.customerName} · {editingOrder.customerMobile}
            </p>

            <div className="mt-4 space-y-3">
              {editItems.map((it) => (
                <div
                  key={it.productId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 p-3 bg-slate-50/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                      {it.productName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {it.unit} · {formatINR(it.price)}
                    </p>
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
                        const newQ = requiresInteger
                          ? Math.max(1, Math.floor(q))
                          : Math.max(0.001, Math.round(q * 1000) / 1000);
                        updateItemQuantity(it.productId, newQ);
                      }}
                      className="input w-24 text-xs font-bold py-1.5"
                    />
                    <button
                      onClick={() => removeEditItem(it.productId)}
                      className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                      title="Remove product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add item */}
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-700 mb-2">Add Product to Order</p>
                <div className="flex flex-wrap items-center gap-2">
                  <select id="add-product" className="input flex-1 text-xs" defaultValue="">
                    <option value="">Select product to add...</option>
                    {allProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.unit} · {formatINR(p.price)}
                      </option>
                    ))}
                  </select>
                  <input
                    id="add-qty"
                    type="number"
                    defaultValue={1}
                    className="input w-24 text-xs font-bold"
                  />
                  <button
                    onClick={() => {
                      const sel = document.getElementById("add-product") as HTMLSelectElement | null;
                      const qEl = document.getElementById("add-qty") as HTMLInputElement | null;
                      if (!sel || !qEl) return;
                      const pid = Number(sel.value);
                      const qty = Number(qEl.value);
                      if (!pid || Number.isNaN(qty)) return;
                      addProductToEdit(pid, qty);
                    }}
                    className="btn-primary text-xs py-2 px-3 rounded-xl"
                  >
                    Add
                  </button>
                </div>
              </div>

              {editError && (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
                  {editError}
                </div>
              )}

              <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button onClick={closeEdit} className="btn-secondary text-xs rounded-xl">
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={editSaving}
                  className="btn-primary text-xs rounded-xl"
                >
                  {editSaving ? "Saving..." : "Save Order Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
