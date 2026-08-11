import nodemailer, { Transporter } from "nodemailer";
import { config } from "../config.js";

/**
 * Log helper for complete email flow tracking.
 */
function logEmailFlow(type: string, recipient: string, success: boolean, error?: string) {
  console.log("[EMAIL FLOW]");
  console.log(`TYPE: ${type}`);
  console.log(`RECIPIENT: ${recipient || "(none)"}`);
  console.log("STARTED: YES");
  console.log(`SUCCESS: ${success ? "YES" : "NO"}`);
  console.log(`FAILED: ${success ? "NO" : "YES"}`);
  console.log(`ERROR: ${error || "None"}`);
}

/**
 * Creates a production-ready Nodemailer Transporter.
 * Configured with IPv4 forcing, explicit TLS settings, and 10s timeouts for Render & cloud compatibility.
 * Compatible with Brevo (smtp-relay.brevo.com), Gmail (smtp.gmail.com), and custom SMTP relays.
 */
function createProductionTransporter(targetPort?: number): Transporter | null {
  const { host, user, pass, port: configuredPort } = config.smtp;
  if (!host || !user || !pass) {
    return null;
  }

  const port = targetPort || configuredPort || 587;
  const isSecure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    requireTLS: !isSecure, // Require STARTTLS for non-465 ports (587)
    auth: { user, pass },
    family: 4, // Force IPv4 to bypass IPv6 ENETUNREACH issues on Render
    tls: {
      rejectUnauthorized: false, // Prevents certificate chain verification failures
      minVersion: "TLSv1.2",
    },
    connectionTimeout: 10000, // 10s connection timeout
    greetingTimeout: 10000,   // 10s greeting timeout
    socketTimeout: 10000,     // 10s socket timeout
  } as any);
}

/**
 * Helper to send email with automatic port fallback (e.g., 587 -> 465) if network times out.
 */
async function sendMailWithFallback(
  mailOptions: nodemailer.SendMailOptions,
  emailType: string
): Promise<boolean> {
  const configuredPort = config.smtp.port || 587;
  const fallbackPort = configuredPort === 465 ? 587 : 465;
  const recipient = (mailOptions.to as string) || "";

  const primaryTransporter = createProductionTransporter(configuredPort);
  if (!primaryTransporter) {
    const err = "SMTP not configured (EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD required)";
    console.warn(`[EMAIL] SMTP not configured. Email simulated to <${recipient}>`);
    logEmailFlow(emailType, recipient, false, err);
    return false;
  }

  try {
    await primaryTransporter.sendMail(mailOptions);
    console.log(`[EMAIL] Email sent SUCCESS to ${recipient} via port ${configuredPort}`);
    logEmailFlow(emailType, recipient, true);
    return true;
  } catch (err: any) {
    const isTimeoutOrConnError =
      err?.code === "ETIMEDOUT" ||
      err?.code === "ENETUNREACH" ||
      err?.code === "ESOCKET" ||
      (err?.message && err.message.toLowerCase().includes("timeout"));

    if (isTimeoutOrConnError) {
      console.warn(`[EMAIL] Primary SMTP port ${configuredPort} failed with network/timeout error. Retrying with fallback port ${fallbackPort}...`);
      const fallbackTransporter = createProductionTransporter(fallbackPort);
      if (fallbackTransporter) {
        try {
          await fallbackTransporter.sendMail(mailOptions);
          console.log(`[EMAIL] Fallback SMTP port ${fallbackPort} sent email SUCCESS to ${recipient}!`);
          logEmailFlow(emailType, recipient, true);
          return true;
        } catch (fallbackErr: any) {
          const combinedErr = `Port ${configuredPort} timeout: ${err?.message || String(err)}; Port ${fallbackPort} error: ${fallbackErr?.message || String(fallbackErr)}`;
          console.error(`[EMAIL] Fallback SMTP port ${fallbackPort} also failed:`, fallbackErr);
          logEmailFlow(emailType, recipient, false, combinedErr);
          return false;
        }
      }
    }

    const errMsg = err?.message || String(err);
    console.error(`[EMAIL] Failed to send email via port ${configuredPort}:`, err);
    logEmailFlow(emailType, recipient, false, errMsg);
    return false;
  }
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

  if (!to) {
    const err = "No recipient address provided for order notification";
    console.warn(`[EMAIL] ${err} (Order #${order.orderNumber})`);
    logEmailFlow("ORDER_NOTIFICATION", to, false, err);
    return false;
  }

  return sendMailWithFallback(
    {
      from,
      to,
      subject: `New Order Received #${order.orderNumber} - M/S SUSHANT CONSTRUCTION`,
      text: plainText,
      html: htmlContent,
    },
    "ORDER_NOTIFICATION"
  );
}

/**
 * Send password reset email with reset link.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  expiresInMinutes: number = 15
): Promise<boolean> {
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

  if (!to) {
    const err = "No recipient address provided for password reset email";
    console.warn(`[EMAIL] ${err}`);
    logEmailFlow("PASSWORD_RESET", to, false, err);
    return false;
  }

  return sendMailWithFallback(
    {
      from,
      to,
      subject: "Reset Password - M/S SUSHANT CONSTRUCTION",
      text: plainText,
      html: htmlContent,
    },
    "PASSWORD_RESET"
  );
}

/**
 * Send password changed confirmation email.
 */
