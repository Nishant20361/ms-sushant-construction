import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../lib/api";
import type { CustomerDueReport as CustomerDueReportType, CustomerDueReportRow, CustomerStatement } from "../../types";
import { formatINR, formatDate } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/Loading";
import { useToast } from "../../components/Toast";
import { downloadFile } from "../../lib/download";
import { generateCustomerDuePdfHtml, downloadPdfHtml, safeFilename } from "../../lib/pdf";

const PAGE_SIZE = 20;

export default function CustomerDueReport() {
  const { success, error } = useToast();
  const [report, setReport] = useState<CustomerDueReportType | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [page, setPage] = useState(1);
  const [sendingMobile, setSendingMobile] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    adminApi
      .getCustomerDueReport({
        search: appliedSearch || undefined,
        from: appliedFrom || undefined,
        to: appliedTo || undefined,
        page,
        limit: PAGE_SIZE,
      })
      .then(setReport)
      .catch(() => setLoadError("Failed to load due report"))
      .finally(() => setLoading(false));
  }, [appliedSearch, appliedFrom, appliedTo, page]);

  useEffect(load, [load]);

  const applyFilters = () => {
    setAppliedSearch(search);
    setAppliedFrom(from);
    setAppliedTo(to);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch("");
    setFrom("");
    setTo("");
    setAppliedSearch("");
    setAppliedFrom("");
    setAppliedTo("");
    setPage(1);
  };

  const downloadExport = (format: "csv" | "xlsx") => {
    const url = adminApi.getCustomerDueReportExportUrl(format, {
      search: appliedSearch || undefined,
      from: appliedFrom || undefined,
      to: appliedTo || undefined,
    });
    downloadFile(url, `customer-due-report.${format === "xlsx" ? "xlsx" : "csv"}`)
      .then(() => success(`Exporting ${format.toUpperCase()} with all filtered records…`))
      .catch((e: Error) => {
        alert(e.message || "Export failed");
      });
  };

  const openWhatsAppDueReminder = async (customer: CustomerDueReportRow) => {
    setSendingMobile(customer.customerMobile);
    try {
      const statement = await adminApi.getCustomerStatement(customer.customerMobile);
      const message = buildDueReminder(statement);
      const phone = toWhatsAppPhone(statement.customer.customerMobile);
      if (!phone) {
        error("This customer does not have a valid WhatsApp number.");
        return;
      }
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
      success("WhatsApp reminder is ready to review and send.");
    } catch {
      error("Could not prepare the due reminder. Please try again.");
    } finally {
      setSendingMobile(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">📋 Customer Due Report</h2>
        <p className="text-sm text-slate-500">All customers with outstanding balances, searchable and exportable.</p>
      </div>

      {/* Filters */}
      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="label">Search customer name or mobile number</label>
            <input
              type="search"
              className="input"
              placeholder="Name or mobile number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={applyFilters} className="btn-primary">Apply</button>
            <button onClick={resetFilters} className="btn-secondary">Reset</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <button onClick={() => downloadExport("csv")} className="btn-secondary text-sm">⬇️ CSV</button>
          <button onClick={() => downloadExport("xlsx")} className="btn-secondary text-sm">⬇️ Excel</button>
          <button
            onClick={() => {
              if (!report) return;
              const html = generateCustomerDuePdfHtml(report, appliedSearch);
              const dateStr = new Date().toISOString().slice(0, 10);
              const filename = safeFilename(`customer-due-report-${dateStr}`, "customer-due-report");
              downloadPdfHtml(html, filename);
              success("PDF report ready for download.");
            }}
            className="btn-secondary text-sm"
          >
            📄 Download PDF
          </button>
        </div>
      </div>

      {/* Summary */}
      {report && (
        <div className="card flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customers</p>
            <p className="text-sm font-bold text-slate-900">{report.summary.totalCustomers}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Pending Due</p>
            <p className="text-2xl font-bold text-red-600">{formatINR(report.summary.totalPendingDue)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading due report…" />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : !report || report.customers.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">No customers with dues found.</div>
      ) : (
        <>
          <div className="card overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Address</th>
                  <th className="py-2 pr-4 text-right">Orders</th>
                  <th className="py-2 pr-4 text-right">Purchase</th>
                  <th className="py-2 pr-4 text-right">Paid</th>
                  <th className="py-2 pr-4 text-right">Due</th>
                  <th className="py-2 pr-4">Last Payment</th>
                  <th className="py-2 pr-4">Oldest Due</th>
                  <th className="py-2">Newest Due</th>
                  <th className="py-2 pl-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.customers.map((c) => (
                  <tr key={c.customerMobile}>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">{c.customerName}</td>
                    <td className="py-2.5 pr-4 text-slate-700">{c.customerMobile}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{c.address || "—"}</td>
                    <td className="py-2.5 pr-4 text-right text-slate-700">{c.totalOrders}</td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-slate-900">{formatINR(c.totalPurchase)}</td>
                    <td className="py-2.5 pr-4 text-right text-emerald-700">{formatINR(c.totalPaid)}</td>
                    <td className="py-2.5 pr-4 text-right font-bold text-red-600">{formatINR(c.remainingDue)}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{c.lastPaymentDate ? formatDate(c.lastPaymentDate) : "—"}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{c.oldestDueDate ? formatDate(c.oldestDueDate) : "—"}</td>
                    <td className="py-2.5 text-slate-500">{c.newestDueDate ? formatDate(c.newestDueDate) : "—"}</td>
                    <td className="py-2.5 pl-4">
                      <button
                        type="button"
                        className="btn-secondary whitespace-nowrap text-xs"
                        disabled={sendingMobile === c.customerMobile}
                        onClick={() => openWhatsAppDueReminder(c)}
                      >
                        {sendingMobile === c.customerMobile ? "Preparing…" : "💬 WhatsApp Due"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {report.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Page {report.page} of {report.pages} · {report.total} customers
              </p>
              <div className="flex gap-2">
                <button
                  className="btn-secondary text-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Prev
                </button>
                <button
                  className="btn-secondary text-sm"
                  disabled={page >= report.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function toWhatsAppPhone(mobile: string): string | null {
  const digits = mobile.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return null;
}

function buildDueReminder(statement: CustomerStatement): string {
  const dueOrders = statement.orders.filter((order) => order.due > 0.004);
  const lines = dueOrders.map((order, index) => [
    `${index + 1}. Order: ${order.orderNumber}`,
    `   Date: ${formatDate(order.createdAt)}`,
    `   Total: ${formatINR(order.finalAmount)}`,
    `   Paid: ${formatINR(order.paid)}`,
    `   Due: ${formatINR(order.due)}`,
  ].join("\n"));

  return [
    `Namaste ${statement.customer.customerName} ji,`,
    "",
    "M/S Sushant Construction se aapke pending payment details:",
    "",
    ...lines,
    "",
    `Total pending due: ${formatINR(statement.customer.totalDue)}`,
    "",
    "Kripya apna baki payment jaldi clear karein.",
    "Dhanyavaad,",
    "M/S Sushant Construction",
  ].join("\n");
}
