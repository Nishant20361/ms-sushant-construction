import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminApi } from "../../lib/api";
import type { ReportFilters, ReportOrder, ReportType, SalesReport } from "../../types";
import { formatINR, formatDate, resolveImageUrl } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/Loading";
import { downloadFile } from "../../lib/download";
import { useToast } from "../../components/Toast";
import { generateSalesPdfHtml, downloadPdfHtml, safeFilename } from "../../lib/pdf";

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

function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function SalesReports() {
  const { success, error: toastError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const modeParam = searchParams.get("mode");

  // Tab + period state
  const initialTab: ReportType =
    modeParam === "weekly" ? "weekly" : modeParam === "monthly" ? "monthly" : "daily";
  const [tab, setTab] = useState<ReportType>(initialTab);
  const [date, setDate] = useState(todayStr());
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Report data
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

// Filters (server-side applied with the report)
  const [customerFilter, setCustomerFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [orderIdFilter, setOrderIdFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [applyFlag, setApplyFlag] = useState(0);

  // Instant client-side search
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    const f: ReportFilters = {
      customerName: customerFilter || undefined,
      phone: phoneFilter || undefined,
      orderId: orderIdFilter || undefined,
      productName: productFilter || undefined,
      category: categoryFilter || undefined,
      paymentType: paymentFilter || undefined,
      status: statusFilter || undefined,
    };
    adminApi
      .getSalesReport(tab, { date, from, to, month, year, filters: f })
      .then((res) => {
        setReport(res.report);
        setExpanded(new Set());
      })
      .catch(() => setLoadError("Failed to load sales report"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, date, from, to, month, year, applyFlag]);

  useEffect(load, [load]);

  const applyFilters = () => {
    setApplyFlag((n) => n + 1);
  };

  const resetFilters = () => {
    setCustomerFilter("");
    setPhoneFilter("");
    setOrderIdFilter("");
    setProductFilter("");
    setCategoryFilter("");
    setPaymentFilter("");
    setStatusFilter("");
    setSearch("");
    setApplyFlag((n) => n + 1);
  };

  // Client-side instant search across name/phone/order id/product
  const filteredOrders = useMemo(() => {
    if (!report) return [];
    const q = search.trim().toLowerCase();
    if (!q) return report.orders;
    return report.orders.filter((o) => {
      const inCustomer = o.customerName.toLowerCase().includes(q);
      const inPhone = o.customerMobile.includes(q);
      const inOrder = o.orderNumber.toLowerCase().includes(q);
      const inProduct = o.items.some((it) =>
        it.productName.toLowerCase().includes(q)
      );
      return inCustomer || inPhone || inOrder || inProduct;
    });
  }, [report, search]);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = async (format: "excel" | "csv") => {
    const f: ReportFilters = {
      customerName: customerFilter || undefined,
      phone: phoneFilter || undefined,
      orderId: orderIdFilter || undefined,
      productName: productFilter || undefined,
      category: categoryFilter || undefined,
      paymentType: paymentFilter || undefined,
      status: statusFilter || undefined,
    };
    const url = adminApi.getSalesReportExportUrl(tab, format, {
      date: tab === "daily" ? date : undefined,
      from: tab === "weekly" ? from : undefined,
      to: tab === "weekly" ? to : undefined,
      month: tab === "monthly" ? month : undefined,
      year: tab === "monthly" ? year : undefined,
      filters: f,
    });
    try {
      await downloadFile(
        url,
        `sales-report-${tab}.${format === "excel" ? "xlsx" : "csv"}`
      );
      success(`Sales report exported as ${format === "excel" ? "Excel" : "CSV"}`);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Export failed");
    }
  };

const s = report?.summary;

  const summaryCards = report
    ? [
        { label: "Total Orders", value: String(s!.totalOrders), icon: "📦" },
        { label: "Delivered", value: String(s!.deliveredOrders), icon: "✅" },
        { label: "Cancelled", value: String(s!.cancelledOrders), icon: "❌" },
        { label: "Total Sales", value: formatINR(s!.totalSales), icon: "💰" },
        { label: "Collected Against These Sales", value: formatINR(s!.totalCollected), icon: "💳" },
        { label: "Outstanding", value: formatINR(s!.outstandingAmount), icon: "📉" },
        { label: "Total Discount", value: formatINR(s!.totalDiscount), icon: "🏷️" },
        { label: "Paid / Partial / Due", value: `${s!.paidOrders} / ${s!.partiallyPaidOrders} / ${s!.dueOrders}`, icon: "🧾" },
        { label: "Unique Customers", value: String(s!.uniqueCustomers), icon: "👥" },
        { label: "Products Sold", value: String(s!.productsSold), icon: "🧱" },
        { label: "Qty Sold", value: String(s!.totalQuantitySold), icon: "⚖️" },
      ]
    : [];

  return (
    <div className="space-y-6">
<div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Sales Reports</h2>
          <p className="text-sm text-slate-500">
            {report ? report.periodLabel : "Select a period to view sales"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => handleExport("excel")} className="btn-secondary text-sm">
            ⬇️ Export Excel
          </button>
          <button onClick={() => handleExport("csv")} className="btn-secondary text-sm">
            ⬇️ Export CSV
          </button>
          <button
            onClick={() => {
              if (!report) return;
              const html = generateSalesPdfHtml(report);
              let filename = "sales-report.pdf";
              if (tab === "daily") {
                filename = safeFilename(`daily-sales-report-${date}`, "daily-sales-report");
              } else if (tab === "weekly") {
                filename = safeFilename(`weekly-sales-report-${from}-to-${to}`, "weekly-sales-report");
              } else if (tab === "monthly") {
                const mStr = String(month).padStart(2, "0");
                filename = safeFilename(`monthly-sales-report-${year}-${mStr}`, "monthly-sales-report");
              }
              downloadPdfHtml(html, filename);
              success("PDF report ready for download.");
            }}
            className="btn-secondary text-sm"
          >
            📄 Download PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
{(["daily", "weekly", "monthly"] as ReportType[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setSearchParams(t === "daily" ? {} : { mode: t });
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t ? "bg-brand-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t === "daily" ? "Daily" : t === "weekly" ? "Weekly" : "Monthly"}
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        {tab === "daily" && (
          <div>
            <label className="label" htmlFor="date">Date</label>
            <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        )}
        {tab === "weekly" && (
          <>
            <div>
              <label className="label" htmlFor="from">Start Date</label>
              <input id="from" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="to">End Date</label>
              <input id="to" type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </>
        )}
        {tab === "monthly" && (
          <>
            <div>
              <label className="label" htmlFor="month">Month</label>
              <select id="month" className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1, 1).toLocaleString("en-IN", { month: "long" })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="year">Year</label>
              <select id="year" className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <button onClick={load} className="btn-primary">Generate</button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <p className="mb-3 text-sm font-semibold text-slate-700">Filters</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label">Customer Name</label>
            <input className="input" placeholder="Search customer…" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} />
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input className="input" placeholder="Search phone…" value={phoneFilter} onChange={(e) => setPhoneFilter(e.target.value)} />
          </div>
          <div>
            <label className="label">Order ID</label>
            <input className="input" placeholder="Search order…" value={orderIdFilter} onChange={(e) => setOrderIdFilter(e.target.value)} />
          </div>
          <div>
            <label className="label">Product Name</label>
            <input className="input" placeholder="Search product…" value={productFilter} onChange={(e) => setProductFilter(e.target.value)} />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" placeholder="Search category…" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} />
          </div>
          <div>
            <label className="label">Payment Type</label>
            <select className="input" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
              <option value="">All</option>
              <option value="CASH">Cash</option>
              <option value="ONLINE">Online</option>
              <option value="DUE">Due</option>
            </select>
          </div>
          <div>
            <label className="label">Order Status</label>
            <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={applyFilters} className="btn-primary">Apply Filters</button>
          <button onClick={resetFilters} className="btn-secondary">Reset</button>
        </div>
      </div>

      {/* Instant search */}
      <div>
        <input
          type="search"
          className="input"
          placeholder="🔍 Instant search: customer name, phone, order ID, or product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingState label="Loading report…" />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : !report ? (
        <div className="card p-10 text-center text-slate-500">No report data.</div>
      ) : (
        <div className="space-y-10">
          {/* ========================================================= */}
          {/* SECTION 1 — SALES DURING SELECTED PERIOD                  */}
          {/* ========================================================= */}
          <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <span className="badge bg-brand-50 font-semibold text-brand-700">SECTION 1</span>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Sales During Selected Period</h3>
                <p className="text-sm text-slate-500">
                  Orders placed within {report.periodLabel}. Only DELIVERED orders increase Total Sales.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Period Sales</span>
                <p className="text-2xl font-black text-brand-700">{formatINR(report.summary.totalSales)}</p>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {summaryCards.map((c) => (
                <div key={c.label} className="card flex items-center gap-3 p-4 bg-white">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xl">{c.icon}</div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">{c.value}</p>
                    <p className="text-xs font-medium text-slate-500">{c.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="card flex flex-wrap gap-2 p-4 bg-white">
              <span className="text-sm font-semibold text-slate-700">Order statuses:</span>
              {Object.entries(report.summary.statusCounts).map(([status, count]) => (
                <span key={status} className="badge bg-slate-100 text-slate-700">
                  {status.replace(/_/g, " ")} {count}
                </span>
              ))}
            </div>

            {/* Orders list */}
            <div className="space-y-3">
              <h4 className="text-base font-semibold text-slate-900">
                Period Orders & Invoices ({filteredOrders.length})
              </h4>
              {filteredOrders.length === 0 ? (
                <div className="card p-8 text-center text-slate-500 bg-white">
                  No orders matched this period.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((o) => (
                    <ReportOrderCard
                      key={o.id}
                      order={o}
                      expanded={expanded.has(o.id)}
                      onToggle={() => toggleExpand(o.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ========================================================= */}
          {/* SECTION 2 — PREVIOUS DUES PAID DURING SELECTED PERIOD     */}
          {/* ========================================================= */}
          <section className="space-y-4 rounded-2xl border border-amber-200/80 bg-amber-50/30 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
              <div>
                <span className="badge bg-amber-100 font-semibold text-amber-800">SECTION 2</span>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  {tab === "daily"
                    ? "Previous Dues Paid Today"
                    : tab === "weekly"
                    ? "Previous Dues Paid During Selected Week"
                    : "Previous Dues Paid During Selected Month"}
                </h3>
                <p className="text-sm text-slate-500">
                  Payments received during this period against sales created <strong>before</strong> {report.periodLabel}. These payments settle older debt and do not increase period sales.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Older Dues Collected</span>
                <p className="text-2xl font-black text-amber-700">{formatINR(report.collections.olderSalesCollected)}</p>
              </div>
            </div>

            {/* Section 2 KPI metrics */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="card p-4 bg-white">
                <p className="text-lg font-bold text-slate-900">{formatINR(report.collections.olderSalesCollected)}</p>
                <p className="text-xs font-medium text-slate-500">Total Old Dues Collected</p>
              </div>
              <div className="card p-4 bg-white">
                <p className="text-lg font-bold text-slate-900">
                  {formatINR(report.collections.cashCollected)} / {formatINR(report.collections.onlineCollected)}
                </p>
                <p className="text-xs font-medium text-slate-500">Cash / Online Breakdown</p>
              </div>
              <div className="card p-4 bg-white">
                <p className="text-lg font-bold text-emerald-700">{formatINR(report.collections.dueClearedAmount)}</p>
                <p className="text-xs font-medium text-slate-500">Total Due Cleared Amount</p>
              </div>
              <div className="card p-4 bg-white">
                <p className="text-lg font-bold text-slate-900">{report.collections.dueClearedCount} orders</p>
                <p className="text-xs font-medium text-slate-500">Old Orders Fully Cleared</p>
              </div>
            </div>

            {/* Old dues table */}
            {(() => {
              const oldDues = (report.previousDuePayments ?? report.payments.filter((p) => !p.saleCreatedInPeriod));
              if (oldDues.length === 0) {
                return (
                  <div className="card p-8 text-center text-slate-500 bg-white">
                    {tab === "daily" ? "No previous dues were paid today." : "No previous dues were paid during this period."}
                  </div>
                );
              }
              return (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                  <table className="min-w-[1300px] w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="p-3">Payment Date</th>
                        <th className="p-3">Customer / Mobile</th>
                        <th className="p-3">Order #</th>
                        <th className="p-3">Original Sale Date</th>
                        <th className="p-3 text-right">Original Bill</th>
                        <th className="p-3 text-right">Paid Before Payment</th>
                        <th className="p-3 text-right">Due Before Payment</th>
                        <th className="p-3 text-right font-bold text-emerald-700">
                          {tab === "daily" ? "Paid Today" : "Paid In Period"}
                        </th>
                        <th className="p-3 text-right">Total Paid After</th>
                        <th className="p-3 text-right font-bold">Remaining Due</th>
                        <th className="p-3">Mode</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {oldDues.map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-3 font-medium text-slate-900">{formatDate(payment.paymentDate)}</td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-900">{payment.customerName}</div>
                            <div className="text-xs text-slate-500">{payment.customerMobile}</div>
                          </td>
                          <td className="p-3 font-mono font-medium text-slate-800">{payment.orderNumber}</td>
                          <td className="p-3 text-slate-600">{formatDate(payment.orderCreatedAt)}</td>
                          <td className="p-3 text-right font-medium">{formatINR(payment.originalBillAmount)}</td>
                          <td className="p-3 text-right text-slate-600">{formatINR(payment.previouslyPaidBeforePayment)}</td>
                          <td className="p-3 text-right text-amber-700 font-medium">{formatINR(payment.dueBeforePayment)}</td>
                          <td className="p-3 text-right font-bold text-emerald-700 text-base">{formatINR(payment.amount)}</td>
                          <td className="p-3 text-right font-medium">{formatINR(payment.totalPaidAfterPayment)}</td>
                          <td className="p-3 text-right">
                            <span className={`font-bold ${payment.remainingBalanceAfterPayment > 0 ? "text-red-600" : "text-emerald-700"}`}>
                              {formatINR(payment.remainingBalanceAfterPayment)}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="badge bg-slate-100 text-slate-700 font-medium">{payment.paymentMode}</span>
                          </td>
                          <td className="p-3 text-center">
                            {payment.dueCleared ? (
                              <span className="badge bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1">
                                DUE CLEARED
                              </span>
                            ) : (
                              <span className="badge bg-amber-100 text-amber-800 font-semibold px-2.5 py-1">
                                PARTIAL / DUE REMAINING
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </section>
        </div>
      )}
    </div>
  );
}

function ReportOrderCard({
  order,
  expanded,
  onToggle,
}: {
  order: ReportOrder;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="card">
      <div
        className="flex cursor-pointer flex-col justify-between gap-2 p-4 sm:flex-row sm:items-center"
        onClick={onToggle}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-slate-900">{order.orderNumber}</p>
            <span className={`badge ${STATUS_COLORS[order.status] ?? "bg-slate-200 text-slate-600"}`}>
              {order.status}
            </span>
            <span className={`badge ${PAYMENT_STATUS_STYLES[order.paymentStatus] ?? "bg-slate-200 text-slate-600"}`}>
              {order.paymentStatus === "PARTIALLY_PAID" ? "PARTIALLY PAID" : order.paymentStatus}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            {order.customerName} · {order.customerMobile} · {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm text-slate-500">Final</p>
            <p className="text-lg font-bold text-slate-900">{formatINR(order.finalAmount)}</p>
          </div>
          <span className="text-slate-400">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-200 p-4">
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{order.customerName}</p>
              <p className="text-sm text-slate-600">{order.customerMobile}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery Address</p>
              <p className="mt-1 text-sm text-slate-700">{order.deliveryAddress || "Address not provided"}</p>
              {order.status === "DELIVERED" ? (
                <p className="mt-1 text-xs text-green-700">Delivered {formatDate(order.createdAt)}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-400">Delivery Date: N/A</p>
              )}
            </div>
          </div>

          {/* Payment details */}
          <div className="mb-4 rounded-lg border border-slate-200 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Payment Details</p>
            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Cash Paid</span>
                <span className="font-semibold text-slate-900">{formatINR(order.cashPaid)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Online Paid</span>
                <span className="font-semibold text-slate-900">{formatINR(order.onlinePaid)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Due Paid</span>
                <span className="font-semibold text-slate-900">{formatINR(order.duePaid)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Remaining Due</span>
                <span className={`font-bold ${order.remainingDue > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {formatINR(order.remainingDue)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Discount</span>
                <span className="font-semibold text-slate-900">{formatINR(order.discount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Final Amount</span>
                <span className="font-bold text-slate-900">{formatINR(order.finalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Products */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Products ({order.items.length})
            </p>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {order.items.map((it) => (
                <li key={it.productId} className="flex items-center gap-3 px-3 py-2 text-sm">
                  {it.imageUrl ? (
                    <img
                      src={resolveImageUrl(it.imageUrl) ?? ""}
                      alt={it.productName}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-slate-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{it.productName}</p>
                    <p className="text-xs text-slate-500">{it.category || "—"}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    {it.quantity} {it.unit} × {formatINR(it.price)}
                  </div>
                  <div className="w-24 text-right font-semibold text-slate-900">
                    {formatINR(it.total)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
