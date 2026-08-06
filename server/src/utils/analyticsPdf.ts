/**
 * Phase 2 – Analytics PDF generator.
 *
 * Reuses the shared Puppeteer browser + embedded fonts from bill.ts to build
 * professional, multi-page PDFs (no page limit) for customer statements and
 * due reports. Page numbers added via Puppeteer print header/footer templates.
 */

import { prisma } from "../db.js";
import { getBrowser, getEmbeddedFontCss, fmtINR, fmtDateShort } from "./bill.js";

function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/\x26/g, "\x26amp;")
    .replace(/</g, "\x3c")
    .replace(/>/g, "\x3e")
    .replace(/"/g, "\x26quot;")
    .replace(/'/g, "\x26#39;");
}

async function getBusinessHeader() {
  const settings = await prisma.siteSetting.findFirst();
  const biz: any = settings ?? {};
  const companyName = biz.companyName || "M/S Sushant Construction";
  const bizName = biz.businessName || companyName;
  return {
    companyName,
    bizName: bizName as string,
    bizAddr: (biz.businessAddress || "") as string,
    gst: (biz.gstNumber || "") as string,
    phone: (biz.businessMobile || "") as string,
    email: (biz.businessEmail || "") as string,
    logo: (biz.businessLogoUrl || "") as string,
  };
}

/**
 * Build a customer statement PDF (complete ledger + all orders + remaining
 * balance). Unlimited pages.
 */
export async function buildCustomerStatementPdf(statement: any): Promise<Buffer> {
  const biz = await getBusinessHeader();
  const c = statement.customer;

  const ledgerRows = statement.ledger
    .map((e: any) => {
      const kind = e.type === "ORDER" ? "ORDER" : "PAYMENT";
      return `<tr>
        <td>${escapeHtml(fmtDateShort(e.date))}</td>
        <td>${escapeHtml(e.orderNumber)}</td>
        <td>${kind === "ORDER" ? '<span class="b-orange">ORDER</span>' : `<span class="b-green">${escapeHtml(e.mode ?? "PAYMENT")}</span>`}</td>
        <td>${e.debit ? fmtINR(e.debit) : "—"}</td>
        <td>${e.credit ? fmtINR(e.credit) : "—"}</td>
        <td class="num">${fmtINR(e.balance)}</td>
      </tr>`;
    })
    .join("");

  const orderBlocks = statement.orders
    .map((o: any) => {
      const itemRows = o.items
        .map(
          (it: any) => `<tr>
            <td>${escapeHtml(it.productName)}</td>
            <td class="num">${escapeHtml(String(it.quantity))} ${escapeHtml(it.unit)}</td>
            <td class="num">${fmtINR(it.price)}</td>
            <td class="num">${fmtINR(it.total)}</td>
          </tr>`
        )
        .join("");
      return `<div class="order">
        <div class="order-head">
          <span><b>${escapeHtml(o.orderNumber)}</b> · ${escapeHtml(fmtDateShort(o.createdAt))}</span>
          <span>Final: ${fmtINR(o.finalAmount)} · Paid: ${fmtINR(o.paid)} · Due: <b class="${o.due > 0 ? "red" : "green"}">${fmtINR(o.due)}</b></span>
        </div>
        <table class="items">
          <thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Total</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Customer Statement</title>
<style>
  ${getEmbeddedFontCss()}
  @page { size: A4; margin: 12mm 10mm 14mm 10mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Noto Sans Devanagari', 'Noto Sans', 'Segoe UI', Arial, sans-serif;
    color: #1e293b; margin: 0; padding: 0; font-size: 12px;
  }
  .head { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #0f766e; padding-bottom: 12px; margin-bottom: 14px; }
  .head img.logo { height: 60px; width: 60px; object-fit: contain; }
  .head .logo-empty { height: 60px; width: 60px; border-radius: 8px; background: #0f766e; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 22px; }
  .head .co h1 { margin: 0; font-size: 20px; color: #0f172a; }
  .head .co .sub { color: #64748b; font-size: 12px; margin-top: 2px; }
  .title { text-align: center; background: #0f766e; color: #fff; padding: 8px 12px; border-radius: 8px; font-size: 16px; font-weight: 700; margin-bottom: 12px; }
  .cust-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
  .cell { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; background: #f8fafc; }
  .cell .lbl { font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.3px; }
  .cell .val { font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px; }
  .cell .val.red { color: #b91c1c; }
  .cell .val.green { color: #15803d; }
  .section { font-size: 13px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.4px; border-left: 4px solid #0f766e; padding-left: 8px; margin: 16px 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  table th, table td { padding: 6px 8px; text-align: left; font-size: 11px; border-bottom: 1px solid #f1f5f9; }
  table thead th { background: #0f172a; color: #e2e8f0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
  .num { text-align: right; }
  .b-orange { background: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
  .b-green { background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
  .red { color: #b91c1c; }
  .green { color: #15803d; }
  .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
  .order { border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; overflow: hidden; page-break-inside: auto; }
  .order-head { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; background: #f1f5f9; padding: 8px 12px; }
  .footer { margin-top: 20px; border-top: 2px solid #e2e8f0; padding-top: 8px; text-align: center; color: #64748b; font-size: 11px; }
</style>
</head>
<body>
  <div class="head">
    ${biz.logo ? `<img class="logo" src="${escapeHtml(biz.logo)}" alt="logo"/>` : `<div class="logo-empty">${escapeHtml((biz.bizName[0] || "M").toUpperCase())}</div>`}
    <div class="co">
      <h1>${escapeHtml(biz.bizName)}</h1>
      <div class="sub">
        ${biz.bizAddr ? escapeHtml(biz.bizAddr) : ""}
        ${biz.bizAddr && (biz.gst || biz.phone) ? " · " : ""}
        ${biz.gst ? `GST: ${escapeHtml(biz.gst)}` : ""}
        ${biz.phone ? ` · ${escapeHtml(biz.phone)}` : ""}
      </div>
    </div>
  </div>

  <div class="title">Customer Statement</div>

  <div class="cust-grid">
    <div class="cell"><div class="lbl">Customer</div><div class="val">${escapeHtml(c.customerName)}</div></div>
    <div class="cell"><div class="lbl">Mobile</div><div class="val">${escapeHtml(c.customerMobile)}</div></div>
    <div class="cell"><div class="lbl">Address</div><div class="val">${escapeHtml(c.address || "—")}</div></div>
    <div class="cell"><div class="lbl">Customer Since</div><div class="val">${escapeHtml(fmtDateShort(c.customerSince))}</div></div>
  </div>

  <div class="summary-grid">
    <div class="cell"><div class="lbl">Total Orders</div><div class="val">${c.totalOrders}</div></div>
    <div class="cell"><div class="lbl">Total Purchase</div><div class="val">${fmtINR(c.totalPurchase)}</div></div>
    <div class="cell"><div class="lbl">Total Paid</div><div class="val green">${fmtINR(c.totalPaid)}</div></div>
    <div class="cell"><div class="lbl">Remaining Balance</div><div class="val ${c.totalDue > 0 ? "red" : "green"}">${fmtINR(c.totalDue)}</div></div>
  </div>

  <div class="section">Complete Ledger (${statement.ledger.length})</div>
  <table>
    <thead>
      <tr><th>Date</th><th>Order</th><th>Type</th><th>Debit</th><th>Credit</th><th class="num">Balance</th></tr>
    </thead>
    <tbody>${ledgerRows}</tbody>
  </table>

  <div class="section">All Orders (${statement.orders.length})</div>
  ${orderBlocks}

  <div class="footer">Generated by ${escapeHtml(biz.bizName)} · ${escapeHtml(new Date().toLocaleString("en-IN"))}</div>
</body>
</html>`;

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
      headerTemplate: `<div style="font-size:8px;color:#94a3b8;width:100%;padding:0 10mm;text-align:right;">Customer Statement</div>`,
      footerTemplate: `<div style="font-size:8px;color:#94a3b8;width:100%;padding:0 10mm;display:flex;justify-content:space-between;"><span></span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
      margin: { top: "14mm", bottom: "16mm", left: "10mm", right: "10mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => undefined);
  }
}

/**
 * Build a customer due report PDF (searchable due list). Unlimited pages.
 */
export async function buildDueReportPdf(report: any): Promise<Buffer> {
  const biz = await getBusinessHeader();

  const rows = report.customers
    .map(
      (c: any) => `<tr>
        <td>${escapeHtml(c.customerName)}</td>
        <td>${escapeHtml(c.customerMobile)}</td>
        <td>${escapeHtml(c.address || "—")}</td>
        <td class="num">${c.totalOrders}</td>
        <td class="num">${fmtINR(c.totalPurchase)}</td>
        <td class="num">${fmtINR(c.totalPaid)}</td>
        <td class="num"><b class="red">${fmtINR(c.remainingDue)}</b></td>
        <td>${c.lastPaymentDate ? escapeHtml(fmtDateShort(c.lastPaymentDate)) : "—"}</td>
        <td>${c.oldestDueDate ? escapeHtml(fmtDateShort(c.oldestDueDate)) : "—"}</td>
        <td>${c.newestDueDate ? escapeHtml(fmtDateShort(c.newestDueDate)) : "—"}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Customer Due Report</title>
<style>
  ${getEmbeddedFontCss()}
  @page { size: A4 landscape; margin: 12mm 10mm 14mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Noto Sans Devanagari', 'Noto Sans', 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; font-size: 11px; }
  .head { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #0f766e; padding-bottom: 12px; margin-bottom: 14px; }
  .head img.logo { height: 60px; width: 60px; object-fit: contain; }
  .head .logo-empty { height: 60px; width: 60px; border-radius: 8px; background: #0f766e; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 22px; }
  .head .co h1 { margin: 0; font-size: 20px; color: #0f172a; }
  .head .co .sub { color: #64748b; font-size: 12px; margin-top: 2px; }
  .title { text-align: center; background: #0f766e; color: #fff; padding: 8px 12px; border-radius: 8px; font-size: 16px; font-weight: 700; margin-bottom: 12px; }
  .meta { display: flex; gap: 24px; font-size: 12px; color: #334155; margin-bottom: 12px; }
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
  .cell { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; background: #f8fafc; }
  .cell .lbl { font-size: 10px; text-transform: uppercase; color: #64748b; }
  .cell .val { font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px; }
  .cell .val.red { color: #b91c1c; }
  table { width: 100%; border-collapse: collapse; }
  table th, table td { padding: 6px 8px; text-align: left; font-size: 10px; border-bottom: 1px solid #f1f5f9; }
  table thead th { background: #0f172a; color: #e2e8f0; font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; }
  .num { text-align: right; }
  .red { color: #b91c1c; }
  .footer { margin-top: 20px; border-top: 2px solid #e2e8f0; padding-top: 8px; text-align: center; color: #64748b; font-size: 11px; }
</style>
</head>
<body>
  <div class="head">
    ${biz.logo ? `<img class="logo" src="${escapeHtml(biz.logo)}" alt="logo"/>` : `<div class="logo-empty">${escapeHtml((biz.bizName[0] || "M").toUpperCase())}</div>`}
    <div class="co">
      <h1>${escapeHtml(biz.bizName)}</h1>
      <div class="sub">${biz.bizAddr ? escapeHtml(biz.bizAddr) : ""}${biz.gst ? ` · GST: ${escapeHtml(biz.gst)}` : ""}</div>
    </div>
  </div>
  <div class="title">Customer Due Report</div>
  <div class="meta">
    <span><b>Generated:</b> ${escapeHtml(new Date().toLocaleString("en-IN"))}</span>
    <span><b>Customers:</b> ${report.summary.totalCustomers}</span>
    <span><b>Total Pending Due:</b> ${fmtINR(report.summary.totalPendingDue)}</span>
  </div>
  <div class="section-title" style="font-size:13px;font-weight:700;border-left:4px solid #0f766e;padding-left:8px;margin:14px 0 8px;">Due Customers</div>
  <table>
    <thead>
      <tr>
        <th>Customer</th><th>Phone</th><th>Address</th><th class="num">Orders</th><th class="num">Purchase</th><th class="num">Paid</th><th class="num">Due</th><th>Last Payment</th><th>Oldest Due</th><th>Newest Due</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Generated by ${escapeHtml(biz.bizName)}</div>
</body>
</html>`;

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => (globalThis as any).document?.fonts?.ready);
    await page.emulateMediaType("print");
    const pdf = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:8px;color:#94a3b8;width:100%;padding:0 10mm;text-align:right;">Customer Due Report</div>`,
      footerTemplate: `<div style="font-size:8px;color:#94a3b8;width:100%;padding:0 10mm;display:flex;justify-content:space-between;"><span></span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
      margin: { top: "14mm", bottom: "16mm", left: "10mm", right: "10mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => undefined);
  }
}
