import { useState } from "react";
import { adminApi } from "../../lib/api";
import type { CustomerStatement as CustomerStatementType } from "../../types";
import { formatINR, formatDate } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/Loading";

export default function CustomerStatement() {
  const [mobile, setMobile] = useState("");
  const [statement, setStatement] = useState<CustomerStatementType | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const search = async () => {
    if (!mobile.trim()) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await adminApi.getCustomerStatement(mobile.trim());
      setStatement(data);
    } catch (e: any) {
      setStatement(null);
      setLoadError(e?.message ?? "Customer not found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">🧾 Customer Statement</h2>
        <p className="text-sm text-slate-500">Complete ledger, orders, payments, and remaining balance for any customer.</p>
      </div>

      {/* Search */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[220px] flex-1">
          <label className="label">Customer Mobile Number</label>
          <input
            type="text"
            className="input"
            placeholder="Enter 10-digit mobile"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
        </div>
        <button onClick={search} className="btn-primary">Search</button>
      </div>

      {loading ? (
        <LoadingState label="Loading statement…" />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={search} />
      ) : !statement ? (
        <div className="card p-10 text-center text-slate-500">
          Enter a customer mobile number to view their full statement.
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
            <SummaryCard label="Customer" value={statement.customer.customerName} />
            <SummaryCard label="Total Orders" value={String(statement.customer.totalOrders)} />
            <SummaryCard label="Total Purchase" value={formatINR(statement.customer.totalPurchase)} />
            <SummaryCard label="Total Paid" value={formatINR(statement.customer.totalPaid)} positive />
            <SummaryCard label="Remaining Balance" value={formatINR(statement.customer.totalDue)} danger={statement.customer.totalDue > 0} />
          </div>
          <p className="text-sm text-slate-500">
            {statement.customer.customerMobile} · {statement.customer.address || "No address"} · Customer since {formatDate(statement.customer.customerSince)}
          </p>

          {/* Ledger */}
          <div className="card overflow-x-auto p-4">
            <h3 className="mb-3 text-lg font-semibold text-slate-900">Complete Ledger</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Order</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4 text-right">Debit</th>
                  <th className="py-2 pr-4 text-right">Credit</th>
                  <th className="py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {statement.ledger.map((e, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-4 text-slate-600">{formatDate(e.date)}</td>
                    <td className="py-2 pr-4 font-medium text-slate-900">{e.orderNumber}</td>
                    <td className="py-2 pr-4">
                      {e.type === "ORDER" ? (
                        <span className="badge bg-amber-100 text-amber-700">ORDER</span>
                      ) : (
                        <span className="badge bg-green-100 text-green-700">{e.mode ?? "PAYMENT"}</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right font-semibold text-slate-900">{e.debit ? formatINR(e.debit) : "—"}</td>
                    <td className="py-2 pr-4 text-right font-semibold text-emerald-700">{e.credit ? formatINR(e.credit) : "—"}</td>
                    <td className="py-2 text-right font-bold text-slate-900">{formatINR(e.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* All Orders */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">All Orders ({statement.orders.length})</h3>
            {statement.orders.map((o) => (
              <div key={o.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{o.orderNumber}</p>
                    <p className="text-sm text-slate-500">{formatDate(o.createdAt)}</p>
                  </div>
                  <div className="flex gap-6 text-right text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Final</p>
                      <p className="font-semibold text-slate-900">{formatINR(o.finalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Paid</p>
                      <p className="font-semibold text-emerald-700">{formatINR(o.paid)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Due</p>
                      <p className={`font-bold ${o.due > 0 ? "text-red-600" : "text-emerald-600"}`}>{formatINR(o.due)}</p>
                    </div>
                  </div>
                </div>
                <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {o.items.map((it) => (
                    <li key={it.productId} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="font-medium text-slate-900">{it.productName}</span>
                      <span className="text-slate-500">{it.quantity} {it.unit} × {formatINR(it.price)}</span>
                      <span className="font-semibold text-slate-900">{formatINR(it.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, positive, danger }: { label: string; value: string; positive?: boolean; danger?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${danger ? "text-red-600" : positive ? "text-emerald-700" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}
