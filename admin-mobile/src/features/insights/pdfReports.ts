import { formatINR } from "@/utils/formatters";
import type { SalesPeriod, SalesReport } from "./types";
import { asArray, asNumber, asObject, asString } from "./normalize";

export const MAX_PDF_ROWS = 500;

/** Escape HTML entities to prevent XSS in generated PDF templates. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c]!)
  );
}

/** Sanitize string for safe filenames (no paths, slashes, or special chars). */
export function safeFilenamePart(input: unknown, fallback = "report"): string {
  const safe = String(input ?? "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return safe || fallback;
}

function formatDate(isoDate: unknown): string {
  if (!isoDate) return "—";
  const d = new Date(asString(isoDate));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function row(cells: string[]): string {
  return `<tr>${cells.map((x) => `<td>${x}</td>`).join("")}</tr>`;
}

function table(heads: string[], rows: string[]): string {
  return `
    <table>
      <thead>
        <tr>${heads.map((x) => `<th>${escapeHtml(x)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${
          rows.length
            ? rows.join("")
            : `<tr><td colspan="${heads.length}" class="empty">No matching records</td></tr>`
        }
      </tbody>
    </table>
  `;
}

function kpis(items: [string, string][]): string {
  return `
    <section class="kpis">
      ${items
        .map(
          ([k, v]) => `
        <div>
          <span>${escapeHtml(k)}</span>
          <strong>${v}</strong>
        </div>
      `
        )
        .join("")}
    </section>
  `;
}

function renderDocument(title: string, subtitle: string, bodyHtml: string): string {
  const generatedAt = formatDate(new Date().toISOString());
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: A4;
      margin: 14mm 10mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, "Noto Sans Devanagari", "Segoe UI", sans-serif;
      color: #0f172a;
      font-size: 10px;
      line-height: 1.4;
      margin: 0;
      padding: 0;
    }
    header {
      border-bottom: 3px solid #0f766e;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .company {
      font-size: 12px;
      font-weight: bold;
      color: #0f766e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    h1 {
      font-size: 20px;
      margin: 3px 0 2px;
      color: #0f172a;
    }
    .meta {
      color: #64748b;
      font-size: 9px;
    }
    h2 {
      font-size: 12px;
      margin: 16px 0 4px;
      color: #0f766e;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section-desc {
      color: #64748b;
      font-size: 8.5px;
      margin: 0 0 8px;
    }
    .kpis {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 8px 0 12px;
    }
    .kpis div {
      flex: 1;
      min-width: 110px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 8px;
      background: #f8fafc;
    }
    .kpis span {
      display: block;
      color: #64748b;
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .kpis strong {
      font-size: 11.5px;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    th {
      background: #f1f5f9;
      text-align: left;
      color: #334155;
      font-weight: 600;
      font-size: 8.5px;
      border: 1px solid #cbd5e1;
      padding: 5px 6px;
    }
    td {
      border: 1px solid #e2e8f0;
      padding: 5px 6px;
      vertical-align: top;
      font-size: 9px;
    }
    .text-right { text-align: right; }
    .empty { text-align: center; padding: 16px; color: #64748b; }
    .highlight { color: #047857; font-weight: bold; }
    .warn { color: #b45309; }
    .danger { color: #dc2626; font-weight: bold; }
    .success { color: #047857; font-weight: bold; }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8px;
      font-weight: bold;
    }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-warn { background: #fef3c7; color: #92400e; }
    footer {
      margin-top: 20px;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      color: #94a3b8;
      font-size: 8px;
      text-align: center;
    }
  </style>
</head>
<body>
  <header>
    <div class="company">M/S Sushant Construction</div>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">${escapeHtml(subtitle)} · Generated ${generatedAt}</div>
  </header>
  ${bodyHtml}
  <footer>Generated by Sushant Control System</footer>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Report Generators
// ---------------------------------------------------------------------------

/** Sales Report PDF (Daily, Weekly, Monthly) with complete 4 accounting sections matching the web client. */
export function salesPdf(report: SalesReport): string {
  const s = report.summary;
  const c = report.collections;
  const orders = report.orders;
  const oldDues =
    report.previousDuePayments && report.previousDuePayments.length > 0
      ? report.previousDuePayments
      : report.payments.filter((p) => !p.saleCreatedInPeriod);

  const periodTitle =
    report.reportType === "daily"
      ? "Daily"
      : report.reportType === "weekly"
      ? "Weekly"
      : "Monthly";

  const section1Kpis = kpis([
    ["Total Sales During Period", formatINR(asNumber(s.totalSales))],
    ["Orders Placed", String(asNumber(s.totalOrders))],
    ["Collected Against Sales", formatINR(asNumber(c.currentPeriodSalesCollected ?? c.totalCollected ?? s.totalCollected))],
    ["Outstanding On Sales", formatINR(asNumber(s.outstandingAmount))],
    ["Paid / Partial / Due Orders", `${asNumber(s.paidOrders)} / ${asNumber(s.partiallyPaidOrders)} / ${asNumber(s.dueOrders)}`],
  ]);

  const section1Table = table(
    [
      "Date & Time",
      "Order #",
      "Customer",
      "Items Purchased & Pricing",
      "Order / Payment Status",
      "Total",
      "Paid",
      "Remaining Due",
    ],
    orders.map((o) =>
      row([
        formatDate(o.createdAt),
        escapeHtml(o.orderNumber),
        `${escapeHtml(o.customerName)}<br><span class="meta">${escapeHtml(o.customerMobile)}</span>`,
        `<div style="min-width: 170px; line-height: 1.4;">
          ${(o.items ?? [])
            .map(
              (it) => `
            <div style="margin-bottom: 3px; padding-bottom: 2px; border-bottom: 1px dashed #e2e8f0;">
              <strong>${escapeHtml(it.productName)}</strong><br>
              <span style="color: #475569; font-size: 8px;">
                ${it.quantity} ${escapeHtml(it.unit)} &times; ${formatINR(it.price)} = <strong>${formatINR(it.total)}</strong>
              </span>
            </div>
          `
            )
            .join("")}
        </div>`,
        `${escapeHtml(o.status.replace(/_/g, " "))}<br><span class="meta">${escapeHtml(o.paymentStatus.replace(/_/g, " "))}</span>`,
        formatINR(o.finalAmount),
        formatINR(o.totalPaid),
        formatINR(o.remainingDue),
      ])
    )
  );

  const section2Title =
    report.reportType === "daily"
      ? "SECTION 2 — PREVIOUS DUES PAID TODAY"
      : report.reportType === "weekly"
      ? "SECTION 2 — PREVIOUS DUES PAID DURING SELECTED WEEK"
      : "SECTION 2 — PREVIOUS DUES PAID DURING SELECTED MONTH";

  const section2Kpis = kpis([
    ["Total Old Dues Collected", formatINR(asNumber(c.olderSalesCollected))],
    ["Total Collections In Period", formatINR(asNumber(c.totalCollected))],
    ["Due Cleared Amount", formatINR(asNumber(c.dueClearedAmount))],
    ["Old Orders Cleared", `${asNumber(c.dueClearedCount)} orders`],
  ]);

  const section2Table = table(
    [
      "Payment Date",
      "Customer / Mobile",
      "Order #",
      "Original Sale Date",
      "Original Bill",
      "Paid Before Payment",
      "Due Before Payment",
      "Paid In Period",
      "Total Paid After",
      "Remaining Due",
      "Mode",
      "Status / Due Cleared",
    ],
    oldDues.map((p) =>
      row([
        formatDate(p.paymentDate),
        `${escapeHtml(p.customerName)}<br><span class="meta">${escapeHtml(p.customerMobile)}</span>`,
        escapeHtml(p.orderNumber),
        formatDate(p.orderCreatedAt),
        formatINR(p.originalBillAmount),
        formatINR(p.previouslyPaidBeforePayment),
        `<span class="warn">${formatINR(p.dueBeforePayment)}</span>`,
        `<strong class="highlight">${formatINR(p.amount)}</strong>`,
        formatINR(p.totalPaidAfterPayment),
        `<strong class="${p.remainingBalanceAfterPayment > 0 ? "danger" : "success"}">${formatINR(p.remainingBalanceAfterPayment)}</strong>`,
        escapeHtml(p.paymentMode),
        `<span class="badge ${p.dueCleared ? "badge-success" : "badge-warn"}">${p.dueCleared ? "DUE CLEARED" : "PARTIAL / DUE REMAINING"}</span>`,
      ])
    )
  );

  const productSales = report.productSales ?? [];
  const section3Table = table(
    [
      "Product Name",
      "Category",
      "Quantity Sold (This Period)",
      "Total Revenue Generated (₹)",
      "Orders Count",
      "Current Stock Left",
    ],
    productSales.length > 0
      ? productSales.map((p) =>
          row([
            `<strong>${escapeHtml(p.productName)}</strong>`,
            escapeHtml(p.category ?? "General"),
            `<strong style="color:#0f766e;">${p.totalQuantitySold} ${escapeHtml(p.unit)}</strong>`,
            `<strong class="highlight">${formatINR(p.totalRevenue)}</strong>`,
            `${p.orderCount} orders`,
            `<strong>${p.currentStock} ${escapeHtml(p.unit)}</strong>`,
          ])
        )
      : []
  );

  const currentInventory = report.currentInventory ?? [];
  const section4Table = table(
    [
      "Product Name",
      "Category",
      "Current Stock Remaining",
      "Stock Status",
      "Selling Price (₹)",
      "MRP (₹)",
    ],
    currentInventory.length > 0
      ? currentInventory.map((p) => {
          const isOut = p.currentStock <= 0;
          const isLow = p.currentStock > 0 && p.currentStock <= 10;
          const statusBadge = isOut
            ? '<span class="badge" style="background:#fee2e2;color:#991b1b;">OUT OF STOCK</span>'
            : isLow
            ? '<span class="badge" style="background:#fef3c7;color:#92400e;">LOW STOCK</span>'
            : '<span class="badge" style="background:#d1fae5;color:#065f46;">IN STOCK</span>';

          return row([
            `<strong>${escapeHtml(p.productName)}</strong>`,
            escapeHtml(p.category ?? "General"),
            `<strong style="color:${isOut ? "#dc2626" : isLow ? "#b45309" : "#0f172a"}; font-size:10px;">${p.currentStock} ${escapeHtml(p.unit)}</strong>`,
            statusBadge,
            formatINR(p.price),
            formatINR(p.mrp),
          ]);
        })
      : []
  );

  const body = `
    <h2>SECTION 1 — SALES DURING PERIOD & ITEMS PURCHASED</h2>
    ${section1Kpis}
    ${section1Table}

    <h2>${section2Title}</h2>
    <p class="section-desc">Payments received during this period against sales created before ${escapeHtml(report.periodLabel)}. These payments settle older debt and do not increase period sales.</p>
    ${section2Kpis}
    ${section2Table}

    <h2>SECTION 3 — PRODUCT-WISE SALES SUMMARY (THIS PERIOD)</h2>
    <p class="section-desc">Total quantities and revenue generated per product during the selected period.</p>
    ${section3Table}

    <h2>SECTION 4 — CURRENT WAREHOUSE STOCK INVENTORY (REMAINING STOCK)</h2>
    <p class="section-desc">Live warehouse stock balance remaining for each material/product as of report generation.</p>
    ${section4Table}
  `;

  return renderDocument(`${periodTitle} Sales Report`, report.periodLabel, body);
}

