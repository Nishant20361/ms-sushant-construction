/**
 * Sales Reports engine.
 *
 * Generates Daily / Weekly / Monthly sales reports from the Order data.
 *
 * RULES (enforced here):
 *   - Sales figures ONLY include DELIVERED orders.
 *   - CANCELLED orders never increase sales.
 *   - PENDING / CONFIRMED / PROCESSING / OUT_FOR_DELIVERY orders are NOT
 *     counted in sales figures.
 *   - Cancelled order count is still reported as a separate metric.
 *
 * PERFORMANCE:
 *   - A single Prisma query (with include) loads all needed data — no N+1.
 *   - Only the fields needed for the report are selected.
 */

import { prisma } from "../db.js";

export type ReportPeriod =
  | { type: "daily"; date: string }
  | { type: "weekly"; from: string; to: string }
  | { type: "monthly"; month: number; year: number };

export interface ReportFilters {
  customerName?: string;
  phone?: string;
  orderId?: string;
  paymentType?: string; // CASH | ONLINE | DUE
  status?: string; // order status
  productName?: string;
  category?: string;
}

export interface ReportLineItem {
  productId: number;
  productName: string;
  category: string | null;
  imageUrl: string | null;
  unit: string;
  price: number;
  quantity: number;
  total: number;
}

export interface ReportOrder {
  id: number;
  orderNumber: string;
  customerName: string;
  customerMobile: string;
  deliveryAddress: string | null;
  createdAt: string;
  status: string;
  subtotal: number;
  discount: number;
  finalAmount: number;
  cashPaid: number;
  onlinePaid: number;
  totalPaid: number;
  duePaid: number;
  remainingDue: number;
  paymentStatus: string;
  items: ReportLineItem[];
}

export interface ReportPayment {
  id: number;
  orderId: number;
  orderNumber: string;
  customerName: string;
  customerMobile: string;
  orderCreatedAt: string;
  subtotal: number;
  originalBillAmount: number;
  paymentDate: string;
  amount: number;
  paymentMode: string;
  previouslyPaidBeforePeriod: number;
  previouslyPaidBeforePayment: number;
  dueBeforePayment: number;
  totalPaidAfterPayment: number;
  remainingBalanceAfterPayment: number;
  paymentStatusAfterPayment: string;
  saleCreatedInPeriod: boolean;
  salePeriodType: "CURRENT_PERIOD_SALE" | "OLDER_SALE_PREVIOUS_DUE";
  dueCleared: boolean;
  dueClearedAmount: number | null;
  dueClearedAt: string | null;
}

