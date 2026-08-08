import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../lib/api";
import type { CustomerDueReport as CustomerDueReportType } from "../../types";
import { formatINR, formatDate } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/Loading";
import { useToast } from "../../components/Toast";
import { downloadFile } from "../../lib/download";

const PAGE_SIZE = 20;

export default function CustomerDueReport() {
  const { success } = useToast();
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
            <label className="label">Search (name / phone / address)</label>
            <input
              type="search"
              className="input"
              placeholder="Search customers…"
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
