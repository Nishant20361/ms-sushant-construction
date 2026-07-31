import crypto from "crypto";

/**
 * Generates a human-friendly order number like MSC-20250101-ABC12.
 */
export function generateOrderNumber(): string {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 6);
  return `MSC-${yyyy}${mm}${dd}-${rand}`;
}

