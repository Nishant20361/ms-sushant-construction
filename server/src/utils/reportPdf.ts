/**
 * Sales Report PDF generator.
 *
 * Builds a professional, multi-page PDF (no page limit) for a SalesReportData
 * object by rendering responsive HTML via the shared Puppeteer/Chromium
 * browser (reused from the bill PDF utility). Devanagari + ₹ symbols are
 * preserved via embedded fonts. Page numbers are added by Puppeteer's
 * print CSS (footer/header templates).
 */

import { prisma } from "../db.js";
import {
  getBrowser,
  getEmbeddedFontCss,
  fmtINR,
  fmtDateShort,
} from "./bill.js";
import type { SalesReportData } from "./report.js";

const REPORT_TITLES: Record<string, string> = {
  daily: "Daily Sales Report",
  weekly: "Weekly Sales Report",
  monthly: "Monthly Sales Report",
};

function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/\x26/g, "\x26amp;")
    .replace(/</g, "\x3c")
    .replace(/>/g, "\x3e")
    .replace(/"/g, "\x26quot;")
    .replace(/'/g, "\x26#39;");
}

function shortDate(iso: string): string {
  return fmtDateShort(new Date(iso));
}

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
    PENDING: "pending",
    CONFIRMED: "confirmed",
    PROCESSING: "processing",
    OUT_FOR_DELIVERY: "out",
  };
  return `<span class="badge ${map[status] ?? ""}">${escapeHtml(status)}</span>`;
}

function paymentBadge(status: string): string {
  const map: Record<string, string> = {
    PAID: "p-paid",
    PARTIALLY_PAID: "p-partial",
    DUE: "p-due",
  };
  return `<span class="badge ${map[status] ?? ""}">${
    status === "PARTIALLY_PAID" ? "PARTIALLY PAID" : escapeHtml(status)
  }</span>`;
}

