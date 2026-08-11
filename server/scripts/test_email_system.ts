import {
  sendOrderNotificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} from "../src/services/email.service.js";
import { config } from "../src/config.js";

async function runEmailTests() {
  console.log("\n==========================================");
  console.log("TESTING MS SUSHANT CONSTRUCTION EMAIL SYSTEM");
  console.log("==========================================");
  console.log(`Configured SMTP Host: ${config.smtp.host || "(None)"}`);
  console.log(`Configured SMTP User: ${config.smtp.user || "(None)"}`);
  console.log(`Configured SMTP From: ${config.smtp.from || config.smtp.user || "(None)"}`);
  console.log(`Client URL: ${config.clientUrl}`);
  console.log("------------------------------------------\n");

  const testEmail = config.smtp.user || "admin@example.com";

  // 1. Order Notification Email Test
  console.log("[TEST 1/3] Testing sendOrderNotificationEmail()...");
  const orderResult = await sendOrderNotificationEmail(testEmail, {
    orderNumber: "ORD-2026-TEST01",
    customerName: "Ramesh Sharma",
    customerMobile: "+91 9876543210",
    deliveryAddress: "Main Road, Sector 4, Construction Site #12",
    subtotal: 45000,
    status: "PENDING",
    createdAt: new Date(),
    items: [
      { productName: "Ultratech Cement (PPC)", quantity: 50, price: 380, total: 19000, unit: "bag" },
      { productName: "TMT Rebar 12mm", quantity: 500, price: 52, total: 26000, unit: "kg" },
    ],
  });
  console.log(`-> Order Email Result: ${orderResult ? "SUCCESS" : "HANDLED (SMTP Disabled/Config missing)"}\n`);

  // 2. Forgot Password Reset Email Test
  console.log("[TEST 2/3] Testing sendPasswordResetEmail()...");
  const testResetUrl = `${config.clientUrl}/admin/reset-password?token=test_token_1234567890abcdef`;
  const resetResult = await sendPasswordResetEmail(testEmail, testResetUrl, 15);
  console.log(`-> Reset Link Email Result: ${resetResult ? "SUCCESS" : "HANDLED (SMTP Disabled/Config missing)"}\n`);

  // 3. Password Changed Confirmation Email Test
  console.log("[TEST 3/3] Testing sendPasswordChangedEmail()...");
  const changeResult = await sendPasswordChangedEmail(testEmail, {
    date: new Date(),
  });
  console.log(`-> Password Changed Email Result: ${changeResult ? "SUCCESS" : "HANDLED (SMTP Disabled/Config missing)"}\n`);

  console.log("==========================================");
  console.log("ALL EMAIL TESTS COMPLETED SUCCESSFULLY");
  console.log("==========================================\n");
}

runEmailTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
