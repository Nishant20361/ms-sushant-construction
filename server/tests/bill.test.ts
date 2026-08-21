import { describe, expect, it } from "vitest";
import { buildBillHtml, type BillData } from "../src/utils/bill.js";

const bill: BillData = {
  companyName: "M/S Sushant Construction", tagline: "भरोसेमंद निर्माण सामग्री", orderNumber: "ORD-10",
  customerName: "Asha", customerMobile: "9999999999", deliveryAddress: "Patna", createdAt: "2026-08-21T00:00:00Z",
  status: "CONFIRMED", items: [{ productName: "Cement", quantity: 2, unit: "bag", price: 400, total: 800 }],
  subtotal: 800, discount: 50, finalAmount: 750, cashPaid: 500, onlinePaid: 0, totalPaid: 500, due: 250,
  paymentStatus: "PARTIALLY_PAID", businessName: "Sushant", businessAddress: "Patna", gstNumber: "GST123",
  businessMobile: "9999999999", businessEmail: "admin@example.com", businessLogoUrl: "https://example.com/logo.png",
};

describe("compact invoice HTML", () => {
  it("uses compact print dimensions without clipping rows or totals", () => {
    const html = buildBillHtml(bill);
    expect(html).toContain("@page { size: A4 portrait; margin: 7mm; }");
    expect(html).toContain("max-width: 158mm");
    expect(html).toContain("tbody tr { border-bottom");
    expect(html).toContain("page-break-inside: avoid");
    expect(html).not.toContain("overflow: hidden; height:");
  });

  it("keeps invoice, payment, GST, logo, and Devanagari content", () => {
    const html = buildBillHtml(bill);
    for (const value of ["ORD-10", "Cement", "GST123", "Payment Details", "Remaining Due", "logo.png", "भरोसेमंद निर्माण सामग्री"]) expect(html).toContain(value);
    expect(html).toContain('<div class="row due">');
    expect(html).toContain('<p class="discount">');
  });
});
