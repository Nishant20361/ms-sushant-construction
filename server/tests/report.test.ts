import { beforeEach, describe, expect, it, vi } from "vitest";

const { orderFindMany, paymentFindMany } = vi.hoisted(() => ({
  orderFindMany: vi.fn(),
  paymentFindMany: vi.fn(),
}));
vi.mock("../src/db.js", () => ({
  prisma: {
    order: { findMany: orderFindMany },
    orderPayment: { findMany: paymentFindMany },
  },
}));

import { buildSalesReport, resolvePeriod } from "../src/utils/report.js";
import {
  SALES_EXPORT_COLUMNS,
  PERIOD_SALES_COLUMNS,
  PREVIOUS_DUES_COLUMNS,
  toSalesExportRows,
  toPeriodSalesRows,
  toPreviousDuesRows,
} from "../src/routes/admin/reports.js";
import { buildCsv, buildMultiSheetXlsx, buildXlsx } from "../src/utils/export.js";

const date = (value: string) => new Date(value);
const baseOrder = {
  id: 1,
  orderNumber: "ORD-1",
  customerName: "Asha",
  customerMobile: "9999999999",
  deliveryAddress: null,
  subtotal: 100,
  status: "DELIVERED",
  createdAt: date("2026-08-21T09:00:00+05:30"),
  bill: { discount: 0, finalAmount: 100 },
  payments: [{ id: 1, amount: 60, paymentMode: "CASH", paymentDate: date("2026-08-21T09:00:00+05:30") }],
  items: [],
};