export async function sendPasswordChangedEmail(
  to: string,
  details?: { date?: Date; userAgent?: string; ip?: string }
): Promise<boolean> {
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

  if (!to) {
    const err = "No recipient address provided for password changed email";
    console.warn(`[EMAIL] ${err}`);
    logEmailFlow("PASSWORD_CHANGED", to, false, err);
    return false;
  }

  return sendMailWithFallback(
    {
      from,
      to,
      subject: "Password Changed Successfully - M/S SUSHANT CONSTRUCTION",
      text: plainText,
      html: htmlContent,
    },
    "PASSWORD_CHANGED"
  );
}

export interface SmtpTestResponse {
  success: boolean;
  smtpConfigured: boolean;
  smtpConnected: boolean;
  emailSent: boolean;
  message?: string;
  error?: string;
}

/**
 * Perform real SMTP connection verify and send test email.
 * Tests primary port first, and automatically falls back to alternative port (465 <-> 587) if connection times out.
 */
export async function testSmtpConnection(targetEmail?: string): Promise<SmtpTestResponse> {
  const { host, user, pass, port: configuredPort, from } = config.smtp;
  const recipient = targetEmail || process.env.TEST_EMAIL || user || "admin@example.com";
  const primaryPort = configuredPort || 587;
  const fallbackPort = primaryPort === 465 ? 587 : 465;

  if (!host || !user || !pass) {
    console.log("[EMAIL CHECK]");
    console.log("CONFIGURED: NO");
    console.log("[SMTP CHECK]");
    console.log("CONNECTED: NO");
    logEmailFlow("TEST_EMAIL", recipient, false, "Missing required SMTP environment variables (EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD)");
    return {
      success: false,
      smtpConfigured: false,
      smtpConnected: false,
      emailSent: false,
      error: "Missing required SMTP environment variables (EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD)",
    };
  }

  console.log("[EMAIL CHECK]");
  console.log("CONFIGURED: YES");

  let activeTransporter = createProductionTransporter(primaryPort)!;
  let activePort = primaryPort;

  try {
    await activeTransporter.verify();
    console.log("[SMTP CHECK]");
    console.log("CONNECTED: YES");
  } catch (err: any) {
    console.warn(`[SMTP TEST] Primary port ${primaryPort} verify failed (${err?.message}). Attempting fallback port ${fallbackPort}...`);
    const fallbackTransporter = createProductionTransporter(fallbackPort);
    if (fallbackTransporter) {
      try {
        await fallbackTransporter.verify();
        activeTransporter = fallbackTransporter;
        activePort = fallbackPort;
        console.log("[SMTP CHECK]");
        console.log("CONNECTED: YES");
      } catch (fallbackErr: any) {
        console.log("[SMTP CHECK]");
        console.log("CONNECTED: NO");
        const safeError = `SMTP connection failed. Primary port (${primaryPort}): ${err?.message || "Timeout"}; Fallback port (${fallbackPort}): ${fallbackErr?.message || "Timeout"}`;
        logEmailFlow("TEST_EMAIL", recipient, false, safeError);
        return {
          success: false,
          smtpConfigured: true,
          smtpConnected: false,
          emailSent: false,
          error: safeError,
        };
      }
    } else {
      console.log("[SMTP CHECK]");
      console.log("CONNECTED: NO");
      const safeError = `SMTP connection failed on port ${primaryPort}: ${err?.message || "Timeout"}`;
      logEmailFlow("TEST_EMAIL", recipient, false, safeError);
      return {
        success: false,
        smtpConfigured: true,
        smtpConnected: false,
        emailSent: false,
        error: safeError,
      };
    }
  }

  try {
    await activeTransporter.sendMail({
      from: from || user,
      to: recipient,
      subject: "Real SMTP Delivery Test - M/S SUSHANT CONSTRUCTION",
      text: `Hello!\n\nThis is an automated real SMTP delivery test from MS Sushant Construction API.\n\nTime: ${new Date().toISOString()}\nSMTP Host: ${host}\nSMTP Port: ${activePort}\nUser: ${user}\n\nIf you are reading this email, real email delivery is working perfectly!`,
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
              <tr><td style="padding: 6px 0; font-weight: bold;">SMTP Port:</td><td>${activePort}</td></tr>
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

    console.log(`[SMTP TEST] Test email delivered SUCCESS to ${recipient}`);
    logEmailFlow("TEST_EMAIL", recipient, true);
    return {
      success: true,
      smtpConfigured: true,
      smtpConnected: true,
      emailSent: true,
      message: "Test email sent successfully",
    };
  } catch (err: any) {
    const errMsg = `Failed to send email to ${recipient}: ${err?.message || String(err)}`;
    console.error(`[SMTP TEST] Test email send failed to ${recipient}:`, err?.message || err);
    logEmailFlow("TEST_EMAIL", recipient, false, errMsg);
    return {
      success: false,
      smtpConfigured: true,
      smtpConnected: true,
      emailSent: false,
      error: errMsg,
    };
  }
}
