import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../lib/api";
import type {
  CategoryReportRow,
  ChartPoint,
  PaymentAnalytics,
  PaymentModeRow,
  SalesAnalytics,
  TopCustomer,
  TopProduct,
} from "../../types";
import { formatINR, formatDate } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/Loading";
import { MoneyBarChart, MoneyLineChart, DistributionPieChart, HorizontalBarChart } from "../../components/charts";

export default function AnalyticsDashboard() {
  const [sales, setSales] = useState<SalesAnalytics | null>(null);
  const [payments, setPayments] = useState<PaymentAnalytics | null>(null);
  const [topCustomers, setTopCustomers] = useState<{ byPurchase: TopCustomer[]; byAverageOrderValue: TopCustomer[]; byDue: TopCustomer[] } | null>(null);
  const [topProducts, setTopProducts] = useState<{ topSelling: TopProduct[]; highestRevenue: TopProduct[]; lowestSelling: TopProduct[]; leastRevenue: TopProduct[] } | null>(null);
  const [categories, setCategories] = useState<CategoryReportRow[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentModeRow[]>([]);
  const [charts, setCharts] = useState<Record<string, ChartPoint[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Date range filter for charts (defaults to this year)
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    Promise.all([
      adminApi.getAnalyticsOverview(),
      adminApi.getTopCustomers(10),
      adminApi.getTopProducts(),
      adminApi.getCategoryReport(),
      adminApi.getPaymentModeReport(),
      adminApi.getChartData("dailySales", from, to),
      adminApi.getChartData("monthlySales", from, to),
      adminApi.getChartData("cashVsOnline", from, to),
      adminApi.getChartData("categorySales", from, to),
      adminApi.getChartData("topProducts", from, to),
      adminApi.getChartData("topCustomers", from, to),
      adminApi.getChartData("dueTrend", from, to),
    ])
      .then(([ov, tc, tp, cat, pm, daily, monthly, cash, catSales, topP, topC, due]) => {
        setSales(ov.sales);
        setPayments(ov.payments);
        setTopCustomers(tc);
        setTopProducts(tp);
        setCategories(cat.categories);
        setPaymentModes(pm.modes);
        setCharts({
          dailySales: daily.points ?? [],
          monthlySales: monthly.points ?? [],
          cashVsOnline: cash.points ?? [],
          categorySales: catSales.points ?? [],
          topProducts: topP.points ?? [],
          topCustomers: topC.points ?? [],
          dueTrend: due.points ?? [],
        });
      })
      .catch(() => setLoadError("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(load, [load]);

  if (loading) return <LoadingState label="Loading analytics…" />;
  if (loadError) return <ErrorState message={loadError} onRetry={load} />;

  const salesCards = sales
    ? [
        { label: "Today Sales", value: sales.todaySales, icon: "📅" },
        { label: "Yesterday Sales", value: sales.yesterdaySales, icon: "⬅️" },
        { label: "This Week", value: sales.thisWeekSales, icon: "🗓️" },
        { label: "Last Week", value: sales.lastWeekSales, icon: "📉" },
        { label: "This Month", value: sales.thisMonthSales, icon: "📆" },
        { label: "Last Month", value: sales.lastMonthSales, icon: "📅" },
        { label: "This Year", value: sales.thisYearSales, icon: "🗓️" },
        { label: "Lifetime Sales", value: sales.totalLifetimeSales, icon: "💰" },
      ]
    : [];

  const paymentCards = payments
    ? [
        { label: "Cash Collection", value: payments.cashCollection, icon: "💵", color: "bg-green-100 text-green-700" },
        { label: "Online Collection", value: payments.onlineCollection, icon: "🏦", color: "bg-indigo-100 text-indigo-700" },
        { label: "Due Outstanding", value: payments.dueOutstanding, icon: "⏳", color: "bg-red-100 text-red-700" },
        { label: "Due Collected", value: payments.recoveredDue, icon: "✅", color: "bg-emerald-100 text-emerald-700" },
        { label: "Pending Due", value: payments.pendingDue, icon: "📉", color: "bg-amber-100 text-amber-700" },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Date range filter */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">From Date</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To Date</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={load} className="btn-primary">Apply Range</button>
      </div>

      {/* Sales Analytics */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">📈 Sales Analytics</h3>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {salesCards.map((c) => (
            <div key={c.label} className="card flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xl">{c.icon}</div>
              <div>
                <p className="text-lg font-bold text-slate-900">{formatINR(c.value)}</p>
                <p className="text-xs font-medium text-slate-500">{c.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Analytics */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">💳 Payment Analytics</h3>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {paymentCards.map((c) => (
            <div key={c.label} className="card flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl ${c.color}`}>{c.icon}</div>
              <div>
                <p className="text-lg font-bold text-slate-900">{formatINR(c.value)}</p>
                <p className="text-xs font-medium text-slate-500">{c.label}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/admin/dues" className="btn-secondary text-sm">💰 Manage Dues</Link>
          <Link to="/admin/customer-due-report" className="btn-secondary text-sm">📋 Due Report</Link>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h4 className="mb-3 text-sm font-semibold text-slate-900">Daily Sales</h4>
          <MoneyBarChart data={charts.dailySales} xKey="date" yKey="sales" name="Sales" />
        </div>
        <div className="card p-5">
          <h4 className="mb-3 text-sm font-semibold text-slate-900">Monthly Sales</h4>
          <MoneyBarChart data={charts.monthlySales} xKey="month" yKey="sales" name="Sales" />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h4 className="mb-3 text-sm font-semibold text-slate-900">Cash vs Online</h4>
          <DistributionPieChart data={charts.cashVsOnline} />
        </div>
        <div className="card p-5">
          <h4 className="mb-3 text-sm font-semibold text-slate-900">Category-wise Sales</h4>
          <DistributionPieChart data={charts.categorySales} />
        </div>
      </div>

      {/* Charts row 3 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h4 className="mb-3 text-sm font-semibold text-slate-900">Top Products by Revenue</h4>
          <HorizontalBarChart data={charts.topProducts} xKey="name" yKey="value" name="Revenue" />
        </div>
        <div className="card p-5">
          <h4 className="mb-3 text-sm font-semibold text-slate-900">Top Customers</h4>
          <HorizontalBarChart data={charts.topCustomers} xKey="name" yKey="value" name="Purchase" />
        </div>
      </div>

      {/* Due trend */}
      <div className="card p-5">
        <h4 className="mb-3 text-sm font-semibold text-slate-900">Due Trend</h4>
        <MoneyLineChart data={charts.dueTrend} xKey="month" yKey="due" name="Due" />
      </div>

      {/* Top Customers */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">🏆 Top Customers</h3>
        <div className="grid gap-6 lg:grid-cols-3">
          <CustomerTable title="By Purchase" customers={topCustomers?.byPurchase ?? []} />
          <CustomerTable title="By Avg Order Value" customers={topCustomers?.byAverageOrderValue ?? []} />
          <CustomerTable title="By Due" customers={topCustomers?.byDue ?? []} />
        </div>
      </div>

      {/* Top Products */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">🧱 Top Products</h3>
        <div className="grid gap-6 lg:grid-cols-2">
          <ProductTable title="Top Selling" products={topProducts?.topSelling ?? []} />
          <ProductTable title="Highest Revenue" products={topProducts?.highestRevenue ?? []} />
        </div>
      </div>

      {/* Category Report */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">🗂️ Category Report</h3>
        <CategoryTable rows={categories} />
      </div>

      {/* Payment Mode Report */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">💳 Payment Mode Report</h3>
        <PaymentModeTable rows={paymentModes} />
      </div>
    </div>
  );
}

function CustomerTable({ title, customers }: { title: string; customers: TopCustomer[] }) {
  return (
    <div className="card p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-900">{title}</h4>
      {customers.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">No data</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {customers.map((c, i) => (
            <li key={c.customerMobile} className="flex items-center justify-between py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">
                  {i + 1}. {c.customerName}
                </p>
                <p className="text-xs text-slate-500">{c.customerMobile} · {c.totalOrders} orders · since {formatDate(c.customerSince)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">{formatINR(c.totalPurchase)}</p>
                <p className="text-xs text-red-600">Due: {formatINR(c.totalDue)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProductTable({ title, products }: { title: string; products: TopProduct[] }) {
  return (
    <div className="card p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-900">{title}</h4>
      {products.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">No data</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {products.map((p, i) => (
            <li key={p.productId} className="flex items-center justify-between py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{i + 1}. {p.productName}</p>
                <p className="text-xs text-slate-500">{p.quantitySold} {p.unit} · {p.orderCount} orders · {p.customerCount} customers</p>
              </div>
              <p className="font-bold text-slate-900">{formatINR(p.revenue)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryTable({ rows }: { rows: CategoryReportRow[] }) {
  return (
    <div className="card overflow-x-auto p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-4">Category</th>
            <th className="py-2 pr-4 text-right">Orders</th>
            <th className="py-2 pr-4 text-right">Quantity Sold</th>
            <th className="py-2 text-right">Revenue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.category}>
              <td className="py-2 pr-4 font-medium text-slate-900">{r.category}</td>
              <td className="py-2 pr-4 text-right text-slate-700">{r.orders}</td>
              <td className="py-2 pr-4 text-right text-slate-700">{r.quantity}</td>
              <td className="py-2 text-right font-semibold text-slate-900">{formatINR(r.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentModeTable({ rows }: { rows: PaymentModeRow[] }) {
  const total = rows.reduce((s, r) => s + r.revenue, 0);
  return (
    <div className="card overflow-x-auto p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-4">Mode</th>
            <th className="py-2 pr-4 text-right">Orders</th>
            <th className="py-2 pr-4 text-right">Revenue</th>
            <th className="py-2 text-right">Percentage</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.mode}>
              <td className="py-2 pr-4 font-medium text-slate-900">{r.mode}</td>
              <td className="py-2 pr-4 text-right text-slate-700">{r.orders}</td>
              <td className="py-2 pr-4 text-right font-semibold text-slate-900">{formatINR(r.revenue)}</td>
              <td className="py-2 text-right text-slate-700">{r.percentage}%</td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-200">
            <td className="py-2 pr-4 font-bold text-slate-900">Total</td>
            <td className="py-2 pr-4 text-right font-bold text-slate-900">{rows.reduce((s, r) => s + r.orders, 0)}</td>
            <td className="py-2 pr-4 text-right font-bold text-slate-900">{formatINR(total)}</td>
            <td className="py-2 text-right font-bold text-slate-900">100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
