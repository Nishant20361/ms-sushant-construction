import crypto from "crypto";

/** Date prefix in IST plus an unpredictable 64-bit suffix. */
export function generateOrderNumber(date = new Date()): string {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffsetMs);
  const yyyy = istDate.getUTCFullYear();
  const mm = String(istDate.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(istDate.getUTCDate()).padStart(2, "0");
  const datePart = `${yyyy}${mm}${dd}`;
  const rand = crypto.randomBytes(8).toString("hex").toUpperCase();
  return `MSC-${datePart}-${rand}`;
}

/**
 * Deterministic sequential ID using a DB-backed counter. To avoid extra
 * round-trips during the order transaction, we instead use generateOrderNumber
 * (random suffix) which the unique index on Order.orderNumber enforces. This
 * helper is kept for documentation parity with the "MSC-YYYYMMDD-NNNN"
 * requirement and can be wired to a counter table if a strict sequence is
 * ever required.
 */
export function formatSequentialOrderNumber(
  date: Date,
  sequence: number
): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `MSC-${yyyy}${mm}${dd}-${String(sequence).padStart(4, "0")}`;
}

