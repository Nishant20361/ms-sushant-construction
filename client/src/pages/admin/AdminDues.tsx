import { useCallback, useEffect, useState } from "react";
import { adminApi, ApiRequestError } from "../../lib/api";
import type { CustomerDetail, CustomerDue, PaymentMode } from "../../types";
import { formatINR, formatDate } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/Loading";
import { useToast } from "../../components/Toast";

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  DUE: "bg-red-100 text-red-700",
};

export default function AdminDues() {
  const { success, error } = useToast();
  const [customers, setCustomers] = useState<CustomerDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  // Customer detail view
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  // Receive payment modal (customer-level)
  const [payCustomer, setPayCustomer] = useState<CustomerDetail["customer"] | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<PaymentMode>("CASH");
  const [payDate, setPayDate] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    adminApi
      .getDuesSummary({
        search: search || undefined,
        dateRange: dateRange || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        paymentStatus: paymentStatus || undefined,
      })
      .then((res) => setCustomers(res.customers))
      .catch(() => setLoadError("Failed to load customer dues"))
      .finally(() => setLoading(false));
  }, [search, dateRange, fromDate, toDate, paymentStatus]);

  useEffect(load, [load]);

  const totalPending = customers.reduce((s, c) => s + c.totalDue, 0);

  const openDetail = async (mobile: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await adminApi.getCustomerDetail(mobile);
      setDetail(data);
    } catch (e) {
      if (e instanceof ApiRequestError) error(e.message);
      else error("Failed to load customer detail");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => setDetail(null);

  const openReceivePayment = (cust: CustomerDetail["customer"]) => {
    setPayCustomer(cust);
    setPayAmount("");
    setPayMode("CASH");
    setPayDate("");
    setPayNotes("");
    setPayError(null);
  };

  const closeReceivePayment = () => {
    setPayCustomer(null);
    setPayAmount("");
    setPayMode("CASH");
    setPayDate("");
    setPayNotes("");
    setPayError(null);
  };

  const submitReceivePayment = async () => {
    if (!payCustomer) return;
    const amt = parseFloat(payAmount);
    if (Number.isNaN(amt) || amt <= 0) {
      setPayError("Enter a valid payment amount");
      return;
    }
    if (amt > payCustomer.totalDue + 0.001) {
      setPayError(`Amount exceeds the outstanding due of ${formatINR(payCustomer.totalDue)}`);
      return;
    }
    setPaySaving(true);
    setPayError(null);
    try {
      const res = await adminApi.receiveCustomerPayment(
        payCustomer.customerMobile,
        amt,
        payMode,
        payDate || undefined,
        payNotes.trim() || undefined
      );
      success(res.message);
      // Refresh customer detail if open.
      if (detail?.customer.customerMobile === payCustomer.customerMobile) {
        setDetail({
          customer: res.customer,
          orders: res.orders,
          paymentHistory: detail.paymentHistory,
        });
      }
      closeReceivePayment();
      load();
    } catch (e) {
      if (e instanceof ApiRequestError) setPayError(e.message);
      else setPayError("Failed to record payment");
    } finally {
      setPaySaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Receive Payment Modal (customer-level) */}
      {payCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white p-4 sm:p-6 shadow-xl">
            <h3 className="text-lg font-bold">Receive Payment</h3>
            <p className="text-sm text-slate-500">
              {payCustomer.customerName} · {payCustomer.customerMobile}
            </p>
            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Outstanding Due</span>
                <span className="font-bold text-red-600">{formatINR(payCustomer.totalDue)}</span>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label" htmlFor="payAmount">Amount Received (₹) *</label>
                <input
                  id="payAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="input"
                  placeholder="0"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="payMode">Payment Mode</label>
                <select
                  id="payMode"
                  className="input"
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                >
                  <option value="CASH">Cash</option>
                  <option value="ONLINE">Online</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="payDate">Payment Date (optional)</label>
                <input
                  id="payDate"
                  type="date"
                  className="input"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="payNotes">Notes (optional)</label>
                <input
                  id="payNotes"
                  className="input"
                  placeholder="e.g. UPI reference, cheque no…"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                />
              </div>
              {payError && <div className="text-sm text-red-600">{payError}</div>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={closeReceivePayment} className="btn-secondary">Cancel</button>
              <button onClick={submitReceivePayment} disabled={paySaving} className="btn-primary">
                {paySaving ? "Saving…" : "Record Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-4 sm:p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{detail.customer.customerName}</h3>
                <p className="text-sm text-slate-500">{detail.customer.customerMobile}</p>
              </div>
              <button onClick={closeDetail} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">✕</button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Total Orders</p>
                <p className="text-lg font-bold text-slate-900">{detail.customer.totalOrders}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Purchase</p>
                <p className="text-lg font-bold text-slate-900">{formatINR(detail.customer.totalPurchase)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Paid</p>
                <p className="text-lg font-bold text-green-700">{formatINR(detail.customer.totalPaid)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Due</p>
                <p className="text-lg font-bold text-red-600">{formatINR(detail.customer.totalDue)}</p>
              </div>
            </div>

            {detail.customer.totalDue > 0 && (
              <button onClick={() => openReceivePayment(detail.customer)} className="btn-primary mt-4 text-sm">
                💰 Receive Payment
              </button>
            )}

            {/* Orders */}
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Orders</p>
              <div className="space-y-3">
                {detail.orders.map((o) => (
                  <div key={o.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{o.orderNumber}</p>
                        <p className="text-xs text-slate-500">{formatDate(o.createdAt)}</p>
                      </div>
                      <span className={`badge ${PAYMENT_STATUS_STYLES[o.paymentStatus] ?? "bg-slate-200 text-slate-600"}`}>
                        {o.paymentStatus === "PARTIALLY_PAID" ? "PARTIALLY PAID" : o.paymentStatus}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-xs text-slate-500">Final Amount</p>
                        <p className="font-semibold text-slate-900">{formatINR(o.finalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Cash</p>
                        <p className="font-semibold text-slate-900">{formatINR(o.cashPaid)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Online</p>
                        <p className="font-semibold text-slate-900">{formatINR(o.onlinePaid)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Due</p>
                        <p className={`font-bold ${o.due > 0 ? "text-red-600" : "text-emerald-600"}`}>{formatINR(o.due)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment History */}
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Payment History</p>
              {detail.paymentHistory.length === 0 ? (
                <p className="rounded-lg border border-slate-200 p-4 text-center text-sm text-slate-500">No payments yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {detail.paymentHistory.map((p) => (
                    <li key={p.id} className="px-3 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{formatDate(p.paymentDate)}</p>
                          <p className="text-xs text-slate-500">
                            {p.paymentMode === "CASH" ? "Cash" : "Online"} · {p.orderNumber}
                            {p.notes ? ` · ${p.notes}` : ""}
                          </p>
                        </div>
                        <span className="font-bold text-green-700">+{formatINR(p.amount)}</span>
                      </div>
                      <div className="mt-1 flex gap-4 text-xs text-slate-500">
                        <span>Previous Due: <span className="font-semibold text-slate-700">{formatINR(p.previousDue)}</span></span>
                        <span>Remaining Due: <span className="font-semibold text-slate-700">{formatINR(p.remainingDue)}</span></span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-slate-900">Customer Dues</h2>
        <p className="text-sm text-slate-500">
          Track pending payments per customer and receive payments against outstanding orders.
        </p>
      </div>

      {/* Filters */}
      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[200px] flex-1">
            <input
              type="search"
              placeholder="Search by customer name, mobile or order number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
            />
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input min-w-[140px]"
          >
            <option value="">All dates</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="input min-w-[150px]"
          >
            <option value="">All statuses</option>
            <option value="DUE">Due</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Fully Paid</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="input w-40"
            aria-label="From date"
          />
          <span className="text-sm text-slate-500">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="input w-40"
            aria-label="To date"
          />
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(""); setToDate(""); }} className="btn-secondary text-sm">
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customers with dues</p>
          <p className="text-sm font-bold text-slate-900">{customers.length}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Pending</p>
          <p className="text-2xl font-bold text-red-600">{formatINR(totalPending)}</p>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading dues…" />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : customers.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          No customers found. 🎉
        </div>
      ) : (
        <div className="space-y-4">
          {customers.map((c) => (
            <div key={c.customerMobile} className="card">
              <button
                onClick={() => openDetail(c.customerMobile)}
                className="flex w-full flex-col justify-between gap-2 p-4 text-left sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{c.customerName}</p>
                  <p className="text-sm text-slate-500">{c.customerMobile} · {c.totalOrders} order(s)</p>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-xs text-slate-500">Purchase</p>
                    <p className="font-semibold text-slate-900">{formatINR(c.totalPurchase)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Paid</p>
                    <p className="font-semibold text-green-700">{formatINR(c.totalPaid)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Due</p>
                    <p className="text-lg font-bold text-red-600">{formatINR(c.totalDue)}</p>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      )}

      {detailLoading && <LoadingState label="Loading customer detail…" />}
    </div>
  );
}
