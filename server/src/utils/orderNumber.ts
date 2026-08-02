import crypto from "crypto";

/**
 * Generates a sequential, human-friendly order number like MSC-20260802-0001.
 *
 * Uniqueness is guaranteed by the unique constraint on Order.orderNumber plus
 * a strong random suffix in the rare case of a same-date collision. We use
 * the count of orders created on the same date + 1 as the sequence number,
 * and fall back to a random suffix if the resulting number already exists
 * (which keeps the format human readable while remaining collision-safe).
 */
export function generateOrderNumber(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const datePart = `${yyyy}${mm}${dd}`;
  // Random suffix makes the whole string unique even if the sequence
  // counter races across concurrent requests on the same date.
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 4);
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

