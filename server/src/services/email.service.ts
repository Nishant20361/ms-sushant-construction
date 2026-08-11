import nodemailer, { Transporter } from "nodemailer";
import { config } from "../config.js";

/**
 * Returns nodemailer Transporter if host, user, pass are set.
 */
function getTransporter(): Transporter | null {
  const { host, port, user, pass } = config.smtp;
  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    family: 4,
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 15000,
  } as any);
}

export interface OrderItemEmailData {
  productName: string;
  quantity: number;
  price: number;
  total: number;
  unit?: string;
}

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerMobile: string;
  deliveryAddress?: string | null;
  subtotal: number;
  status: string;
  createdAt: Date;
  items: OrderItemEmailData[];
}

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Send new order notification email.
 */
export async function sendOrderNotificationEmail(
  to: string,
  order: OrderEmailData
): Promise<boolean> {
  const t = getTransporter();
  const from = config.smtp.from || config.smtp.user || "no-reply@mssushant.com";
  const dateStr = new Date(order.createdAt).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const itemsList = order.items
    .map(
      (it) =>
        `  • ${it.productName} — ${it.quantity} ${it.unit || "unit(s)"} @ ${formatINR(it.price)} = ${formatINR(it.total)}`
    )
    .join("\n");

  const plainText = `
New Order Received - M/S SUSHANT CONSTRUCTION
=================================================
Order ID: ${order.orderNumber}
Date: ${dateStr}

Customer Details:
-----------------
Name: ${order.customerName}
Mobile: ${order.customerMobile}
Delivery Address: ${order.deliveryAddress || "Not specified"}

Order Items:
------------
${itemsList}

Total Amount: ${formatINR(order.subtotal)}
Status: ${order.status}

M/S Sushant Construction Team
`;

  const htmlContent = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff;">
  <div style="background: #1e293b; color: #ffffff; padding: 20px; text-align: center;">
    <h2 style="margin: 0; font-size: 20px;">M/S SUSHANT CONSTRUCTION</h2>
    <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 14px;">New Order Notification</p>
  </div>
  <div style="padding: 24px;">
    <div style="background: #f8fafc; border-left: 4px solid #f59e0b; padding: 12px 16px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Order ID:</strong> ${order.orderNumber}</p>
      <p style="margin: 4px 0 0 0; font-size: 14px; color: #334155;"><strong>Date:</strong> ${dateStr}</p>
    </div>

    <h3 style="font-size: 16px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 0;">Customer Information</h3>
    <table style="width: 100%; font-size: 14px; color: #334155; margin-bottom: 20px;">
      <tr><td style="width: 130px; font-weight: bold; padding: 4px 0;">Name:</td><td>${order.customerName}</td></tr>
      <tr><td style="font-weight: bold; padding: 4px 0;">Mobile:</td><td>${order.customerMobile}</td></tr>
      <tr><td style="font-weight: bold; padding: 4px 0;">Delivery Address:</td><td>${order.deliveryAddress || "Not specified"}</td></tr>
    </table>

    <h3 style="font-size: 16px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Order Details</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
      <thead>
        <tr style="background: #f1f5f9; text-align: left;">
          <th style="padding: 8px; border: 1px solid #cbd5e1;">Product</th>
          <th style="padding: 8px; border: 1px solid #cbd5e1;">Qty</th>
          <th style="padding: 8px; border: 1px solid #cbd5e1;">Price</th>
          <th style="padding: 8px; border: 1px solid #cbd5e1;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${order.items
          .map(
            (it) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">${it.productName}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">${it.quantity} ${it.unit || ""}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">${formatINR(it.price)}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">${formatINR(it.total)}</td>
        </tr>`
          )
          .join("")}
      </tbody>
    </table>

    <div style="text-align: right; font-size: 16px; color: #0f172a; margin-top: 10px;">
      <p style="margin: 0;"><strong>Total Amount:</strong> <span style="color: #d97706; font-size: 18px; font-weight: bold;">${formatINR(order.subtotal)}</span></p>
    </div>
  </div>
  <div style="background: #f8fafc; padding: 16px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;">
    This is an automated notification from M/S Sushant Construction Order System.
  </div>
</div>
`;

  if (!t) {
    console.warn(`[EMAIL] SMTP not configured. Order email simulated for Order #${order.orderNumber} to <${to}>`);
    console.log(`[EMAIL] Order email details:\nCustomer: ${order.customerName}\nTotal: ${formatINR(order.subtotal)}`);
    return false;
  }

  if (!to) {
    console.warn(`[EMAIL] No target recipient provided for order email (Order #${order.orderNumber})`);
    return false;
  }

  try {
    await t.sendMail({
      from,
      to,
      subject: `New Order Received #${order.orderNumber} - M/S SUSHANT CONSTRUCTION`,
      text: plainText,
      html: htmlContent,
    });
    console.log(`[EMAIL] Order email sent SUCCESS to ${to} for Order #${order.orderNumber}`);
    return true;
  } catch (err) {
    console.error(`[EMAIL] Failed to send order email to ${to}:`, err);
    return false;
  }
}

/**
 * Send password reset email with reset link.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  expiresInMinutes: number = 15
): Promise<boolean> {
  const t = getTransporter();
  const from = config.smtp.from || config.smtp.user || "no-reply@mssushant.com";

  const plainText = `
Reset Password - M/S SUSHANT CONSTRUCTION
===========================================
You requested a password reset for your account.

Click or copy the link below to reset your password (valid for ${expiresInMinutes} minutes):
${resetUrl}

If you did not request this, please ignore this email. Your password will remain unchanged.

M/S Sushant Construction Security Team
`;

  const htmlContent = `
<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff;">
  <div style="background: #1e293b; color: #ffffff; padding: 20px; text-align: center;">
    <h2 style="margin: 0; font-size: 20px;">M/S SUSHANT CONSTRUCTION</h2>
    <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 14px;">Password Reset Request</p>
  </div>
  <div style="padding: 24px;">
    <p style="font-size: 14px; color: #334155; margin-top: 0;">We received a request to reset the password for your account.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${resetUrl}" style="background-color: #f59e0b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">Reset Password</a>
    </div>
    <p style="font-size: 13px; color: #64748b;">This link is valid for <strong>${expiresInMinutes} minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
    <div style="border-top: 1px dashed #cbd5e1; margin-top: 20px; padding-top: 12px;">
      <p style="font-size: 12px; color: #94a3b8; word-break: break-all; margin: 0;">Or copy this URL into your browser:<br/><a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a></p>
    </div>
  </div>
  <div style="background: #f8fafc; padding: 16px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;">
    M/S Sushant Construction Security Notification
  </div>
</div>
`;

  if (!t) {
    console.warn(`[EMAIL] SMTP not configured. Password reset link simulated for <${to}>`);
    console.log(`[EMAIL] Reset URL: ${resetUrl}`);
    return false;
  }

  if (!to) {
    console.warn(`[EMAIL] No target recipient provided for password reset email.`);
    return false;
  }

  try {
    await t.sendMail({
      from,
      to,
      subject: "Reset Password - M/S SUSHANT CONSTRUCTION",
      text: plainText,
      html: htmlContent,
    });
    console.log(`[EMAIL] Reset email sent SUCCESS to ${to}`);
    return true;
  } catch (err) {
    console.error(`[EMAIL] Failed to send password reset email to ${to}:`, err);
    return false;
  }
}

/**
 * Send password changed confirmation email.
 */
export async function sendPasswordChangedEmail(
  to: string,
  details?: { date?: Date; userAgent?: string; ip?: string }
): Promise<boolean> {
  const t = getTransporter();
  const from = config.smtp.from || config.smtp.user || "no-reply@mssushant.com";
  const dateStr = (details?.date || new Date()).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "medium",
  });

  const plainText = `
Password Updated Successfully - M/S SUSHANT CONSTRUCTION
========================================================
Your account password was updated successfully.

Date & Time: ${dateStr}

SECURITY WARNING:
If you did NOT make this password change, please contact support or reset your password immediately to secure your account.

M/S Sushant Construction Security Team
`;

  const htmlContent = `
<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff;">
  <div style="background: #1e293b; color: #ffffff; padding: 20px; text-align: center;">
    <h2 style="margin: 0; font-size: 20px;">M/S SUSHANT CONSTRUCTION</h2>
    <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 14px;">Password Security Alert</p>
  </div>
  <div style="padding: 24px;">
    <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px 16px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 14px; color: #15803d; font-weight: bold;">Your password has been changed successfully.</p>
    </div>

    <p style="font-size: 14px; color: #334155;"><strong>Date &amp; Time:</strong> ${dateStr}</p>

    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin-top: 20px;">
      <p style="margin: 0; font-size: 13px; color: #991b1b; font-weight: bold;">SECURITY WARNING:</p>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #b91c1c;">If you did not perform this change, please contact your administrator or reset your password immediately.</p>
    </div>
  </div>
  <div style="background: #f8fafc; padding: 16px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;">
    M/S Sushant Construction Security Notification
  </div>
</div>
`;

  if (!t) {
    console.warn(`[EMAIL] SMTP not configured. Password changed email simulated for <${to}>`);
    return false;
  }

  if (!to) {
    console.warn(`[EMAIL] No target recipient provided for password changed email.`);
    return false;
  }

  try {
    await t.sendMail({
      from,
      to,
      subject: "Password Changed Successfully - M/S SUSHANT CONSTRUCTION",
      text: plainText,
      html: htmlContent,
    });
    console.log(`[EMAIL] Password changed email sent SUCCESS to ${to}`);
    return true;
  } catch (err) {
    console.error(`[EMAIL] Failed to send password changed email to ${to}:`, err);
    return false;
  }
}