export interface SalesReportData {
  reportType: "daily" | "weekly" | "monthly";
  periodLabel: string;
  from: string;
  to: string;
  generatedAt: string;
  generatedBy: string;
  summary: {
    totalOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    totalSales: number;
    totalCollected: number;
    totalDiscount: number;
    cashCollection: number;
    onlineCollection: number;
    dueCollection: number;
    remainingDue: number;
    outstandingAmount: number;
    paidOrders: number;
    partiallyPaidOrders: number;
    dueOrders: number;
    statusCounts: Record<string, number>;
    uniqueCustomers: number;
    productsSold: number;
    totalQuantitySold: number;
  };
  collections: {
    totalCollected: number;
    cashCollected: number;
    onlineCollected: number;
    olderSalesCollected: number;
    currentPeriodSalesCollected: number;
    transactionCount: number;
    dueClearedCount: number;
    dueClearedAmount: number;
  };
  orders: ReportOrder[];
  payments: ReportPayment[];
  previousDuePayments: ReportPayment[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function parseIstDate(value: string, isEnd = false): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Invalid date");
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const maxDay = new Date(year, month, 0).getDate();
  if (month < 1 || month > 12 || day < 1 || day > maxDay) throw new Error("Invalid date");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  if (!isEnd) {
    return new Date(`${year}-${m}-${d}T00:00:00.000+05:30`);
  }
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  const ny = nextDate.getUTCFullYear();
  const nm = String(nextDate.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(nextDate.getUTCDate()).padStart(2, "0");
  return new Date(`${ny}-${nm}-${nd}T00:00:00.000+05:30`);
}

/** Resolve the date window for the requested period. */
export function resolvePeriod(
  period: ReportPeriod
): { from: Date; to: Date; label: string } {
  if (period.type === "daily") {
    const from = parseIstDate(period.date, false);
    const to = parseIstDate(period.date, true);
    const label = from.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
    return { from, to, label };
  }

  if (period.type === "weekly") {
    const from = parseIstDate(period.from, false);
    const to = parseIstDate(period.to, true);
    const toDateOnly = parseIstDate(period.to, false);
    if (from > toDateOnly) throw new Error("Invalid date range");
    const label = `${from.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    })} – ${toDateOnly.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    })}`;
    return { from, to, label };
  }

  // monthly
  const month = Number(period.month);
  const year = Number(period.year);
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new Error("Invalid month/year");
  }
  const m = String(month).padStart(2, "0");
  const from = new Date(`${year}-${m}-01T00:00:00.000+05:30`);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nm = String(nextMonth).padStart(2, "0");
  const to = new Date(`${nextYear}-${nm}-01T00:00:00.000+05:30`);
  const label = from.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  return { from, to, label };
}

/**
 * Build the full report for a period. All sales metrics are computed from
 * DELIVERED orders only. A single query avoids N+1.
 */
export async function buildSalesReport(
  period: ReportPeriod,
  filters: ReportFilters = {},
  generatedBy = "Admin"
): Promise<SalesReportData> {
  const { from, to, label } = resolvePeriod(period);

  // Single optimized query: fetch all orders in the period with their
  // payments, bill, and items (with product → category + primary image).
  const [orders, periodPayments] = await Promise.all([prisma.order.findMany({
    where: {
      createdAt: { gte: from, lt: to },
    },
    include: {
      bill: true,
      payments: true,
      items: {
        orderBy: { id: "asc" },
        include: {
          product: {
            select: {
              name: true,
              unit: true,
              category: { select: { name: true } },
              images: { select: { url: true, isPrimary: true }, orderBy: { isPrimary: "desc" } },
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  }), prisma.orderPayment.findMany({
    where: { paymentDate: { gte: from, lt: to } },
    include: {
      order: {
        include: {
          bill: true,
          payments: { orderBy: [{ paymentDate: "asc" }, { id: "asc" }] },
        },
      },
    },
    orderBy: [{ paymentDate: "asc" }, { id: "asc" }],
  })]);

  // Helper to compute per-order money fields.
  const enrich = (o: (typeof orders)[number]): ReportOrder => {
    const subtotal = Number(o.subtotal);
    const discount = o.bill ? Number(o.bill.discount) : 0;
    const finalAmount = o.bill ? Number(o.bill.finalAmount) : subtotal;
    const payments = o.payments ?? [];
    const cashPaid = payments
      .filter((p: any) => p.paymentMode === "CASH")
      .reduce((s: number, p: any) => s + Number(p.amount), 0);
    const onlinePaid = payments
      .filter((p: any) => p.paymentMode === "ONLINE")
      .reduce((s: number, p: any) => s + Number(p.amount), 0);
    const totalPaid = cashPaid + onlinePaid;
    const remainingDue = Math.max(0, round2(finalAmount - totalPaid));
    const paymentStatus =
      totalPaid <= 0 ? "DUE" : remainingDue <= 0 ? "PAID" : "PARTIALLY_PAID";

    // Due collection = payments received after the first payment on this
    // order (i.e. money settling an outstanding due).
    const sorted = [...payments].sort(
      (a: any, b: any) =>
        new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
    );
    const duePaid = sorted
      .slice(0, Math.max(0, sorted.length - 1))
      .reduce((s: number, p: any) => s + Number(p.amount), 0);

    const items: ReportLineItem[] = (o.items ?? []).map((it: any) => ({
      productId: it.productId,
      productName: it.productName,
      category: it.product?.category?.name ?? null,
      imageUrl: it.product?.images?.[0]?.url ?? null,
      unit: it.unit,
      price: Number(it.price),
      quantity: Number(it.quantity),
      total: Number(it.total),
    }));

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      customerMobile: o.customerMobile,
      deliveryAddress: o.deliveryAddress ?? null,
      createdAt: o.createdAt.toISOString(),
      status: o.status,
      subtotal: round2(subtotal),
      discount: round2(discount),
      finalAmount: round2(finalAmount),
      cashPaid: round2(cashPaid),
      onlinePaid: round2(onlinePaid),
      totalPaid: round2(totalPaid),
      duePaid: round2(duePaid),
      remainingDue,
      paymentStatus,
      items,
    };
  };

  let reportOrders = orders.map(enrich);

  // ---- Apply filters (client asked for these filters) ----
  if (filters.customerName?.trim()) {
    const q = filters.customerName.trim().toLowerCase();
    reportOrders = reportOrders.filter((o) =>
      o.customerName.toLowerCase().includes(q)
    );
  }
  if (filters.phone?.trim()) {
    const q = filters.phone.trim();
    reportOrders = reportOrders.filter((o) => o.customerMobile.includes(q));
  }
  if (filters.orderId?.trim()) {
    const q = filters.orderId.trim().toLowerCase();
    reportOrders = reportOrders.filter((o) =>
      o.orderNumber.toLowerCase().includes(q)
    );
  }
  if (filters.paymentType) {
    const pt = filters.paymentType.toUpperCase();
    if (pt === "CASH") {
      reportOrders = reportOrders.filter((o) => o.cashPaid > 0);
    } else if (pt === "ONLINE") {
      reportOrders = reportOrders.filter((o) => o.onlinePaid > 0);
    } else if (pt === "DUE") {
      reportOrders = reportOrders.filter((o) => o.remainingDue > 0);
    }
  }
  if (filters.status) {
    const st = filters.status.toUpperCase();
    reportOrders = reportOrders.filter((o) => o.status === st);
  }
  if (filters.productName?.trim()) {
    const q = filters.productName.trim().toLowerCase();
    reportOrders = reportOrders.filter((o) =>
      o.items.some((it) => it.productName.toLowerCase().includes(q))
    );
  }
  if (filters.category?.trim()) {
    const q = filters.category.trim().toLowerCase();
    reportOrders = reportOrders.filter((o) =>
      o.items.some((it) => (it.category ?? "").toLowerCase().includes(q))
    );
  }

  // ---- Aggregate metrics (DELIVERED orders count toward sales) ----
  const totalOrders = reportOrders.length;
  const cancelledOrders = reportOrders.filter((o) => o.status === "CANCELLED").length;
  const deliveredOrders = reportOrders.filter((o) => o.status === "DELIVERED").length;
  const salesOrders = reportOrders.filter((o) => o.status === "DELIVERED");

  const totalSales = round2(
    salesOrders.reduce((s, o) => s + o.finalAmount, 0)
  );
  const totalDiscount = round2(
    salesOrders.reduce((s, o) => s + o.discount, 0)
  );
  const cashCollection = round2(
    salesOrders.reduce((s, o) => s + o.cashPaid, 0)
  );
  const onlineCollection = round2(
    salesOrders.reduce((s, o) => s + o.onlinePaid, 0)
  );
  const dueCollection = round2(
    salesOrders.reduce((s, o) => s + o.duePaid, 0)
  );
  const remainingDue = round2(
    salesOrders.reduce((s, o) => s + o.remainingDue, 0)
  );
  const totalCollected = round2(
    salesOrders.reduce((s, o) => s + o.totalPaid, 0)
  );
  const paidOrders = salesOrders.filter((o) => o.paymentStatus === "PAID").length;
  const partiallyPaidOrders = salesOrders.filter((o) => o.paymentStatus === "PARTIALLY_PAID").length;
  const dueOrders = salesOrders.filter((o) => o.paymentStatus === "DUE").length;
  const statusCounts = reportOrders.reduce<Record<string, number>>((counts, order) => {
    counts[order.status] = (counts[order.status] ?? 0) + 1;
    return counts;
  }, {});
  const uniqueCustomers = new Set(
    salesOrders.map((o) => o.customerMobile)
  ).size;
  const productsSold = new Set(
    salesOrders.flatMap((o) => o.items.map((it) => it.productId))
  ).size;
  const totalQuantitySold = round2(
    salesOrders
      .flatMap((o) => o.items.map((it) => it.quantity))
      .reduce((s, q) => s + q, 0)
  );

  const payments: ReportPayment[] = periodPayments.map((payment) => {
    const history = payment.order.payments;
    const paymentIndex = history.findIndex((entry) => entry.id === payment.id);
    const finalAmount = Number(payment.order.bill?.finalAmount ?? payment.order.subtotal);
    const paidBeforePeriod = history.filter((entry) => entry.paymentDate < from).reduce((sum, entry) => sum + Number(entry.amount), 0);
    const paidBefore = history.slice(0, Math.max(0, paymentIndex)).reduce((sum, entry) => sum + Number(entry.amount), 0);
    const paymentAmount = Number(payment.amount);
    const totalPaidAfter = round2(paidBefore + paymentAmount);
    const previousDue = Math.max(0, round2(finalAmount - paidBefore));
    const remainingAfter = Math.max(0, round2(finalAmount - totalPaidAfter));
    const saleCreatedInPeriod = payment.order.createdAt >= from && payment.order.createdAt < to;
    // A later allocation, or the first recorded payment against an older sale,
    // can authoritatively settle a due. A new sale's initial full payment is PAID
    // but is deliberately not labelled as recovered/cleared due.
    const hasPriorDebtContext = paymentIndex > 0 || payment.order.createdAt < from;
    const dueCleared = hasPriorDebtContext && previousDue > 0 && remainingAfter === 0;
    const paymentStatusAfterPayment = totalPaidAfter <= 0 ? "DUE" : remainingAfter <= 0 ? "PAID" : "PARTIALLY_PAID";
    return {
      id: payment.id,
      orderId: payment.orderId,
      orderNumber: payment.order.orderNumber,
      customerName: payment.order.customerName,
      customerMobile: payment.order.customerMobile,
      orderCreatedAt: payment.order.createdAt.toISOString(),
      subtotal: round2(Number(payment.order.subtotal)),
      originalBillAmount: round2(finalAmount),
      paymentDate: payment.paymentDate.toISOString(),
      amount: round2(paymentAmount),
      paymentMode: payment.paymentMode,
      previouslyPaidBeforePeriod: round2(paidBeforePeriod),
      previouslyPaidBeforePayment: round2(paidBefore),
      dueBeforePayment: previousDue,
      totalPaidAfterPayment: totalPaidAfter,
      remainingBalanceAfterPayment: remainingAfter,
      paymentStatusAfterPayment,
      saleCreatedInPeriod,
      salePeriodType: saleCreatedInPeriod ? "CURRENT_PERIOD_SALE" : "OLDER_SALE_PREVIOUS_DUE",
      dueCleared,
      dueClearedAmount: dueCleared ? round2(Math.min(previousDue, Number(payment.amount))) : null,
      dueClearedAt: dueCleared ? payment.paymentDate.toISOString() : null,
    };
  });

  let filteredPayments = payments;
  if (filters.customerName?.trim()) {
    const q = filters.customerName.trim().toLowerCase();
    filteredPayments = filteredPayments.filter((p) =>
      p.customerName.toLowerCase().includes(q)
    );
  }
  if (filters.phone?.trim()) {
    const q = filters.phone.trim();
    filteredPayments = filteredPayments.filter((p) => p.customerMobile.includes(q));
  }
  if (filters.orderId?.trim()) {
    const q = filters.orderId.trim().toLowerCase();
    filteredPayments = filteredPayments.filter((p) =>
      p.orderNumber.toLowerCase().includes(q)
    );
  }
  if (filters.paymentType) {
    const pt = filters.paymentType.toUpperCase();
    if (pt === "CASH") {
      filteredPayments = filteredPayments.filter((p) => p.paymentMode === "CASH");
    } else if (pt === "ONLINE") {
      filteredPayments = filteredPayments.filter((p) => p.paymentMode === "ONLINE");
    } else if (pt === "DUE") {
      filteredPayments = filteredPayments.filter((p) => p.remainingBalanceAfterPayment > 0);
    }
  }

  const previousDuePayments = filteredPayments.filter((payment) => !payment.saleCreatedInPeriod);

  const periodTotalCollected = round2(filteredPayments.reduce((sum, payment) => sum + payment.amount, 0));
  const cashCollected = round2(filteredPayments.filter((payment) => payment.paymentMode === "CASH").reduce((sum, payment) => sum + payment.amount, 0));
  const onlineCollected = round2(filteredPayments.filter((payment) => payment.paymentMode === "ONLINE").reduce((sum, payment) => sum + payment.amount, 0));
  const olderSalesCollected = round2(filteredPayments.filter((payment) => !payment.saleCreatedInPeriod).reduce((sum, payment) => sum + payment.amount, 0));
  const currentPeriodSalesCollected = round2(filteredPayments.filter((payment) => payment.saleCreatedInPeriod).reduce((sum, payment) => sum + payment.amount, 0));
  const clearedPayments = filteredPayments.filter((payment) => payment.dueCleared);

  return {
    reportType: period.type,
    periodLabel: label,
    from: from.toISOString(),
    to: to.toISOString(),
    generatedAt: new Date().toISOString(),
    generatedBy,
    summary: {
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      totalSales,
      totalCollected,
      totalDiscount,
      cashCollection,
      onlineCollection,
      dueCollection,
      remainingDue,
      outstandingAmount: remainingDue,
      paidOrders,
      partiallyPaidOrders,
      dueOrders,
      statusCounts,
      uniqueCustomers,
      productsSold,
      totalQuantitySold,
    },
    collections: {
      totalCollected: periodTotalCollected,
      cashCollected,
      onlineCollected,
      olderSalesCollected,
      currentPeriodSalesCollected,
      transactionCount: filteredPayments.length,
      dueClearedCount: clearedPayments.length,
      dueClearedAmount: round2(clearedPayments.reduce((sum, payment) => sum + (payment.dueClearedAmount ?? 0), 0)),
    },
    orders: reportOrders,
    payments: filteredPayments,
    previousDuePayments,
  };
}