describe("sales report accounting", () => {
  beforeEach(() => {
    orderFindMany.mockReset();
    paymentFindMany.mockReset();
  });

  it("1. reports daily report with only current-day sale", async () => {
    orderFindMany.mockResolvedValue([baseOrder]);
    paymentFindMany.mockResolvedValue([{ ...baseOrder.payments[0], orderId: 1, order: baseOrder }]);
    const report = await buildSalesReport({ type: "daily", date: "2026-08-21" });
    expect(report.summary.totalSales).toBe(100);
    expect(report.summary.totalOrders).toBe(1);
    expect(report.summary.totalCollected).toBe(60);
    expect(report.summary.outstandingAmount).toBe(40);
    expect(report.orders).toHaveLength(1);
    expect(report.previousDuePayments).toHaveLength(0);
    expect(report.collections.olderSalesCollected).toBe(0);
  });

  it("2. reports daily report with an old sale receiving partial payment today", async () => {
    orderFindMany.mockResolvedValue([]);
    const oldOrder = {
      ...baseOrder,
      id: 5,
      orderNumber: "ORD-OLD-5",
      createdAt: date("2026-08-10T10:00:00+05:30"),
      subtotal: 10_000,
      bill: { discount: 0, finalAmount: 10_000 },
      payments: [
        { id: 10, orderId: 5, amount: 3_000, paymentMode: "CASH", paymentDate: date("2026-08-10T10:00:00+05:30") },
        { id: 11, orderId: 5, amount: 3_000, paymentMode: "ONLINE", paymentDate: date("2026-08-21T11:00:00+05:30") },
      ],
    };
    paymentFindMany.mockResolvedValue([{ ...oldOrder.payments[1], order: oldOrder }]);
    const report = await buildSalesReport({ type: "daily", date: "2026-08-21" });
    expect(report.summary.totalSales).toBe(0);
    expect(report.orders).toHaveLength(0);
    expect(report.previousDuePayments).toHaveLength(1);
    expect(report.previousDuePayments[0]).toMatchObject({
      orderNumber: "ORD-OLD-5",
      originalBillAmount: 10_000,
      previouslyPaidBeforePayment: 3_000,
      dueBeforePayment: 7_000,
      amount: 3_000,
      totalPaidAfterPayment: 6_000,
      remainingBalanceAfterPayment: 4_000,
      paymentStatusAfterPayment: "PARTIALLY_PAID",
      dueCleared: false,
      dueClearedAmount: null,
    });
  });

  it("3. reports daily report with an old due fully cleared today", async () => {
    orderFindMany.mockResolvedValue([]);
    const oldOrder = {
      ...baseOrder,
      id: 6,
      orderNumber: "ORD-OLD-6",
      createdAt: date("2026-08-10T10:00:00+05:30"),
      subtotal: 10_000,
      bill: { discount: 0, finalAmount: 10_000 },
      payments: [
        { id: 15, orderId: 6, amount: 3_000, paymentMode: "CASH", paymentDate: date("2026-08-10T10:00:00+05:30") },
        { id: 16, orderId: 6, amount: 7_000, paymentMode: "ONLINE", paymentDate: date("2026-08-21T15:00:00+05:30") },
      ],
    };
    paymentFindMany.mockResolvedValue([{ ...oldOrder.payments[1], order: oldOrder }]);
    const report = await buildSalesReport({ type: "daily", date: "2026-08-21" });
    expect(report.summary.totalSales).toBe(0);
    expect(report.previousDuePayments).toHaveLength(1);
    expect(report.previousDuePayments[0]).toMatchObject({
      dueBeforePayment: 7_000,
      amount: 7_000,
      totalPaidAfterPayment: 10_000,
      remainingBalanceAfterPayment: 0,
      paymentStatusAfterPayment: "PAID",
      dueCleared: true,
      dueClearedAmount: 7_000,
    });
    expect(report.collections.dueClearedCount).toBe(1);
    expect(report.collections.dueClearedAmount).toBe(7_000);
  });

  it("4 & 5. old-due payment appears when ZERO new sales today and does not increase sales", async () => {
    orderFindMany.mockResolvedValue([]);
    const oldOrder = {
      ...baseOrder,
      id: 7,
      orderNumber: "ORD-OLD-7",
      createdAt: date("2026-07-15T10:00:00+05:30"),
      subtotal: 5_000,
      bill: { discount: 0, finalAmount: 5_000 },
      payments: [
        { id: 20, orderId: 7, amount: 5_000, paymentMode: "CASH", paymentDate: date("2026-08-21T10:00:00+05:30") },
      ],
    };
    paymentFindMany.mockResolvedValue([{ ...oldOrder.payments[0], order: oldOrder }]);
    const report = await buildSalesReport({ type: "daily", date: "2026-08-21" });
    expect(report.summary.totalSales).toBe(0);
    expect(report.summary.totalOrders).toBe(0);
    expect(report.collections.olderSalesCollected).toBe(5_000);
    expect(report.collections.totalCollected).toBe(5_000);
    expect(report.previousDuePayments).toHaveLength(1);
  });

  it("6. reports multiple old customers paying on the same day", async () => {
    orderFindMany.mockResolvedValue([]);
    const oldA = {
      ...baseOrder,
      id: 8,
      customerName: "Customer A",
      customerMobile: "1111111111",
      orderNumber: "ORD-A",
      createdAt: date("2026-07-01T10:00:00+05:30"),
      subtotal: 4_000,
      bill: { discount: 0, finalAmount: 4_000 },
      payments: [{ id: 31, orderId: 8, amount: 4_000, paymentMode: "CASH", paymentDate: date("2026-08-21T10:00:00+05:30") }],
    };
    const oldB = {
      ...baseOrder,
      id: 9,
      customerName: "Customer B",
      customerMobile: "2222222222",
      orderNumber: "ORD-B",
      createdAt: date("2026-07-02T10:00:00+05:30"),
      subtotal: 6_000,
      bill: { discount: 0, finalAmount: 6_000 },
      payments: [{ id: 32, orderId: 9, amount: 3_000, paymentMode: "ONLINE", paymentDate: date("2026-08-21T12:00:00+05:30") }],
    };
    paymentFindMany.mockResolvedValue([
      { ...oldA.payments[0], order: oldA },
      { ...oldB.payments[0], order: oldB },
    ]);
    const report = await buildSalesReport({ type: "daily", date: "2026-08-21" });
    expect(report.previousDuePayments).toHaveLength(2);
    expect(report.collections.olderSalesCollected).toBe(7_000);
    expect(report.previousDuePayments.map((p) => p.customerName)).toEqual(["Customer A", "Customer B"]);
  });

  it("7. preserves FIFO customer-payment allocations across multiple old orders", async () => {
    orderFindMany.mockResolvedValue([]);
    const order1 = {
      ...baseOrder,
      id: 101,
      orderNumber: "FIFO-1",
      subtotal: 3_000,
      bill: { discount: 0, finalAmount: 3_000 },
      createdAt: date("2026-06-01T09:00:00+05:30"),
      payments: [{ id: 41, orderId: 101, amount: 3_000, paymentMode: "CASH", paymentDate: date("2026-08-21T14:00:00+05:30") }],
    };
    const order2 = {
      ...baseOrder,
      id: 102,
      orderNumber: "FIFO-2",
      subtotal: 8_000,
      bill: { discount: 0, finalAmount: 8_000 },
      createdAt: date("2026-06-02T09:00:00+05:30"),
      payments: [{ id: 42, orderId: 102, amount: 5_000, paymentMode: "CASH", paymentDate: date("2026-08-21T14:00:00+05:30") }],
    };
    paymentFindMany.mockResolvedValue([
      { ...order1.payments[0], order: order1 },
      { ...order2.payments[0], order: order2 },
    ]);
    const report = await buildSalesReport({ type: "daily", date: "2026-08-21" });
    expect(report.previousDuePayments.map((p) => [p.orderNumber, p.amount, p.remainingBalanceAfterPayment])).toEqual([
      ["FIFO-1", 3_000, 0],
      ["FIFO-2", 5_000, 3_000],
    ]);
  });

  it("8, 9, 10, 11. computes chronological running balances for multiple payments on one old order", async () => {
    orderFindMany.mockResolvedValue([]);
    const olderOrder = {
      ...baseOrder,
      id: 20,
      orderNumber: "ORD-OLD-20K",
      subtotal: 20_000,
      bill: { discount: 0, finalAmount: 20_000 },
      createdAt: date("2026-07-10T09:00:00+05:30"),
      payments: [
        { id: 20, orderId: 20, amount: 8_000, paymentMode: "CASH", paymentDate: date("2026-07-10T09:00:00+05:30") },
        { id: 21, orderId: 20, amount: 5_000, paymentMode: "ONLINE", paymentDate: date("2026-08-21T10:00:00+05:30") },
        { id: 22, orderId: 20, amount: 7_000, paymentMode: "CASH", paymentDate: date("2026-08-21T17:00:00+05:30") },
      ],
    };
    paymentFindMany.mockResolvedValue(olderOrder.payments.slice(1).map((payment) => ({ ...payment, order: olderOrder })));
    const report = await buildSalesReport({ type: "daily", date: "2026-08-21" });
    expect(report.summary.totalSales).toBe(0);
    expect(report.previousDuePayments[0]).toMatchObject({
      originalBillAmount: 20_000,
      previouslyPaidBeforePeriod: 8_000,
      previouslyPaidBeforePayment: 8_000,
      dueBeforePayment: 12_000,
      amount: 5_000,
      totalPaidAfterPayment: 13_000,
      remainingBalanceAfterPayment: 7_000,
      paymentStatusAfterPayment: "PARTIALLY_PAID",
      salePeriodType: "OLDER_SALE_PREVIOUS_DUE",
      dueCleared: false,
    });
    expect(report.previousDuePayments[1]).toMatchObject({
      previouslyPaidBeforePeriod: 8_000,
      previouslyPaidBeforePayment: 13_000,
      dueBeforePayment: 7_000,
      amount: 7_000,
      totalPaidAfterPayment: 20_000,
      remainingBalanceAfterPayment: 0,
      paymentStatusAfterPayment: "PAID",
      dueCleared: true,
    });
    expect(report.collections.olderSalesCollected).toBe(12_000);
  });

  it("12 & 13. handles weekly old-due payments and date boundaries", async () => {
    orderFindMany.mockResolvedValue([]);
    const oldOrder = {
      ...baseOrder,
      id: 50,
      orderNumber: "ORD-WEEK-OLD",
      createdAt: date("2026-08-01T09:00:00+05:30"),
      subtotal: 15_000,
      bill: { discount: 0, finalAmount: 15_000 },
      payments: [
        { id: 50, orderId: 50, amount: 5_000, paymentMode: "CASH", paymentDate: date("2026-08-19T10:00:00+05:30") },
      ],
    };
    paymentFindMany.mockResolvedValue([{ ...oldOrder.payments[0], order: oldOrder }]);
    const report = await buildSalesReport({ type: "weekly", from: "2026-08-17", to: "2026-08-23" });
    expect(report.previousDuePayments).toHaveLength(1);
    expect(report.previousDuePayments[0].amount).toBe(5_000);
    expect(report.periodLabel).toContain("17 Aug 2026 – 23 Aug 2026");
  });

  it("14 & 15. handles monthly old-due payments and boundary correctly", async () => {
    orderFindMany.mockResolvedValue([]);
    const julyOrder = {
      ...baseOrder,
      id: 60,
      orderNumber: "ORD-JULY",
      createdAt: date("2026-07-10T09:00:00+05:30"),
      subtotal: 10_000,
      bill: { discount: 0, finalAmount: 10_000 },
      payments: [
        { id: 60, orderId: 60, amount: 4_000, paymentMode: "ONLINE", paymentDate: date("2026-08-12T10:00:00+05:30") },
      ],
    };
    paymentFindMany.mockResolvedValue([{ ...julyOrder.payments[0], order: julyOrder }]);
    const report = await buildSalesReport({ type: "monthly", month: 8, year: 2026 });
    expect(report.summary.totalSales).toBe(0);
    expect(report.previousDuePayments).toHaveLength(1);
    expect(report.previousDuePayments[0].salePeriodType).toBe("OLDER_SALE_PREVIOUS_DUE");
    expect(report.collections.olderSalesCollected).toBe(4_000);
  });

  it("16. returns safe empty state when no sales or old dues are paid", async () => {
    orderFindMany.mockResolvedValue([]);
    paymentFindMany.mockResolvedValue([]);
    const report = await buildSalesReport({ type: "daily", date: "2026-08-21" });
    expect(report.orders).toEqual([]);
    expect(report.payments).toEqual([]);
    expect(report.previousDuePayments).toEqual([]);
    expect(report.summary.totalSales).toBe(0);
    expect(report.collections.totalCollected).toBe(0);
  });

  it("17. tie-breaks equal payment timestamps deterministically with id", async () => {
    orderFindMany.mockResolvedValue([]);
    const sameStamp = date("2026-08-21T12:00:00+05:30");
    const oldOrder = {
      ...baseOrder,
      id: 70,
      orderNumber: "ORD-TIE",
      subtotal: 10_000,
      bill: { discount: 0, finalAmount: 10_000 },
      createdAt: date("2026-08-01T09:00:00+05:30"),
      payments: [
        { id: 71, orderId: 70, amount: 4_000, paymentMode: "CASH", paymentDate: sameStamp },
        { id: 72, orderId: 70, amount: 6_000, paymentMode: "ONLINE", paymentDate: sameStamp },
      ],
    };
    paymentFindMany.mockResolvedValue([
      { ...oldOrder.payments[0], order: oldOrder },
      { ...oldOrder.payments[1], order: oldOrder },
    ]);
    const report = await buildSalesReport({ type: "daily", date: "2026-08-21" });
    expect(report.previousDuePayments[0].id).toBe(71);
    expect(report.previousDuePayments[0].dueBeforePayment).toBe(10_000);
    expect(report.previousDuePayments[0].remainingBalanceAfterPayment).toBe(6_000);
    expect(report.previousDuePayments[1].id).toBe(72);
    expect(report.previousDuePayments[1].dueBeforePayment).toBe(6_000);
    expect(report.previousDuePayments[1].remainingBalanceAfterPayment).toBe(0);
    expect(report.previousDuePayments[1].dueCleared).toBe(true);
  });

  it("18. exports separated section rows for CSV and multi-sheet Excel", async () => {
    orderFindMany.mockResolvedValue([baseOrder]);
    const oldOrder = {
      ...baseOrder,
      id: 80,
      orderNumber: "ORD-EXP-OLD",
      createdAt: date("2026-08-01T09:00:00+05:30"),
      subtotal: 5_000,
      bill: { discount: 0, finalAmount: 5_000 },
      payments: [
        { id: 81, orderId: 80, amount: 2_000, paymentMode: "CASH", paymentDate: date("2026-08-21T11:00:00+05:30") },
      ],
    };
    paymentFindMany.mockResolvedValue([
      { ...baseOrder.payments[0], orderId: 1, order: baseOrder },
      { ...oldOrder.payments[0], order: oldOrder },
    ]);
    const report = await buildSalesReport({ type: "daily", date: "2026-08-21" });
    const rows = toSalesExportRows(report);
    expect(rows.map((row) => row.recordType)).toEqual(["SALE", "PREVIOUS_DUE_PAYMENT"]);
    expect(rows.map((row) => row.section)).toEqual(["SALES_DURING_PERIOD", "PREVIOUS_DUES_PAID"]);

    const periodRows = toPeriodSalesRows(report);
    const prevRows = toPreviousDuesRows(report);
    expect(periodRows).toHaveLength(1);
    expect(prevRows).toHaveLength(1);

    const csv = buildCsv(SALES_EXPORT_COLUMNS, rows);
    expect(csv).toContain("SALES_DURING_PERIOD");
    expect(csv).toContain("PREVIOUS_DUES_PAID");
    expect(csv).toContain("PREVIOUS_DUE_PAYMENT");

    const multiBuf = await buildMultiSheetXlsx([
      { name: "Sales During Period", columns: PERIOD_SALES_COLUMNS, rows: periodRows },
      { name: "Previous Dues Paid", columns: PREVIOUS_DUES_COLUMNS, rows: prevRows },
    ]);
    expect(multiBuf.byteLength).toBeGreaterThan(1000);
  });
});
