import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../lib/api";
import type { DashboardStats } from "../../types";
import { LoadingState, ErrorState } from "../../components/Loading";
import { formatINR, formatDate, formatOrderStatus } from "../../lib/format";
import {
  TrendingUp,
  Wallet,
  AlertCircle,
  Package,
  ShoppingBag,
  Receipt,
  BookOpen,
  BarChart3,
  ArrowRight,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  PlusCircle,
  ShieldAlert,
  ArrowUpRight,
} from "lucide-react";

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
      .catch(() => setError("Failed to load dashboard data"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <LoadingState label="Loading executive dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const { stats, recentOrders, lowStockProducts } = data;
  const totalCollected = stats.totalCollected || stats.totalCashCollected + stats.totalOnlineCollected;
  const cashPercent = totalCollected > 0 ? Math.round((stats.totalCashCollected / totalCollected) * 100) : 50;
  const onlinePercent = 100 - cashPercent;

  return (
    <div className="space-y-7">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-brand-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-brand-500/20 px-2.5 py-0.5 text-xs font-semibold text-brand-300 border border-brand-500/30">
                Live Overview
              </span>
              <span className="text-xs text-slate-400">
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Welcome back to Admin Center
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Track real-time construction sales, manage incoming customer orders, review outstanding dues, and keep inventory in check.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/admin/place-order"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:from-emerald-500 hover:to-teal-500 transition active:scale-95 border border-emerald-400/30"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ ग्राहक के लिए ऑर्डर (Place Order)</span>
            </Link>
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition active:scale-95 shadow-sm"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
            <Link
              to="/admin/billing"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition active:scale-95 border border-slate-700"
            >
              <PlusCircle className="h-4 w-4" />
              <span>New Bill / Invoice</span>
            </Link>
          </div>
        </div>

        {/* Subtle decorative background circles */}
        <div className="pointer-events-none absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 -top-12 h-48 w-48 rounded-full bg-amber-500/10 blur-2xl" />
      </div>

      {/* 4 Hero Financial & Inventory Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Sales</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 group-hover:scale-110 transition">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900 tracking-tight">{formatINR(stats.totalRevenue)}</p>
            <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
              <span className="font-semibold text-slate-700">{stats.totalOrders}</span> Total Orders Placed
            </p>
          </div>
          <Link
            to="/admin/sales-reports"
            className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            <span>View Sales Report</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Collections Split */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Collected Amount</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-emerald-600 tracking-tight">{formatINR(totalCollected)}</p>
            
            {/* Visual ratio bar */}
            <div className="mt-2.5 space-y-1.5">
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${cashPercent}%` }}
                  title={`Cash: ${cashPercent}%`}
                />
                <div
                  className="bg-indigo-500 transition-all duration-500"
                  style={{ width: `${onlinePercent}%` }}
                  title={`Online: ${onlinePercent}%`}
                />
              </div>
              <div className="flex justify-between text-[11px] font-medium text-slate-500">
                <span className="text-emerald-700 font-semibold">Cash: {formatINR(stats.totalCashCollected)}</span>
                <span className="text-indigo-700 font-semibold">Online: {formatINR(stats.totalOnlineCollected)}</span>
              </div>
            </div>
          </div>
          <Link
            to="/admin/analytics"
            className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <span>Payment Breakdown</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Outstanding Dues */}
        <div className="group relative overflow-hidden rounded-2xl border border-red-100 bg-gradient-to-b from-white to-red-50/30 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">Outstanding Dues</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 group-hover:scale-110 transition">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-red-600 tracking-tight">{formatINR(stats.totalDue)}</p>
            <p className="mt-1 text-xs text-red-500 font-medium flex items-center gap-1">
              <span>Unpaid balance from customer accounts</span>
            </p>
          </div>
          <Link
            to="/admin/khatabook"
            className="mt-4 flex items-center justify-between border-t border-red-100 pt-3 text-xs font-bold text-red-600 hover:text-red-700"
          >
            <span>खाताबुक व उधारी देखें (Khatabook)</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Inventory & Low Stock */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Inventory Status</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900 tracking-tight">{stats.activeProducts} <span className="text-sm font-medium text-slate-500">Active Items</span></p>
            <div className="mt-1.5 flex items-center gap-2">
              {stats.lowStockCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                  <ShieldAlert className="h-3 w-3 text-amber-600" />
                  {stats.lowStockCount} Low Stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Stock Levels Good
                </span>
              )}
            </div>
          </div>
          <Link
            to="/admin/products"
            className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-slate-700 hover:text-brand-600"
          >
            <span>Manage Stock Levels</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Quick Action Shortcuts Grid */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
          <span>त्वरित कार्य / Quick Operations</span>
          <span className="text-xs font-normal lowercase text-slate-400">1-tap access</span>
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            to="/admin/billing"
            className="group flex flex-col justify-between rounded-2xl border-2 border-emerald-100 bg-emerald-50/40 p-4 hover:border-emerald-500 hover:bg-white hover:shadow-lg transition active:scale-95"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30 group-hover:scale-110 transition">
              <Receipt className="h-6 w-6" />
            </div>
            <div className="mt-3">
              <p className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition">+ नया बिल (Invoice)</p>
              <p className="text-[11px] text-emerald-800 font-medium">Create bill & print receipt</p>
            </div>
          </Link>

          <Link
            to="/admin/products"
            className="group flex flex-col justify-between rounded-2xl border-2 border-blue-100 bg-blue-50/40 p-4 hover:border-blue-500 hover:bg-white hover:shadow-lg transition active:scale-95"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30 group-hover:scale-110 transition">
              <Package className="h-6 w-6" />
            </div>
            <div className="mt-3">
              <p className="text-sm font-black text-slate-900 group-hover:text-blue-700 transition">+ स्टॉक जोड़ें (Stock)</p>
              <p className="text-[11px] text-blue-800 font-medium">Add cement, steel & goods</p>
            </div>
          </Link>

          <Link
            to="/admin/khatabook"
            className="group flex flex-col justify-between rounded-2xl border-2 border-red-100 bg-red-50/40 p-4 hover:border-red-500 hover:bg-white hover:shadow-lg transition active:scale-95"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white shadow-md shadow-red-600/30 group-hover:scale-110 transition">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="mt-3">
              <p className="text-sm font-black text-slate-900 group-hover:text-red-700 transition">खाताबुक (Khatabook)</p>
              <p className="text-[11px] text-red-800 font-medium">Customer dues & ledger</p>
            </div>
          </Link>

          <Link
            to="/admin/sales-reports"
            className="group flex flex-col justify-between rounded-2xl border-2 border-purple-100 bg-purple-50/40 p-4 hover:border-purple-500 hover:bg-white hover:shadow-lg transition active:scale-95"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md shadow-purple-600/30 group-hover:scale-110 transition">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div className="mt-3">
              <p className="text-sm font-black text-slate-900 group-hover:text-purple-700 transition">बिक्री रिपोर्ट (Report)</p>
              <p className="text-[11px] text-purple-800 font-medium">Daily, weekly, monthly sales</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Orders Pipeline Breakdown Strip */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">Order Pipeline Status</h3>
          <Link to="/admin/orders" className="text-xs font-semibold text-brand-600 hover:underline">
            View All ({stats.totalOrders}) →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-700 text-xs font-semibold">
              <Clock className="h-3.5 w-3.5" />
              <span>Pending</span>
            </div>
            <p className="mt-1 text-xl font-black text-amber-900">{stats.pendingOrders}</p>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-blue-700 text-xs font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Confirmed</span>
            </div>
            <p className="mt-1 text-xl font-black text-blue-900">{stats.confirmedOrders}</p>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-indigo-700 text-xs font-semibold">
              <Package className="h-3.5 w-3.5" />
              <span>Processing</span>
            </div>
            <p className="mt-1 text-xl font-black text-indigo-900">{stats.processingOrders ?? 0}</p>
          </div>

          <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-purple-700 text-xs font-semibold">
              <Truck className="h-3.5 w-3.5" />
              <span>Out for Delivery</span>
            </div>
            <p className="mt-1 text-xl font-black text-purple-900">{stats.outForDeliveryOrders ?? 0}</p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-700 text-xs font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Delivered</span>
            </div>
            <p className="mt-1 text-xl font-black text-emerald-900">{stats.deliveredOrders}</p>
          </div>

          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-rose-700 text-xs font-semibold">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Cancelled</span>
            </div>
            <p className="mt-1 text-xl font-black text-rose-900">{stats.cancelledOrders}</p>
          </div>
        </div>
      </div>

      {/* Main Two-Column Activity Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Recent Orders Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Customer Orders</h3>
              <p className="text-xs text-slate-500">Latest orders submitted across the store</p>
            </div>
            <Link
              to="/admin/orders"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-slate-100 transition"
            >
              <span>Manage All Orders</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No orders placed yet</p>
              <p className="text-xs text-slate-400">Incoming customer orders will show up here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-3 font-semibold">Order</th>
                    <th className="pb-3 font-semibold">Customer</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Amount</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map((o) => {
                    const statusColor =
                      o.status === "DELIVERED"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : o.status === "CANCELLED"
                        ? "bg-rose-100 text-rose-800 border-rose-200"
                        : o.status === "PENDING"
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-blue-100 text-blue-800 border-blue-200";

                    return (
                      <tr key={o.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 font-medium">
                          <Link
                            to={`/admin/billing?order=${o.id}`}
                            className="font-mono text-xs font-bold text-slate-900 hover:text-brand-600"
                          >
                            #{o.orderNumber}
                          </Link>
                          <p className="text-[11px] text-slate-400">{formatDate(o.createdAt)}</p>
                        </td>
                        <td className="py-3.5">
                          <p className="text-xs font-semibold text-slate-900">{o.customerName}</p>
                          <p className="text-[11px] text-slate-500">{o.customerMobile}</p>
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusColor}`}
                          >
                            {formatOrderStatus(o.status)}
                          </span>
                        </td>
                        <td className="py-3.5 text-right font-bold text-slate-900">
                          {formatINR(o.subtotal)}
                        </td>
                        <td className="py-3.5 text-right">
                          <Link
                            to={`/admin/billing?order=${o.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-brand-600 hover:text-white transition"
                          >
                            <Receipt className="h-3 w-3" />
                            <span>Bill</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 1 Col: Low Stock Alerts & Inventory Health */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Stock Alerts</h3>
                <p className="text-xs text-slate-500">Products requiring restock</p>
              </div>
              <Link
                to="/admin/products"
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                Inventory →
              </Link>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-slate-900">All Stock Levels Healthy</p>
                <p className="text-xs text-slate-500 px-4">
                  No products currently below the minimum stock threshold ({stats.lowStockThreshold} units).
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/40 p-3"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{p.category?.name || "General"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 border border-red-200">
                        {p.stock} left
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Quick Inventory Management</p>
                <p className="text-[11px] text-slate-500">Update stock or add new materials</p>
              </div>
              <Link
                to="/admin/products"
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                Manage
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
