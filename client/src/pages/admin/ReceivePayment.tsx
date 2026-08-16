import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { adminApi, ApiRequestError } from "../../lib/api";
import type { Order, PaymentMode } from "../../types";
import { formatINR, formatDate } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/Loading";
import { useToast } from "../../components/Toast";

export default function ReceivePayment() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
const { success } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PaymentMode>("CASH");
  const [saving, setSaving] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Load the order by route param (id) — no large objects passed via state.
  useEffect(() => {
    const id = Number(orderId);
    if (!id) {
      setLoadError("Invalid order id in URL");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    adminApi
      .getOrder(id)
      .then(({ order: ord }) => {
        setOrder(ord);
        // Prefill a sensible default = remaining due.
        setAmount(ord.due > 0 ? String(ord.due) : "");
      })
      .catch((e: unknown) => {
        if (e instanceof ApiRequestError) setLoadError(e.message);
        else setLoadError("Failed to load order");
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  const submit = async () => {
    if (!order) return;
    const amt = parseFloat(amount);
    if (Number.isNaN(amt) || amt <= 0) {
      setPayError("Enter a valid payment amount");
      return;
    }
    if (amt > order.due + 0.001) {
      setPayError(`Amount exceeds the remaining due of ${formatINR(order.due)}`);
      return;
    }
    setSaving(true);
    setPayError(null);
    try {
      const res = await adminApi.receivePayment(order.id, amt, mode);
      success(res.message);
      // Navigate back to billing after successful payment.
      navigate("/admin/billing");
    } catch (e: unknown) {
      if (e instanceof ApiRequestError) setPayError(e.message);
      else setPayError("Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Receive Payment</h2>
          <p className="text-sm text-slate-500">Loading order details…</p>
        </div>
        <LoadingState label="Loading order…" />
      </div>
    );
  }

  if (loadError || !order) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Receive Payment</h2>
          <p className="text-sm text-slate-500">Unable to load order.</p>
        </div>
        <ErrorState message={loadError ?? "Order not found"} onRetry={() => navigate(0)} />
        <Link to="/admin/billing" className="btn-secondary">← Back to Billing</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Receive Payment</h2>
          <p className="text-sm text-slate-500">
            Record a payment against order {order.orderNumber}.
          </p>
        </div>
        <Link to="/admin/billing" className="btn-secondary">← Back to Billing</Link>
      </div>

      {/* Order summary card */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{order.orderNumber}</h3>
            <p className="text-sm text-slate-500">
              {order.customerName} · {order.customerMobile}
            </p>
            <p className="text-sm text-slate-500">{order.deliveryAddress || "Address not provided"}</p>
          </div>
          <div className="text-right">
            <span className="badge bg-brand-100 text-brand-800">{order.status}</span>
            <p className="mt-1 text-xs text-slate-500">{formatDate(order.createdAt)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-2 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Final Amount</span>
            <span className="font-bold text-slate-900">{formatINR(order.finalAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Cash Paid</span>
            <span className="font-semibold text-slate-900">{formatINR(order.cashTotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Online Paid</span>
            <span className="font-semibold text-slate-900">{formatINR(order.onlineTotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Total Paid</span>
            <span className="font-semibold text-green-700">{formatINR(order.paidTotal)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-2 sm:col-span-2">
            <span className="font-semibold text-slate-800">Remaining Due</span>
            <span className={`font-bold ${order.due > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {formatINR(order.due)}
            </span>
          </div>
        </div>

        {/* Existing payment history */}
        {order.payments.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Payment History</p>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
              {order.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                  <span className="text-slate-500">
                    {p.paymentMode === "CASH" ? "Cash" : "Online"} · {formatDate(p.paymentDate)}
                  </span>
                  <span className="font-semibold text-slate-800">{formatINR(p.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Amount + mode form */}
        <div className="mt-6 border-t border-slate-200 pt-5">
          {order.due <= 0 ? (
            <p className="rounded-lg bg-green-50 p-4 text-center text-sm font-semibold text-green-700">
              This order is fully paid. No payment is due.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="receiveAmount">Amount Received (₹) *</label>
                <input
                  id="receiveAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="input"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="receiveMode">Payment Mode</label>
                <select
                  id="receiveMode"
                  className="input"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as PaymentMode)}
                >
                  <option value="CASH">Cash</option>
                  <option value="ONLINE">Online</option>
                </select>
              </div>
            </div>
          )}
          {payError && <div className="mt-2 text-sm text-red-600">{payError}</div>}
          <div className="mt-5 flex justify-end gap-2">
            <Link to="/admin/billing" className="btn-secondary">Cancel</Link>
            {order.due > 0 && (
              <button onClick={submit} disabled={saving} className="btn-primary">
                {saving ? "Saving…" : "Record Payment"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