/** Customer Due Report PDF */
export function duePdf(raw: unknown, searchFilter = ""): string {
  const r = asObject(raw);
  const summary = asObject(r.summary);
  const customers = asArray(r.customers);

  const headerKpis = kpis([
    ["Total Customers", String(asNumber(summary.totalCustomers))],
    ["Total Pending Due", formatINR(asNumber(summary.totalPendingDue))],
    ["Search Filter", searchFilter || "All Customers"],
  ]);

  const dueTable = table(
    ["Customer Name", "Phone", "Address", "Total Orders", "Total Purchase", "Total Paid", "Remaining Due", "Last Payment Date"],
    customers.map((x) => {
      const c = asObject(x);
      return row([
        escapeHtml(c.customerName),
        escapeHtml(c.customerMobile),
        escapeHtml(c.address || "—"),
        String(asNumber(c.totalOrders)),
        formatINR(asNumber(c.totalPurchase)),
        formatINR(asNumber(c.totalPaid)),
        `<strong class="danger">${formatINR(asNumber(c.remainingDue))}</strong>`,
        c.lastPaymentDate ? formatDate(c.lastPaymentDate) : "—",
      ]);
    })
  );

  const body = `
    ${headerKpis}
    <h2>Customer Dues Detail</h2>
    ${dueTable}
  `;

  return renderDocument("Customer Due Report", searchFilter ? `Filter: ${searchFilter}` : "All Customers", body);
}

