import { describe, expect, it } from "vitest";
import { normalizeSalesReport } from "./normalize";
import { salesPdf } from "./pdfReports";

const raw = { report: {
  reportType: "daily", periodLabel: "21 Aug 2026", generatedAt: "", generatedBy: "Admin",
  summary: { totalSales: 0, totalOrders: 0, outstandingAmount: 0 },
  collections: { totalCollected: 5000, currentPeriodSalesCollected: 0, olderSalesCollected: 5000 },
  orders: [],
  payments: [{ id: 1, orderNumber: "ORD-1025", customerName: "Rahul Kumar", customerMobile: "9999999999", orderCreatedAt: "2026-07-10T03:30:00.000Z", subtotal: 20000, originalBillAmount: 20000, paymentDate: "2026-08-21T04:30:00.000Z", amount: 5000, paymentMode: "CASH", previouslyPaidBeforePeriod: 8000, previouslyPaidBeforePayment: 8000, dueBeforePayment: 12000, totalPaidAfterPayment: 13000, remainingBalanceAfterPayment: 7000, paymentStatusAfterPayment: "PARTIALLY_PAID", saleCreatedInPeriod: false, salePeriodType: "OLDER_SALE_PREVIOUS_DUE", dueCleared: false, dueClearedAmount: null, dueClearedAt: null }],
  previousDuePayments: [{ id: 1, orderNumber: "ORD-1025", customerName: "Rahul Kumar", customerMobile: "9999999999", orderCreatedAt: "2026-07-10T03:30:00.000Z", subtotal: 20000, originalBillAmount: 20000, paymentDate: "2026-08-21T04:30:00.000Z", amount: 5000, paymentMode: "CASH", previouslyPaidBeforePeriod: 8000, previouslyPaidBeforePayment: 8000, dueBeforePayment: 12000, totalPaidAfterPayment: 13000, remainingBalanceAfterPayment: 7000, paymentStatusAfterPayment: "PARTIALLY_PAID", saleCreatedInPeriod: false, salePeriodType: "OLDER_SALE_PREVIOUS_DUE", dueCleared: false, dueClearedAmount: null, dueClearedAt: null }],
} };

describe("old-due report presentation", () => {
  it("normalizes the complete running debt context and previousDuePayments", () => {
    const report = normalizeSalesReport(raw);
    expect(report.previousDuePayments[0]).toMatchObject({
      originalBillAmount: 20000,
      previouslyPaidBeforePeriod: 8000,
      previouslyPaidBeforePayment: 8000,
      dueBeforePayment: 12000,
      totalPaidAfterPayment: 13000,
      remainingBalanceAfterPayment: 7000,
      paymentStatusAfterPayment: "PARTIALLY_PAID",
      salePeriodType: "OLDER_SALE_PREVIOUS_DUE",
    });
  });

  it("renders two distinct sections in the PDF", () => {
    const html = salesPdf(normalizeSalesReport(raw));
    expect(html).toContain("SECTION 1 — SALES DURING PERIOD");
    expect(html).toContain("SECTION 2 — PREVIOUS DUES PAID TODAY");
    expect(html).toContain("ORD-1025");
    expect(html).toContain("Rahul Kumar");
  });
});