export interface SmtpTestResult {
  SMTP_CONNECTED: "YES" | "NO";
  EMAIL_SENT: "YES" | "NO";
  diagnostics: {
    host: string;
    port: number;
    user: string;
    from: string;
    secure: boolean;
    recipient: string;
    connectionError: string | null;
    sendError: string | null;
  };
}

/**
 * Perform real SMTP connection verify and send test email.
 */
export async function testSmtpConnection(targetEmail?: string): Promise<SmtpTestResult> {
  const { host, port, user, pass, from } = config.smtp;
  const recipient = targetEmail || process.env.TEST_EMAIL || user || "admin@example.com";

  const diagnostics = {
    host: host || "(Not set)",
    port: port || 587,
    user: user || "(Not set)",
    from: from || user || "(Not set)",
    secure: port === 465,
    recipient,
    connectionError: null as string | null,
    sendError: null as string | null,
  };

  if (!host || !user || !pass) {
    diagnostics.connectionError = "Missing required environment variables (EMAIL_HOST/SMTP_HOST, EMAIL_USER/SMTP_USER, EMAIL_PASSWORD/SMTP_PASS)";
    return {
      SMTP_CONNECTED: "NO",
      EMAIL_SENT: "NO",
      diagnostics,
    };
  }

  const testTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    family: 4,
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 15000,
  } as any);

  let smtpConnected = false;
  try {
    await testTransporter.verify();
    smtpConnected = true;
    console.log(`[SMTP TEST] Connection verified successfully for ${host}:${port}`);
  } catch (err: any) {
    smtpConnected = false;
    diagnostics.connectionError = err?.message || String(err);
    console.error("[SMTP TEST] Connection verify failed:", err);
  }

  if (!smtpConnected) {
    return {
      SMTP_CONNECTED: "NO",
      EMAIL_SENT: "NO",
      diagnostics,
    };
  }

  let emailSent = false;
  try {
    await testTransporter.sendMail({
      from: from || user,
      to: recipient,
      subject: "Real SMTP Delivery Test - M/S SUSHANT CONSTRUCTION",
      text: `Hello!\n\nThis is an automated real SMTP delivery test from MS Sushant Construction API.\n\nTime: ${new Date().toISOString()}\nSMTP Host: ${host}\nSMTP Port: ${port}\nUser: ${user}\n\nIf you are reading this email, real email delivery is working perfectly!`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 550px; margin: 0 auto; background: #ffffff;">
          <div style="background: #1e293b; color: #ffffff; padding: 16px; text-align: center; border-radius: 6px 6px 0 0;">
            <h2 style="margin: 0; font-size: 18px;">M/S SUSHANT CONSTRUCTION</h2>
            <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">Real SMTP Delivery Test</p>
          </div>
          <div style="padding: 20px;">
            <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px; margin-bottom: 16px;">
              <p style="margin: 0; font-size: 14px; color: #15803d; font-weight: bold;">✅ SMTP Connection & Email Delivery Test SUCCESS!</p>
            </div>
            <p style="font-size: 14px; color: #334155; margin-top: 0;">This email confirms that your server's SMTP configuration can successfully authenticate and send real emails.</p>
            <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse; margin-top: 12px;">
              <tr><td style="padding: 6px 0; font-weight: bold; width: 140px;">Time:</td><td>${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td></tr>
              <tr><td style="padding: 6px 0; font-weight: bold;">SMTP Host:</td><td>${host}</td></tr>
              <tr><td style="padding: 6px 0; font-weight: bold;">SMTP Port:</td><td>${port}</td></tr>
              <tr><td style="padding: 6px 0; font-weight: bold;">Sender User:</td><td>${user}</td></tr>
              <tr><td style="padding: 6px 0; font-weight: bold;">Recipient:</td><td>${recipient}</td></tr>
            </table>
          </div>
          <div style="background: #f8fafc; padding: 12px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; border-radius: 0 0 6px 6px;">
            System Diagnostic Test Email
          </div>
        </div>
      `,
    });
    emailSent = true;
    console.log(`[SMTP TEST] Email successfully delivered to ${recipient}`);
  } catch (err: any) {
    emailSent = false;
    diagnostics.sendError = err?.message || String(err);
    console.error("[SMTP TEST] Email send failed:", err);
  }

  return {
    SMTP_CONNECTED: smtpConnected ? "YES" : "NO",
    EMAIL_SENT: emailSent ? "YES" : "NO",
    diagnostics,
  };
}

