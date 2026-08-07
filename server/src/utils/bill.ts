/**
 * Bill formatting utilities.
 *
 * Generates a WhatsApp-friendly Hindi/English invoice text and a
 * professional printable PDF for an order + bill.
 *
 * All business details come from the SiteSetting record (database-driven),
 * so the admin can change them at any time without a redeploy.
 */
import puppeteer from "puppeteer";
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

export interface BillLineItem {
  productName: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

export interface BillData {
  companyName: string;
  tagline: string;
  orderNumber: string;
  customerName: string;
  customerMobile: string;
  deliveryAddress: string | null;
  createdAt: string | Date;
  status: string;
  items: BillLineItem[];
  subtotal: number;
  discount: number;
  finalAmount: number;
  // Payment details (added by the payment management system)
  cashPaid: number;
  onlinePaid: number;
  totalPaid: number;
  due: number;
  paymentStatus: "PAID" | "PARTIALLY_PAID" | "DUE";
  // Business invoice details
  businessName: string;
  businessAddress: string;
  gstNumber: string;
  businessMobile: string;
  businessEmail: string;
  businessLogoUrl: string;
}

const companyName = "M/S Sushant Construction";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontsDir = join(__dirname, "..", "..", "fonts");

const notoDevaRegular = readFileSync(join(fontsDir, "NotoSansDevanagari-Regular.ttf")).toString("base64");
const notoDevaBold = readFileSync(join(fontsDir, "NotoSansDevanagari-Bold.ttf")).toString("base64");
const notoSansRegular = readFileSync(join(fontsDir, "NotoSans-Regular.ttf")).toString("base64");

export function getEmbeddedFontCss(): string {
  return `
    @font-face {
      font-family: 'Noto Sans Devanagari';
      font-style: normal;
      font-weight: 400;
      src: url('data:font/ttf;base64,${notoDevaRegular}') format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Devanagari';
      font-style: normal;
      font-weight: 700;
      src: url('data:font/ttf;base64,${notoDevaBold}') format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans';
      font-style: normal;
      font-weight: 400;
      src: url('data:font/ttf;base64,${notoSansRegular}') format('truetype');
    }
  `;
}

export function fmtINR(n: number): string {
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}

export function fmtDate(d: string | Date): string {
  const date = new Date(d);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDateShort(d: string | Date): string {
  const date = new Date(d);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function paymentStatusLabel(status: string): string {
  switch (status) {
    case "PAID":
      return "PAID";
    case "PARTIALLY_PAID":
      return "PARTIALLY PAID";
    case "DUE":
    default:
      return "DUE";
  }
}

/**
 * WhatsApp-friendly bill text (copy/paste format).
 */
export function buildBillText(bill: BillData): string {
  const lines: string[] = [];

  const bizName = bill.businessName || bill.companyName || companyName;
  const bizAddr = bill.businessAddress || "";
  const bizGst = bill.gstNumber ? `GST: ${bill.gstNumber}` : "";
  const bizPhone = bill.businessMobile || "";
  const bizEmail = bill.businessEmail || "";

  lines.push(`🙏 ${bizName} 🙏`);
  if (bizAddr) lines.push(`📍 ${bizAddr}`);
  if (bizGst) lines.push(`🆔 ${bizGst}`);
  if (bizPhone) lines.push(`📞 ${bizPhone}`);
  if (bizEmail) lines.push(`✉️ ${bizEmail}`);
  lines.push("");
  lines.push("--- INVOICE ---");
  lines.push("");
  lines.push(`Order No: ${bill.orderNumber}`);
  lines.push(`Date: ${fmtDate(bill.createdAt)}`);
  lines.push(`Customer: ${bill.customerName}`);
  lines.push(`Mobile: ${bill.customerMobile}`);
  if (bill.deliveryAddress) {
    lines.push(`Address: ${bill.deliveryAddress}`);
  }
  lines.push(`Status: ${bill.status}`);
  lines.push("");
  lines.push("Products:");
  for (const it of bill.items) {
    lines.push(
      `${it.productName} - ${it.quantity} ${it.unit} ${fmtINR(it.total)}`
    );
  }
  lines.push("");
  lines.push(`Subtotal: ${fmtINR(bill.subtotal)}`);
  if (bill.discount > 0) {
    lines.push(`Discount: -${fmtINR(bill.discount)}`);
  }
  lines.push(`Final Amount (Total): ${fmtINR(bill.finalAmount)}`);
  lines.push("");
  lines.push("Payment Details:");
  lines.push(`  Cash Received: ${fmtINR(bill.cashPaid)}`);
  lines.push(`  Online Received: ${fmtINR(bill.onlinePaid)}`);
  lines.push(`  Payment Status: ${paymentStatusLabel(bill.paymentStatus)}`);
  if (bill.due > 0) {
    lines.push(`  Remaining Due: ${fmtINR(bill.due)}`);
  }
  lines.push("");
  lines.push("Thank you 🙏");
  lines.push(`${bizName}`);
  if (bizAddr) lines.push(bizAddr);
  if (bizPhone) lines.push(bizPhone);

  return lines.join("\n");
}

/**
 * Professional printable HTML invoice (also used for print / save-as-PDF).
 */
export function buildBillHtml(bill: BillData): string {
  const rows = bill.items
    .map(
      (it) => `
        <tr>
          <td>${it.productName}</td>
          <td class="num">${it.quantity} ${it.unit}</td>
          <td class="num">${fmtINR(it.price)}</td>
          <td class="num">${fmtINR(it.total)}</td>
        </tr>`
    )
    .join("");

  const bizName = bill.businessName || bill.companyName || companyName;
  const bizAddr = bill.businessAddress || "";
  const bizGst = bill.gstNumber || "";
  const bizPhone = bill.businessMobile || "";
  const bizEmail = bill.businessEmail || "";
  const bizLogo = bill.businessLogoUrl || "";

  const discountRow =
    bill.discount > 0
      ? `
        <tr class="discount">
          <td colspan="3">Discount</td>
          <td class="num">-${fmtINR(bill.discount)}</td>
        </tr>`
      : "";

  const dueRow =
    bill.due > 0
      ? `<tr class="due">
          <td colspan="3">Remaining Due</td>
          <td class="num">${fmtINR(bill.due)}</td>
        </tr>`
      : "";

  const paymentStatusBadge =
    bill.paymentStatus === "PAID"
      ? `<span class="pstatus paid">PAID</span>`
      : bill.paymentStatus === "DUE"
      ? `<span class="pstatus due">DUE</span>`
      : `<span class="pstatus partial">PARTIALLY PAID</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Invoice ${bill.orderNumber}</title>
<style>
  ${getEmbeddedFontCss()}
  body { font-family: 'Noto Sans Devanagari', 'Noto Sans', 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 32px; }
  .container { max-width: 720px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
  .header { background: #1e293b; color: #fff; padding: 24px; text-align: center; position: relative; }
  .header .logo { max-height: 64px; margin-bottom: 8px; }
  .header h1 { margin: 0; font-size: 22px; letter-spacing: 0.5px; }
  .header p { margin: 4px 0 0; opacity: 0.85; font-size: 13px; }
  .business-details { background: #f8fafc; padding: 16px 24px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  .business-details .left { text-align: left; }
  .business-details .right { text-align: right; }
  .business-details p { margin: 2px 0; }
  .business-details .label { font-weight: 600; color: #64748b; }
  .meta { padding: 20px 24px; display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; border-bottom: 1px solid #e2e8f0; }
  .meta div p { margin: 2px 0; font-size: 13px; }
  .meta .label { font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 10px 14px; text-align: left; font-size: 13px; }
  thead th { background: #f1f5f9; color: #475569; text-transform: uppercase; font-size: 11px; letter-spacing: 0.4px; }
  tbody tr { border-bottom: 1px solid #f1f5f9; }
  .num { text-align: right; }
  .totals { padding: 20px 24px; text-align: right; }
  .totals p { margin: 4px 0; font-size: 14px; }
  .totals .grand { font-size: 18px; font-weight: 700; color: #0f766e; margin-top: 6px; }
  .discount td { color: #b91c1c; font-weight: 600; }
  .due td { color: #b45309; font-weight: 700; }
  .payment-box { margin: 0 24px 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .payment-box .head { background: #f1f5f9; padding: 10px 16px; font-weight: 700; color: #334155; text-transform: uppercase; font-size: 12px; letter-spacing: 0.4px; }
  .payment-box .row { display: flex; justify-content: space-between; padding: 8px 16px; font-size: 13px; border-top: 1px solid #f1f5f9; }
  .payment-box .row span.label { color: #64748b; }
  .payment-box .row span.val { font-weight: 600; color: #0f172a; }
  .pstatus { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
  .pstatus.paid { background: #dcfce7; color: #15803d; }
  .pstatus.due { background: #fee2e2; color: #b91c1c; }
  .pstatus.partial { background: #fef3c7; color: #b45309; }
  .footer { padding: 20px 24px; text-align: center; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0; }
  .footer .tagline { font-weight: 600; color: #334155; margin-top: 6px; }
  @media print {
    body { padding: 0; }
    .container { border: 0; }
  }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${
        bizLogo
          ? `<img src="${bizLogo}" alt="Logo" class="logo" />`
          : ""
      }
      <h1>🙏 ${bizName} 🙏</h1>
      <p>${bill.tagline || "Your trusted partner"}</p>
    </div>

    ${
      bizAddr || bizGst || bizPhone || bizEmail
        ? `<div class="business-details">
            <div class="left">
              ${bizAddr ? `<p>📍 ${bizAddr}</p>` : ""}
              ${bizGst ? `<p>🆔 GST: ${bizGst}</p>` : ""}
            </div>
            <div class="right">
              ${bizPhone ? `<p>📞 ${bizPhone}</p>` : ""}
              ${bizEmail ? `<p>✉️ ${bizEmail}</p>` : ""}
            </div>
          </div>`
        : ""
    }

    <div class="meta">
      <div>
        <p class="label">Invoice No</p>
        <p>${bill.orderNumber}</p>
        <p class="label">Invoice Date</p>
        <p>${fmtDateShort(bill.createdAt)}</p>
      </div>
      <div>
        <p class="label">Customer Name</p>
        <p>${bill.customerName}</p>
        <p class="label">Customer Mobile</p>
        <p>${bill.customerMobile}</p>
      </div>
      <div>
        <p class="label">Status</p>
        <p>${bill.status} · ${paymentStatusBadge}</p>
        ${
          bill.deliveryAddress
            ? `<p class="label">Delivery Address</p><p>${bill.deliveryAddress}</p>`
            : ""
        }
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th class="num">Qty</th>
          <th class="num">Price</th>
          <th class="num">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="totals">
      <p>Subtotal: <strong>${fmtINR(bill.subtotal)}</strong></p>
      ${discountRow}
      <p class="grand">Final Amount: ${fmtINR(bill.finalAmount)}</p>
    </div>

    <div class="payment-box">
      <div class="head">Payment Details</div>
      <div class="row">
        <span class="label">Total Amount</span>
        <span class="val">${fmtINR(bill.finalAmount)}</span>
      </div>
      <div class="row">
        <span class="label">Cash Received</span>
        <span class="val">${fmtINR(bill.cashPaid)}</span>
      </div>
      <div class="row">
        <span class="label">Online Received</span>
        <span class="val">${fmtINR(bill.onlinePaid)}</span>
      </div>
      <div class="row">
        <span class="label">Payment Status</span>
        <span class="val">${paymentStatusBadge}</span>
      </div>
      ${dueRow}
    </div>

    <div class="footer">
      <p>Thank you for your valuable business 🙏</p>
      <p>आपके विश्वास और सहयोग के लिए M/S SUSHANT CONSTRUCTION आपका आभारी है।</p>
      <p>हम हमेशा बेहतर गुणवत्ता और भरोसेमंद सेवा देने के लिए प्रतिबद्ध हैं।</p>
      <p>Visit us again and experience the best construction material service.</p>
      <p class="tagline">${bizName}</p>
      ${bizAddr ? `<p>${bizAddr}</p>` : ""}
      ${bizPhone ? `<p>📞 ${bizPhone}</p>` : ""}
    </div>
  </div>
</body>
</html>`;
}

let browserPromise: Promise<any> | null = null;

export const RENDER_SAFE_LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
];

const SYSTEM_BROWSER_CANDIDATES = [
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

function findSystemBrowser(): string | undefined {
  for (const path of SYSTEM_BROWSER_CANDIDATES) {
    if (fs.existsSync(path)) {
      return path;
    }
  }
  return undefined;
}

async function resolveExecutablePath(): Promise<string> {
  console.log("ENV PATH:", process.env.PUPPETEER_EXECUTABLE_PATH);

  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;

  if (envPath && fs.existsSync(envPath)) {
    console.log("USING ENV PATH:", envPath);
    return envPath;
  }

  const puppeteerPath = await puppeteer.executablePath();

  console.log("PUPPETEER PATH:", puppeteerPath);

  if (puppeteerPath && fs.existsSync(puppeteerPath)) {
    console.log("USING PUPPETEER PATH:", puppeteerPath);

    return puppeteerPath;
  }

  const system = findSystemBrowser();

  if (system) {
    console.log("USING SYSTEM PATH:", system);

    return system;
  }

  throw new Error("Chromium browser not available");
}

export async function getBrowser() {
  if (browserPromise) {
    return browserPromise;
  }

  browserPromise = (async () => {
    const executablePath = await resolveExecutablePath();

    console.log("FINAL EXECUTABLE PATH:", executablePath);

    console.log("FILE EXISTS:", fs.existsSync(executablePath));

    return puppeteer.launch({
      executablePath,
      headless: true,
      args: RENDER_SAFE_LAUNCH_ARGS,
    });
  })();

  return browserPromise;
}

export async function buildBillPdf(bill: BillData): Promise<Buffer> {
  const html = buildBillHtml(bill);

  const browser = await getBrowser();

  const page = await browser.newPage();

  try {
    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    await page.emulateMediaType("print");

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => undefined);
  }
}