/** Customer Statement PDF */
export function statementPdf(raw: unknown): string {
  const r = asObject(raw);
  const c = asObject(r.customer);
  const ledger = asArray(r.ledger);

  const headerKpis = kpis([
    ["Customer Name", asString(c.customerName)],
    ["Mobile Number", asString(c.customerMobile)],
    ["Total Purchase", formatINR(asNumber(c.totalPurchase))],
    ["Total Paid", formatINR(asNumber(c.totalPaid))],
    ["Remaining Balance", formatINR(asNumber(c.totalDue))],
    ["Total Orders", String(asNumber(c.totalOrders))],
  ]);

  const ledgerTable = table(
    ["Date", "Order #", "Type / Mode", "Debit", "Credit", "Balance"],
    ledger.map((x) => {
      const e = asObject(x);
      return row([
        formatDate(e.date),
        escapeHtml(e.orderNumber),
        e.type === "ORDER"
          ? `<span class="badge badge-warn">ORDER</span>`
          : `<span class="badge badge-success">${escapeHtml(e.mode ?? "PAYMENT")}</span>`,
        e.debit ? formatINR(asNumber(e.debit)) : "—",
        e.credit ? `<strong class="highlight">${formatINR(asNumber(e.credit))}</strong>` : "—",
        `<strong>${formatINR(asNumber(e.balance))}</strong>`,
      ]);
    })
  );

  const body = `
    ${headerKpis}
    <h2>Complete Customer Ledger</h2>
    ${ledgerTable}
  `;

  return renderDocument("Customer Statement", `${asString(c.customerName)} (${asString(c.customerMobile)})`, body);
}

