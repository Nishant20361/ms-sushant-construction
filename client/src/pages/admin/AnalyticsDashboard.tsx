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
import { formatINR } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/Loading";
import { MoneyBarChart, MoneyLineChart, DistributionPieChart, HorizontalBarChart } from "../../components/charts";
import {
  TrendingUp,
  Calendar,
  DollarSign,
  CreditCard,
  Users,
  Award,
  FolderTree,
  BarChart2,
  WalletCards,
  FileSpreadsheet,
  Package,
  Filter,
} from "lucide-react";

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
    Promise.allSettled([
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
      .then(([ovRes, tcRes, tpRes, catRes, pmRes, dailyRes, monthlyRes, cashRes, catSalesRes, topPRes, topCRes, dueRes]) => {
        if (ovRes.status === "fulfilled") {
          setSales(ovRes.value.sales);
          setPayments(ovRes.value.payments);
        }
        if (tcRes.status === "fulfilled") setTopCustomers(tcRes.value);
        if (tpRes.status === "fulfilled") setTopProducts(tpRes.value);
        if (catRes.status === "fulfilled") setCategories(catRes.value.categories || []);
        if (pmRes.status === "fulfilled") setPaymentModes(pmRes.value.modes || []);

        setCharts({
          dailySales: dailyRes.status === "fulfilled" ? dailyRes.value.points ?? [] : [],
          monthlySales: monthlyRes.status === "fulfilled" ? monthlyRes.value.points ?? [] : [],
          cashVsOnline: cashRes.status === "fulfilled" ? cashRes.value.points ?? [] : [],
          categorySales: catSalesRes.status === "fulfilled" ? catSalesRes.value.points ?? [] : [],
          topProducts: topPRes.status === "fulfilled" ? topPRes.value.points ?? [] : [],
          topCustomers: topCRes.status === "fulfilled" ? topCRes.value.points ?? [] : [],
          dueTrend: dueRes.status === "fulfilled" ? dueRes.value.points ?? [] : [],
        });
      })
      .catch(() => setLoadError("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(load, [load]);

  if (loading) return <LoadingState label="Loading business analytics…" />;
  if (loadError) return <ErrorState message={loadError} onRetry={load} />;

  const salesCards = sales
    ? [
        { label: "Today Sales", value: sales.todaySales, icon: Calendar, color: "text-amber-600 bg-amber-50" },
        { label: "Yesterday Sales", value: sales.yesterdaySales, icon: Calendar, color: "text-slate-600 bg-slate-100" },
        { label: "This Week", value: sales.thisWeekSales, icon: TrendingUp, color: "text-blue-600 bg-blue-50" },
        { label: "Last Week", value: sales.lastWeekSales, icon: BarChart2, color: "text-indigo-600 bg-indigo-50" },
        { label: "This Month", value: sales.thisMonthSales, icon: Calendar, color: "text-brand-600 bg-brand-50" },
        { label: "Last Month", value: sales.lastMonthSales, icon: Calendar, color: "text-purple-600 bg-purple-50" },
        { label: "This Year", value: sales.thisYearSales, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
        { label: "Lifetime Sales", value: sales.totalLifetimeSales, icon: DollarSign, color: "text-amber-600 bg-amber-50" },
      ]
    : [];

  const paymentCards = payments
    ? [
        { label: "Cash Collection", value: payments.cashCollection, icon: DollarSign, color: "bg-green-50 text-green-700" },
        { label: "Online Collection", value: payments.onlineCollection, icon: CreditCard, color: "bg-indigo-50 text-indigo-700" },
        { label: "Due Outstanding", value: payments.dueOutstanding, icon: WalletCards, color: "bg-red-50 text-red-700" },
        { label: "Due Collected", value: payments.recoveredDue, icon: Award, color: "bg-emerald-50 text-emerald-700" },
        { label: "Pending Due", value: payments.pendingDue, icon: TrendingUp, color: "bg-amber-50 text-amber-700" },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Date range filter */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3.5">
          <div className="flex items-center gap-2 text-slate-700 text-sm font-bold mr-2 pb-2">
            <Filter className="h-4 w-4 text-brand-600" />
            <span>Chart Range Filter</span>
          </div>
          <div>
            <label className="label text-xs">From Date</label>
            <input
              type="date"
              className="input text-xs"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="label text-xs">To Date</label>
            <input
              type="date"
              className="input text-xs"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <button onClick={load} className="btn-primary text-xs py-2 px-4 rounded-xl">
            Apply Date Range
          </button>
        </div>
      </div>

      {/* Sales Analytics */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-brand-600" />
          <h3 className="text-base font-bold text-slate-900">Sales Trends & Overview</h3>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-4">
          {salesCards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">{c.label}</span>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${c.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl font-black text-slate-900">{formatINR(c.value)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Analytics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Payment Collections & Recovery</h3>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/dues" className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline">
              <WalletCards className="h-3.5 w-3.5" />
              <span>Customer Dues</span>
            </Link>
            <span className="text-slate-300">·</span>
            <Link to="/admin/customer-due-report" className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:underline">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Due Aging Report</span>
            </Link>
          </div>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {paymentCards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">{c.label}</span>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${c.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl font-black text-slate-900">{formatINR(c.value)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h4 className="mb-4 text-sm font-bold text-slate-900">Daily Sales Trend</h4>
          <MoneyBarChart data={charts.dailySales} xKey="date" yKey="sales" name="Sales" />
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h4 className="mb-4 text-sm font-bold text-slate-900">Monthly Sales Trend</h4>
          <MoneyBarChart data={charts.monthlySales} xKey="month" yKey="sales" name="Sales" />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h4 className="mb-4 text-sm font-bold text-slate-900">Payment Modes (Cash vs Online)</h4>
          <DistributionPieChart data={charts.cashVsOnline} />
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h4 className="mb-4 text-sm font-bold text-slate-900">Category-wise Sales Volume</h4>
          <DistributionPieChart data={charts.categorySales} />
        </div>
      </div>

      {/* Charts row 3 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h4 className="mb-4 text-sm font-bold text-slate-900">Top Products by Revenue</h4>
          <HorizontalBarChart data={charts.topProducts} xKey="name" yKey="value" name="Revenue" />
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h4 className="mb-4 text-sm font-bold text-slate-900">Top Customers by Purchase</h4>
          <HorizontalBarChart data={charts.topCustomers} xKey="name" yKey="value" name="Purchase" />
        </div>
      </div>

      {/* Due trend */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h4 className="mb-4 text-sm font-bold text-slate-900">Historical Due Balance Trend</h4>
        <MoneyLineChart data={charts.dueTrend} xKey="month" yKey="due" name="Due" />
      </div>

      {/* Top Customers */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-bold text-slate-900">Customer Insights & Rankings</h3>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <CustomerTable title="Top Customers by Purchase" customers={topCustomers?.byPurchase ?? []} />
          <CustomerTable title="By Average Order Value" customers={topCustomers?.byAverageOrderValue ?? []} />
          <CustomerTable title="Highest Outstanding Due" customers={topCustomers?.byDue ?? []} />
        </div>
      </div>

      {/* Top Products */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-amber-600" />
          <h3 className="text-base font-bold text-slate-900">Product Performance</h3>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <ProductTable title="Top Selling (Quantity Sold)" products={topProducts?.topSelling ?? []} />
          <ProductTable title="Highest Revenue Generators" products={topProducts?.highestRevenue ?? []} />
        </div>
      </div>

      {/* Category Report */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FolderTree className="h-5 w-5 text-indigo-600" />
          <h3 className="text-base font-bold text-slate-900">Category Revenue Breakdown</h3>
        </div>
        <CategoryTable rows={categories} />
      </div>

      {/* Payment Mode Report */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-emerald-600" />
          <h3 className="text-base font-bold text-slate-900">Payment Methods Summary</h3>
        </div>
        <PaymentModeTable rows={paymentModes} />
      </div>
    </div>
  );
}

function CustomerTable({ title, customers }: { title: string; customers: TopCustomer[] }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h4>
      {customers.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">No customer records</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {customers.map((c, i) => (
            <li key={c.customerMobile} className="flex items-center justify-between py-2.5 text-xs">
              <div className="min-w-0 pr-2">
                <p className="truncate font-bold text-slate-900">
                  {i + 1}. {c.customerName}
                </p>
                <p className="text-[11px] text-slate-500">
                  {c.customerMobile} · {c.totalOrders} orders
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-slate-900">{formatINR(c.totalPurchase)}</p>
                {c.totalDue > 0 && <p className="text-[11px] font-semibold text-red-600">Due: {formatINR(c.totalDue)}</p>}
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
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h4>
      {products.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">No product records</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {products.map((p, i) => (
            <li key={p.productId} className="flex items-center justify-between py-2.5 text-xs">
              <div className="min-w-0 pr-2">
                <p className="truncate font-bold text-slate-900">
                  {i + 1}. {p.productName}
                </p>
                <p className="text-[11px] text-slate-500">
                  {p.quantitySold} {p.unit} · {p.orderCount} orders
                </p>
              </div>
              <p className="font-bold text-slate-900 shrink-0">{formatINR(p.revenue)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryTable({ rows }: { rows: CategoryReportRow[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100 text-left font-bold uppercase tracking-wider text-slate-400">
            <th className="pb-3 pr-4">Category</th>
            <th className="pb-3 pr-4 text-right">Orders</th>
            <th className="pb-3 pr-4 text-right">Quantity Sold</th>
            <th className="pb-3 text-right">Total Revenue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.category} className="hover:bg-slate-50/50">
              <td className="py-2.5 pr-4 font-bold text-slate-900">{r.category}</td>
              <td className="py-2.5 pr-4 text-right text-slate-600">{r.orders}</td>
              <td className="py-2.5 pr-4 text-right text-slate-600">{r.quantity}</td>
              <td className="py-2.5 text-right font-bold text-slate-900">{formatINR(r.revenue)}</td>
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
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100 text-left font-bold uppercase tracking-wider text-slate-400">
            <th className="pb-3 pr-4">Payment Method</th>
            <th className="pb-3 pr-4 text-right">Orders Count</th>
            <th className="pb-3 pr-4 text-right">Total Revenue</th>
            <th className="pb-3 text-right">Share (%)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.mode} className="hover:bg-slate-50/50">
              <td className="py-2.5 pr-4 font-bold text-slate-900">{r.mode}</td>
              <td className="py-2.5 pr-4 text-right text-slate-600">{r.orders}</td>
              <td className="py-2.5 pr-4 text-right font-bold text-slate-900">{formatINR(r.revenue)}</td>
              <td className="py-2.5 text-right font-semibold text-slate-600">{r.percentage}%</td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-200 bg-slate-50/50 font-bold">
            <td className="py-2.5 pr-4 text-slate-900">Total Collections</td>
            <td className="py-2.5 pr-4 text-right text-slate-900">{rows.reduce((s, r) => s + r.orders, 0)}</td>
            <td className="py-2.5 pr-4 text-right text-brand-600">{formatINR(total)}</td>
            <td className="py-2.5 text-right text-slate-900">100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
