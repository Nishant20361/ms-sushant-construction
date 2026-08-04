/**
 * Bill formatting utilities.
 *
 * Generates a WhatsApp-friendly Hindi/English invoice text and a
 * professional printable PDF for an order + bill.
 *
 * All business details come from the SiteSetting record (database-driven),
 * so the admin can change them at any time without a redeploy.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync } from "node:fs";

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

function getEmbeddedFontCss(): string {
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

function fmtINR(n: number): string {
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}

function fmtDate(d: string | Date): string {
  const date = new Date(d);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateShort(d: string | Date): string {
  const date = new Date(d);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  lines.push(`Final Amount: ${fmtINR(bill.finalAmount)}`);
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
        <p>${bill.status}</p>
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

/**
 * Generate a professional PDF buffer for an order bill.
 *
 * Uses Puppeteer to render the existing HTML invoice so Hindi/Devanagari
 * text and the Indian Rupee symbol (₹) are preserved in the PDF.
 *
 * Production hardening: the Puppeteer Chromium browser is often not present on
 * a server (the download is skipped during `npm install`). We therefore:
 *   1. Auto-detect a usable Chrome/Chromium binary (env override → Puppeteer's
 *      own cached browser → common system install paths).
 *   2. Reuse a single browser instance across requests (lazy singleton) so we
 *      don't pay the launch cost on every download.
 *   3. Fail with a clear, actionable message instead of a masked 500 if no
 *      browser can be found.
 */

// ---------------------------------------------------------------------------
// Browser discovery
// ---------------------------------------------------------------------------

/** Common system Chrome/Chromium install paths (macOS, Linux, Windows). */
const SYSTEM_BROWSER_CANDIDATES: string[] = [
  // Env override wins (admins can point at any custom binary).
  ...(process.env.PUPPETEER_EXECUTABLE_PATH
    ? [process.env.PUPPETEER_EXECUTABLE_PATH]
    : []),
  // Common Linux locations.
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/chrome",
  "/opt/google/chrome/chrome",
  "/usr/local/bin/chrome",
  "/usr/local/bin/chromium",
  "/usr/local/bin/google-chrome",
  // Common macOS locations.
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  // Common Windows locations.
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

function findSystemBrowser(): string | undefined {
  for (const candidate of SYSTEM_BROWSER_CANDIDATES) {
    try {
      if (candidate && existsSync(candidate)) return candidate;
    } catch {
      // ignore per-candidate errors and keep scanning
    }
  }
  return undefined;
}

let cachedExecutablePath: string | undefined;
let resolvedExecutablePath: boolean = false;

/**
 * Resolve a usable Chrome/Chromium executable path, or undefined if none is
 * available. The result is cached after the first (successful) discovery.
 */
async function resolveBrowserExecutablePath(): Promise<string | undefined> {
  if (resolvedExecutablePath) return cachedExecutablePath;

  // 1) Prefer Puppeteer's own cached browser (normally downloaded at install).
  try {
    const puppeteer = (await import("puppeteer")).default;
    const bundled = await puppeteer.executablePath();
    if (bundled && existsSync(bundled)) {
      cachedExecutablePath = bundled;
      resolvedExecutablePath = true;
      return cachedExecutablePath;
    }
  } catch {
    // puppeteer not resolvable here — fall through to system candidates
  }

  // 2) Fall back to a system-installed browser.
  const system = findSystemBrowser();
  if (system) {
    cachedExecutablePath = system;
    resolvedExecutablePath = true;
    return cachedExecutablePath;
  }

  // 3) Nothing found. Cache the "not found" result so we don't re-scan every call.
  resolvedExecutablePath = true;
  return undefined;
}

// ---------------------------------------------------------------------------
// Reusable browser singleton
// ---------------------------------------------------------------------------

let browserPromise: Promise<any> | undefined;

/**
 * Lazily launch (once) and reuse a single Puppeteer browser instance.
 * Closing per-request browsers was both slow and fragile on servers.
 */
async function getBrowser(): Promise<any> {
  if (!browserPromise) {
    const puppeteer = (await import("puppeteer")).default;
    const executablePath = await resolveBrowserExecutablePath();

    if (!executablePath) {
      throw new Error(
        "PDF browser engine is not available. " +
          "Install Chromium on the server or set the PUPPETEER_EXECUTABLE_PATH environment variable " +
          "to point at a Chrome/Chromium executable."
      );
    }

    browserPromise = puppeteer.launch({
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    }).catch((err: unknown) => {
      // Allow a retry on the next request if launch failed.
      browserPromise = undefined;
      throw err;
    });
  }
  return browserPromise;
}

/**
 * Generate a professional PDF buffer for an order bill.
 *
 * Renders the invoice HTML in a shared Chrome/Chromium instance so
 * Devanagari/₹ text is preserved, then returns the PDF bytes.
 */
export async function buildBillPdf(bill: BillData): Promise<Buffer> {
  const html = buildBillHtml(bill);
  const browser = await getBrowser();

  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => (globalThis as any).document?.fonts?.ready);
    await page.emulateMediaType("print");
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    return Buffer.from(pdf);
  } finally {
    // Close each page but keep the shared browser alive for reuse.
    await page.close().catch(() => undefined);
  }
}