/** Product History PDF */
export function productPdf(raw: unknown): string {
  const r = asObject(raw);
  const p = asObject(r.product);
  const s = asObject(r.stats);
  const orders = asArray(r.recentOrders);

  const unit = asString(p.unit) || "unit";
  const headerKpis = kpis([
    ["Product Name", asString(p.name)],
    ["Category", asString(p.category) || "Uncategorized"],
    ["Current Stock", `${asNumber(p.stock)} ${unit}`],
    ["Total Quantity Sold", String(asNumber(s.totalQuantitySold))],
    ["Total Revenue", formatINR(asNumber(s.revenue))],
    ["Unique Customers", String(asNumber(s.customersPurchased))],
    ["Avg Selling Price", formatINR(asNumber(s.averageSellingPrice))],
  ]);

  const ordersTable = table(
    ["Date & Time", "Order #", "Customer", "Quantity", "Avg Rate", "Total Amount", "Status"],
    orders.map((x) => {
      const o = asObject(x);
      const qty = asNumber(o.quantity) || 1;
      const total = asNumber(o.total);
      return row([
        formatDate(o.createdAt),
        escapeHtml(o.orderNumber),
        escapeHtml(o.customerName),
        `${qty} ${unit}`,
        formatINR(total / qty),
        `<strong class="highlight">${formatINR(total)}</strong>`,
        escapeHtml(asString(o.status).replace(/_/g, " ")),
      ]);
    })
  );

  const body = `
    ${headerKpis}
    <h2>Recent Product Sales</h2>
    ${ordersTable}
  `;

  return renderDocument("Product History Report", `${asString(p.name)} (${asString(p.category) || "Uncategorized"})`, body);
}

export const titleForPeriod = (period: SalesPeriod) => period[0].toUpperCase() + period.slice(1);

export function salesPdfFilename(period: SalesPeriod, query: string): string {
  const q = new URLSearchParams(query);
  if (period === "daily") return `sales-daily-${safeFilenamePart(q.get("date"), "date")}.pdf`;
  if (period === "weekly") return `sales-weekly-${safeFilenamePart(q.get("from"), "from")}-to-${safeFilenamePart(q.get("to"), "to")}.pdf`;
  return `sales-monthly-${safeFilenamePart(`${q.get("year")}-${String(q.get("month") || "").padStart(2, "0")}`, "period")}.pdf`;
}

export const duePdfFilename = (stamp = new Date()) => `customer-due-report-${stamp.toISOString().slice(0, 10)}.pdf`;
export const statementPdfFilename = (mobile: unknown) => `customer-statement-${safeFilenamePart(mobile, "customer")}.pdf`;
export const productPdfFilename = (id: unknown) => `product-history-${safeFilenamePart(id, "product")}.pdf`;
