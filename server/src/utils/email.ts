import nodemailer, { Transporter } from "nodemailer";
import { config } from "../config.js";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const { host, port, user, pass } = config.smtp;
  // Only create a transporter if SMTP is configured. This keeps email
  // optional: if no SMTP credentials exist, we simply skip sending.
  if (!host || !user || !pass) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerMobile: string;
  deliveryAddress: string | null;
  subtotal: number;
  status: string;
  createdAt: Date;
  items: { productName: string; quantity: number; price: number; total: number; unit: string }[];
}

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function buildOrderEmailBody(order: OrderEmailData): string {
  const lines: string[] = [];
  lines.push("A new order has been received.");
  lines.push("");
  lines.push(`Order ID: ${order.orderNumber}`);
  lines.push(`Customer: ${order.customerName}`);
  lines.push(`Mobile: ${order.customerMobile}`);
  lines.push(`Delivery Address: ${order.deliveryAddress || "Not provided"}`);
  lines.push("");
  lines.push("Ordered Products:");
  for (const it of order.items) {
    lines.push(
      `  - ${it.productName} | ${it.quantity} ${it.unit} | ${formatINR(it.price)} each | ${formatINR(it.total)}`
    );
  }
  lines.push("");
  lines.push(`Total Amount: ${formatINR(order.subtotal)}`);
  lines.push(`Order Time: ${order.createdAt.toISOString()}`);
  lines.push(`Current Status: ${order.status}`);
  lines.push("");
  lines.push("M/S SUSHANT CONSTRUCTION");
  return lines.join("\n");
}

/**
 * Sends the "New Order Received" email to the admin.
 *
 * The recipient is the admin's email stored in the database. If no admin
 * email is configured, we fall back to ADMIN_NOTIFICATION_EMAIL from env.
 *
 * This function NEVER throws: email failures are logged and swallowed so a
 * broken SMTP setup can never crash the server or lose an order.
 */
export async function sendAdminNewOrderEmail(
  to: string,
  order: OrderEmailData
): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.warn("[email] SMTP not configured - skipping order notification email.");
    return;
  }
  if (!to) {
    console.warn("[email] No admin email to send order notification to.");
    return;
  }
  try {
    const from = config.smtp.from || config.smtp.user;
    await t.sendMail({
      from,
      to,
      subject: "New Order Received - M/S SUSHANT CONSTRUCTION",
      text: buildOrderEmailBody(order),
    });
    console.log(`[email] New order notification sent to ${to} for ${order.orderNumber}`);
  } catch (err) {
    // Never crash the server because email failed.
    console.error("[email] Failed to send order notification email:", err);
  }
}

