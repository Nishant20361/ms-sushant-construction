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
  duePaid: number;
  remainingDue: number;
  paymentStatus: string;
  items: ReportLineItem[];
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
    totalDiscount: number;
    cashCollection: number;
    onlineCollection: number;
    dueCollection: number;
    remainingDue: number;
    uniqueCustomers: number;
    productsSold: number;
    totalQuantitySold: number;
  };
  orders: ReportOrder[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
}

/** Resolve the date window for the requested period. */
export function resolvePeriod(
  period: ReportPeriod
): { from: Date; to: Date; label: string } {
  if (period.type === "daily") {
    const d = new Date(period.date);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
    const from = startOfDay(d);
    const to = endOfDay(d);
    const label = from.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return { from, to, label };
  }

  if (period.type === "weekly") {
    const from = startOfDay(new Date(period.from));
    const toRaw = new Date(period.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(toRaw.getTime())) {
      throw new Error("Invalid date range");
    }
    const to = endOfDay(toRaw);
    const label = `${from.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })} – ${toRaw.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`;
    return { from, to, label };
  }

  // monthly
  const month = Number(period.month);
  const year = Number(period.year);
  if (Number.isNaN(month) || Number.isNaN(year)) throw new Error("Invalid month/year");
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 1);
  const label = from.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
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
  const orders = await prisma.order.findMany({
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
  });

  // Counts of all statuses (for the cancelled metric).
  const totalOrders = orders.length;
  const cancelledOrders = orders.filter((o) => o.status === "CANCELLED").length;
  const deliveredOrders = orders.filter((o) => o.status === "DELIVERED").length;

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
      totalDiscount,
      cashCollection,
      onlineCollection,
      dueCollection,
      remainingDue,
      uniqueCustomers,
      productsSold,
      totalQuantitySold,
    },
    orders: reportOrders,
  };
}
