import {
  sendOrderNotificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  testSmtpConnection,
  type OrderEmailData,
  type OrderItemEmailData,
} from "../services/email.service.js";

export {
  sendOrderNotificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  testSmtpConnection,
};

export type { OrderEmailData, OrderItemEmailData };

/**
 * Backward compatibility alias for sendOrderNotificationEmail
 */
export async function sendAdminNewOrderEmail(
  to: string,
  order: OrderEmailData
): Promise<boolean> {
  return sendOrderNotificationEmail(to, order);
}

/**
 * Backward compatibility alias for sendPasswordResetEmail
 */
export async function sendAdminPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<boolean> {
  return sendPasswordResetEmail(to, resetUrl);
}
