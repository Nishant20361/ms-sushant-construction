import { Prisma } from "@prisma/client";

export type PaymentStatus = "PAID" | "PARTIALLY_PAID" | "DUE";

export type DecimalLike = number | string | Prisma.Decimal | null | undefined;

/**
 * Authoritative 2-decimal-place rounding for all currency values.
 * Uses epsilon arithmetic to prevent floating-point representation anomalies.
 */
export function roundCurrency(value: DecimalLike): number {
  if (value == null) return 0;
  const num = typeof value === "number" ? value : Number(value.toString());
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Formats a currency value as a Prisma.Decimal suitable for database inserts/updates.
 */
export function toPrismaDecimal(value: DecimalLike): Prisma.Decimal {
  const rounded = roundCurrency(value);
  return new Prisma.Decimal(rounded.toFixed(2));
}

export interface OrderFinancialSummary {
  subtotal: number;
  discount: number;
  finalAmount: number;
  cashTotal: number;
  onlineTotal: number;
  paidTotal: number;
  due: number;
  paymentStatus: PaymentStatus;
}

/**
 * Computes authoritative financial metrics for an order.
 * Primary business invariant:
 *   finalAmount = subtotal - discount
 *   paidTotal = sum of valid payments
 *   due = max(0, finalAmount - paidTotal)
 *   status = DUE (if paid=0 and due>0) | PARTIALLY_PAID (if paid>0 and due>0) | PAID (if due=0)
 */
export function computeOrderFinancials(order: {
  subtotal: DecimalLike;
  bill?: { discount?: DecimalLike; finalAmount?: DecimalLike } | null;
  payments?: Array<{ amount: DecimalLike; paymentMode?: string | null }> | null;
}): OrderFinancialSummary {
  const subtotal = roundCurrency(order.subtotal);
  const discount = order.bill ? roundCurrency(order.bill.discount) : 0;
  
  // If a bill exists, use its finalAmount (subtotal - discount); otherwise default to subtotal
  const rawFinal = order.bill && order.bill.finalAmount != null
    ? roundCurrency(order.bill.finalAmount)
    : roundCurrency(subtotal - discount);
  const finalAmount = Math.max(0, rawFinal);

  const payments = order.payments ?? [];
  let cashTotal = 0;
  let onlineTotal = 0;

  for (const p of payments) {
    const amt = roundCurrency(p.amount);
    if (amt <= 0) continue;
    if (p.paymentMode === "ONLINE") {
      onlineTotal = roundCurrency(onlineTotal + amt);
    } else {
      cashTotal = roundCurrency(cashTotal + amt);
    }
  }

  const paidTotal = roundCurrency(cashTotal + onlineTotal);
  const due = Math.max(0, roundCurrency(finalAmount - paidTotal));

  let paymentStatus: PaymentStatus = "DUE";
  if (due === 0 || paidTotal >= finalAmount) {
    paymentStatus = "PAID";
  } else if (paidTotal > 0 && due > 0) {
    paymentStatus = "PARTIALLY_PAID";
  } else {
    paymentStatus = "DUE";
  }

  return {
    subtotal,
    discount,
    finalAmount,
    cashTotal,
    onlineTotal,
    paidTotal,
    due,
    paymentStatus,
  };
}

export interface FIFOAllocation {
  orderId: number;
  allocatedAmount: number;
  previousDue: number;
  remainingDue: number;
}

/**
 * Computes FIFO allocation of customer payment across due orders (oldest first).
 */
export function allocateCustomerPaymentFIFO(
  dueOrders: Array<{
    id: number;
    finalAmount: number;
    paidTotal: number;
    due: number;
  }>,
  paymentAmount: number
): {
  allocations: FIFOAllocation[];
  totalAllocated: number;
  remainingUnallocated: number;
} {
  let remainingPayment = roundCurrency(paymentAmount);
  const allocations: FIFOAllocation[] = [];
  let totalAllocated = 0;

  for (const ord of dueOrders) {
    if (remainingPayment <= 0) break;
    const currentDue = roundCurrency(ord.due);
    if (currentDue <= 0) continue;

    const alloc = Math.min(currentDue, remainingPayment);
    const allocRounded = roundCurrency(alloc);
    const orderRemaining = roundCurrency(currentDue - allocRounded);

    allocations.push({
      orderId: ord.id,
      allocatedAmount: allocRounded,
      previousDue: currentDue,
      remainingDue: Math.max(0, orderRemaining),
    });

    totalAllocated = roundCurrency(totalAllocated + allocRounded);
    remainingPayment = roundCurrency(remainingPayment - allocRounded);
  }

  return {
    allocations,
    totalAllocated,
    remainingUnallocated: Math.max(0, remainingPayment),
  };
}
