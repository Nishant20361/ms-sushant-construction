import { adminApi } from "./api";

/**
 * Open the printable invoice in a new browser tab.
 *
 * The backend serves the complete invoice HTML (with the existing invoice
 * design, Hindi fonts, logo, GST and payment details) at the /bill/html
 * route. Opening it in a new tab lets the admin review the bill and then use
 * the browser's native print option (Ctrl+P / Cmd+P / "Save as PDF").
 *
 * No iframe, no automatic printing, no PDF generation.
 */
export function printInvoice(orderId: number): Window | null {
  const url = adminApi.getBillHtmlUrl(orderId);
  return window.open(url, "_blank");
}
