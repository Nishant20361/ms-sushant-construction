import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../lib/api";
import type { ProductHistory as ProductHistoryType } from "../../types";
import { formatINR, formatDate } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/Loading";

interface ProductOption {
  id: number;
  name: string;
  unit: string;
  category: { name: string } | null;
}

export default function ProductHistory() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [history, setHistory] = useState<ProductHistoryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadProducts = useCallback(() => {
    setLoading(true);
    adminApi
      .getAnalyticsProducts()
      .then((res) => setProducts(res.products))
      .catch(() => setLoadError("Failed to load products"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(loadProducts, [loadProducts]);

  const loadHistory = async (id: number) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await adminApi.getProductHistory(id);
      setHistory(data);
    } catch {
      setLoadError("Failed to load product history");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">🧱 Product History</h2>
        <p className="text-sm text-slate-500">Quantity sold, revenue, customers, last sold date, and average selling price for each product.</p>
      </div>

      {/* Picker */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[240px] flex-1">
          <label className="label">Select Product</label>
          <select
            className="input"
            value={selectedId}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : "";
              setSelectedId(v);
              if (v) loadHistory(v);
            }}
          >
            <option value="">Choose a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.category?.name ?? "No category"})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading…" />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={() => selectedId && loadHistory(selectedId)} />
      ) : !history ? (
        <div className="card p-10 text-center text-slate-500">Select a product to view its history.</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Product" value={history.product.name} />
            <StatCard label="Category" value={history.product.category ?? "—"} />
            <StatCard label="Qty Sold" value={String(history.stats.totalQuantitySold)} />
            <StatCard label="Revenue" value={formatINR(history.stats.revenue)} />
            <StatCard label="Customers" value={String(history.stats.customersPurchased)} />
            <StatCard label="Avg Selling Price" value={formatINR(history.stats.averageSellingPrice)} />
          </div>
          <p className="text-sm text-slate-500">
            Stock: {history.product.stock} {history.product.unit} · Current Price: {formatINR(history.product.price)} · Last Sold: {history.stats.lastSold ? formatDate(history.stats.lastSold) : "Never"}
          </p>

          {/* Recent orders */}
          <div className="card overflow-x-auto p-4">
            <h3 className="mb-3 text-lg font-semibold text-slate-900">Recent Sales ({history.recentOrders.length})</h3>
            {history.recentOrders.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No sales for this product yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4">Order</th>
                    <th className="py-2 pr-4">Customer</th>
                    <th className="py-2 pr-4">Phone</th>
                    <th className="py-2 pr-4 text-right">Qty</th>
                    <th className="py-2 pr-4 text-right">Total</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.recentOrders.map((o) => (
                    <tr key={o.orderId}>
                      <td className="py-2 pr-4 font-medium text-slate-900">{o.orderNumber}</td>
                      <td className="py-2 pr-4 text-slate-700">{o.customerName}</td>
                      <td className="py-2 pr-4 text-slate-500">{o.customerMobile}</td>
                      <td className="py-2 pr-4 text-right text-slate-700">{o.quantity}</td>
                      <td className="py-2 pr-4 text-right font-semibold text-slate-900">{formatINR(o.total)}</td>
                      <td className="py-2 pr-4">
                        <span className="badge bg-slate-100 text-slate-700">{o.status}</span>
                      </td>
                      <td className="py-2 text-slate-500">{formatDate(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