/** Build the full HTML report (print-optimised, auto-paginated). */
export async function buildReportHtml(report: SalesReportData): Promise<string> {
  const settings = await prisma.siteSetting.findFirst();
  const biz: any = settings ?? {};

  const companyName = biz.companyName || "M/S Sushant Construction";
  const bizName = biz.businessName || companyName;
  const bizAddr = biz.businessAddress || "";
  const gst = biz.gstNumber || "";
  const phone = biz.businessMobile || "";
  const email = biz.businessEmail || "";
  const logo = biz.businessLogoUrl || "";

  const title = REPORT_TITLES[report.reportType] ?? "Sales Report";
  const generatedAt = new Date(report.generatedAt).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const s = report.summary;

  const summaryRows = [
    { label: "Total Sales", value: fmtINR(s.totalSales) },
    { label: "Cash Collection", value: fmtINR(s.cashCollection) },
    { label: "Online Collection", value: fmtINR(s.onlineCollection) },
    { label: "Due Collection", value: fmtINR(s.dueCollection) },
    { label: "Remaining Due", value: fmtINR(s.remainingDue) },
    { label: "Discount Given", value: fmtINR(s.totalDiscount) },
    { label: "Delivered Orders", value: String(s.deliveredOrders) },
    { label: "Customers Served", value: String(s.uniqueCustomers) },
    { label: "Products Sold", value: String(s.productsSold) },
  ];

  const summaryCells = summaryRows
    .map(
      (r) => `<div class="summary-cell">
        <div class="summary-label">${escapeHtml(r.label)}</div>
        <div class="summary-value">${escapeHtml(r.value)}</div>
      </div>`
    )
    .join("");

  // ---- Order blocks ----
  const orderBlocks =
    report.orders.length === 0
      ? `<div class="empty">No orders found in this period.</div>`
      : report.orders
          .map((o) => {
            const deliveryDate =
              o.status === "DELIVERED" ? shortDate(o.createdAt) : "N/A";
            const itemRows = o.items
              .map(
                (it) => `
                  <tr>
                    <td>
                      <div class="prod">
                        ${
                          it.imageUrl
                            ? `<img src="${escapeHtml(it.imageUrl)}" alt="" class="thumb" />`
                            : `<div class="thumb thumb-empty"></div>`
                        }
                        <div>
                          <div class="prod-name">${escapeHtml(it.productName)}</div>
                          <div class="prod-cat">${escapeHtml(it.category ?? "—")}</div>
                        </div>
                      </div>
                    </td>
                    <td class="num">${escapeHtml(String(it.quantity))}</td>
                    <td class="num">${escapeHtml(it.unit)}</td>
                    <td class="num">${fmtINR(it.price)}</td>
                    <td class="num">${fmtINR(it.total)}</td>
                  </tr>`
              )
              .join("");

            return `
              <div class="order">
                <div class="order-head">
                  <div class="order-left">
                    <div class="order-number">${escapeHtml(o.orderNumber)}</div>
                    <div class="order-meta">${escapeHtml(o.customerName)} · ${escapeHtml(
                      o.customerMobile
                    )}</div>
                    <div class="order-meta">${escapeHtml(o.deliveryAddress || "No address")}</div>
                  </div>
                  <div class="order-right">
                    <div>${statusBadge(o.status)} ${paymentBadge(o.paymentStatus)}</div>
                    <div class="order-meta">Order Date: ${shortDate(o.createdAt)} · Delivery: ${escapeHtml(
                      deliveryDate
                    )}</div>
                  </div>
                </div>

                <table class="items">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th class="num">Qty</th>
                      <th class="num">Unit</th>
                      <th class="num">Rate</th>
                      <th class="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>${itemRows}</tbody>
                </table>

                <div class="order-foot">
                  <div class="pay-grid">
                    <div><span>Cash Paid</span><b>${fmtINR(o.cashPaid)}</b></div>
                    <div><span>Online Paid</span><b>${fmtINR(o.onlinePaid)}</b></div>
                    <div><span>Due Paid</span><b>${fmtINR(o.duePaid)}</b></div>
                    <div><span>Remaining Due</span><b>${fmtINR(o.remainingDue)}</b></div>
                    <div><span>Discount</span><b>${fmtINR(o.discount)}</b></div>
                    <div><span>Final Amount</span><b>${fmtINR(o.finalAmount)}</b></div>
                  </div>
                </div>
              </div>`;
          })
          .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<style>
  ${getEmbeddedFontCss()}
  @page {
    size: A4;
    margin: 12mm 10mm 14mm 10mm;
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Noto Sans Devanagari', 'Noto Sans', 'Segoe UI', Arial, sans-serif;
    color: #1e293b; margin: 0; padding: 0; font-size: 12px;
  }

  /* Header */
  .report-header {
    display: flex; align-items: center; gap: 14px;
    border-bottom: 3px solid #0f766e;
    padding-bottom: 12px; margin-bottom: 14px;
  }
  .report-header img.logo { height: 60px; width: 60px; object-fit: contain; }
  .report-header .logo-empty {
    height: 60px; width: 60px; border-radius: 8px; background: #0f766e;
    color: #fff; display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 22px;
  }
  .report-header .company h1 { margin: 0; font-size: 20px; color: #0f172a; }
  .report-header .company .sub { color: #64748b; font-size: 12px; margin-top: 2px; }

  .report-title {
    text-align: center; background: #0f766e; color: #fff;
    padding: 8px 12px; border-radius: 8px; font-size: 16px; font-weight: 700;
    letter-spacing: 0.4px; margin-bottom: 12px;
  }
  .report-meta {
    display: flex; flex-wrap: wrap; gap: 8px 24px; font-size: 12px;
    color: #334155; margin-bottom: 14px;
  }
  .report-meta b { color: #0f172a; }

  /* Summary */
  .summary {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
    margin-bottom: 18px;
  }
  .summary-cell {
    border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px;
    background: #f8fafc;
  }
  .summary-label { font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.3px; }
  .summary-value { font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px; }

  .section-title {
    font-size: 13px; font-weight: 700; color: #0f172a;
    text-transform: uppercase; letter-spacing: 0.4px;
    border-left: 4px solid #0f766e; padding-left: 8px; margin: 16px 0 8px;
  }

  /* Orders */
  .order {
    border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 14px;
    overflow: hidden; page-break-inside: auto;
  }
  .order-head {
    display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    background: #f1f5f9; padding: 8px 12px;
  }
  .order-number { font-weight: 700; color: #0f172a; font-size: 13px; }
  .order-meta { color: #475569; font-size: 11px; margin-top: 2px; }
  .order-right { text-align: right; }

  .badge {
    display: inline-block; padding: 2px 8px; border-radius: 999px;
    font-size: 10px; font-weight: 700; margin-right: 4px;
  }
  .badge.pending { background: #fef3c7; color: #b45309; }
  .badge.confirmed { background: #dbeafe; color: #1d4ed8; }
  .badge.processing { background: #ede9fe; color: #6d28d9; }
  .badge.out { background: #e0e7ff; color: #4338ca; }
  .badge.delivered { background: #dcfce7; color: #15803d; }
  .badge.cancelled { background: #fee2e2; color: #b91c1c; }
  .badge.p-paid { background: #dcfce7; color: #15803d; }
  .badge.p-partial { background: #fef3c7; color: #b45309; }
  .badge.p-due { background: #fee2e2; color: #b91c1c; }

  table.items { width: 100%; border-collapse: collapse; }
  table.items th, table.items td {
    padding: 6px 10px; text-align: left; font-size: 11px;
    border-bottom: 1px solid #f1f5f9;
  }
  table.items thead th { background: #0f172a; color: #e2e8f0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
  .num { text-align: right; }
  .prod { display: flex; align-items: center; gap: 8px; }
  .thumb { width: 34px; height: 34px; border-radius: 6px; object-fit: cover; background: #f1f5f9; }
  .thumb-empty { background: #e2e8f0; }
  .prod-name { font-weight: 600; color: #0f172a; }
  .prod-cat { color: #64748b; font-size: 10px; }

  .order-foot { padding: 8px 12px; background: #f8fafc; }
  .pay-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px 16px; }
  .pay-grid div { display: flex; justify-content: space-between; font-size: 11px; }
  .pay-grid span { color: #64748b; }
  .pay-grid b { color: #0f172a; }

  .empty { text-align: center; color: #64748b; padding: 30px 0; }

  /* Footer (static) */
  .report-footer {
    margin-top: 20px; border-top: 2px solid #e2e8f0; padding-top: 8px;
    text-align: center; color: #64748b; font-size: 11px;
  }

  /* Print footer via @page counter (Puppeteer headerTemplate/footerTemplate
     add page numbers — see generateReportPdf below). */
</style>
</head>
<body>
  <div class="report-header">
    ${
      logo
        ? `<img class="logo" src="${escapeHtml(logo)}" alt="logo" />`
        : `<div class="logo-empty">${escapeHtml((companyName[0] || "M").toUpperCase())}</div>`
    }
    <div class="company">
      <h1>${escapeHtml(bizName)}</h1>
      <div class="sub">
        ${bizAddr ? `${escapeHtml(bizAddr)}` : ""}
        ${bizAddr && (gst || phone || email) ? " · " : ""}
        ${gst ? `GST: ${escapeHtml(gst)}` : ""}
        ${phone ? ` · ${escapeHtml(phone)}` : ""}
        ${email ? ` · ${escapeHtml(email)}` : ""}
      </div>
    </div>
  </div>

  <div class="report-title">${escapeHtml(title)}</div>

  <div class="report-meta">
    <span><b>Report Period:</b> ${escapeHtml(report.periodLabel)}</span>
    <span><b>Generated Time:</b> ${escapeHtml(generatedAt)}</span>
    <span><b>Generated By:</b> Admin</span>
  </div>

  <div class="section-title">Summary</div>
  <div class="summary">${summaryCells}</div>

  <div class="section-title">Orders (${report.orders.length}) · Delivered orders shown in sales totals</div>
  ${orderBlocks}

  <div class="report-footer">
    Generated by ${escapeHtml(companyName)} · ${escapeHtml(generatedAt)}
  </div>
</body>
</html>`;
}

/**
 * Generate a professional multi-page PDF buffer for a sales report. No page
 * limit — Puppeteer/Chromium paginates automatically. Adds page numbers via
 * the print header/footer templates.
 */
export async function buildReportPdf(report: SalesReportData): Promise<Buffer> {
  const html = await buildReportHtml(report);
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => (globalThis as any).document?.fonts?.ready);
    await page.emulateMediaType("print");
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:8px;color:#94a3b8;width:100%;padding:0 10mm;text-align:right;">${escapeHtml(
        REPORT_TITLES[report.reportType] ?? "Sales Report"
      )}</div>`,
      footerTemplate: `<div style="font-size:8px;color:#94a3b8;width:100%;padding:0 10mm;display:flex;justify-content:space-between;"><span></span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
      margin: { top: "14mm", bottom: "16mm", left: "10mm", right: "10mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => undefined);
  }
}
