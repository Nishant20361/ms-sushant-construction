import { useCallback, useEffect, useState } from "react";
import { adminApi, ApiRequestError } from "../../lib/api";
import type { Order } from "../../types";
import { formatINR, formatDate } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/Loading";
import { useToast } from "../../components/Toast";

const STATUS_OPTIONS = ["PENDING", "CONFIRMED", "PROCESSING", "DELIVERED", "CANCELLED"] as const;
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function AdminOrders() {
  const { success, error } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [changingStatus, setChangingStatus] = useState<{ id: number; status: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    adminApi
      .getOrders({ page, limit: 10, search: search || undefined, status: statusFilter || undefined })
      .then((res) => {
        setOrders(res.orders);
        setPages(res.pages);
        setTotal(res.total);
      })
      .catch(() => setLoadError("Failed to load orders"))
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(load, [load]);

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Orders</h2>
        <p className="text-sm text-slate-500">{total} total</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-[200px] flex-1">
          <input
            type="search"
            placeholder="Search by order number or customer name…"
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
              {s}
            </option>
          ))}
        </select>
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
                      <p className="mt-1 text-sm text-slate-700">{o.deliveryAddress}</p>
                      {o.notes && <p className="mt-1 text-sm italic text-slate-500">Note: {o.notes}</p>}
                    </div>
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
