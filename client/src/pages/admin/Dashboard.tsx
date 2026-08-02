import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../lib/api";
import type { DashboardStats } from "../../types";
import { LoadingState, ErrorState } from "../../components/Loading";
import { formatINR, formatDate } from "../../lib/format";

export default function Dashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    adminApi
      .dashboard()
      .then(setData)
      .catch(() => setError("Failed to load dashboard"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <LoadingState label="Loading dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

const stats = data.stats;
  const cards = [
    { label: "Total Orders", value: stats.totalOrders, icon: "📦", color: "bg-blue-100 text-blue-700" },
    { label: "Pending", value: stats.pendingOrders, icon: "⏳", color: "bg-amber-100 text-amber-700" },
    { label: "Confirmed", value: stats.confirmedOrders, icon: "✅", color: "bg-green-100 text-green-700" },
    { label: "Delivered", value: stats.deliveredOrders, icon: "🎉", color: "bg-emerald-100 text-emerald-700" },
    { label: "Cancelled", value: stats.cancelledOrders, icon: "❌", color: "bg-red-100 text-red-700" },
    { label: "Total Revenue", value: formatINR(stats.totalRevenue), icon: "💰", color: "bg-purple-100 text-purple-700" },
    { label: "Low Stock", value: stats.lowStockCount, icon: "⚠️", color: "bg-red-100 text-red-700" },
  ];

  return (
<div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {cards.map((c) => (
          <div key={c.label} className="card flex items-center gap-4 p-5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${c.color}`}>
              {c.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{c.value}</p>
              <p className="text-xs font-medium text-slate-500">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Orders</h2>
            <Link to="/admin/orders" className="text-sm font-medium text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{o.orderNumber}</p>
                    <p className="text-xs text-slate-500">
                      {o.customerName} · {formatDate(o.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatINR(o.subtotal)}</p>
                    <span className="badge bg-amber-100 text-amber-700">{o.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Low Stock Products</h2>
            <Link to="/admin/products" className="text-sm font-medium text-brand-600 hover:underline">
              Manage
            </Link>
          </div>
          {data.lowStockProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">All products are well stocked.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.lowStockProducts.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.category?.name}</p>
                  </div>
                  <span className="badge bg-red-100 text-red-700">{p.stock} left</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

