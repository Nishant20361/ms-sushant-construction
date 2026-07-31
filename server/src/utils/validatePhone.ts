/**
 * Validates an Indian 10-digit mobile number.
 * Accepts an optional leading "+91", "91", or "0" prefix.
 */
export function normalizeIndianMobile(raw: string): string | null {
  const cleaned = raw.replace(/[\s-]/g, "");
  const match = cleaned.match(/^(?:\+91|91|0)?([6-9]\d{9})$/);
  if (!match) return null;
  return match[1];
}

export function isValidIndianMobile(raw: string): boolean {
  return normalizeIndianMobile(raw) !== null;
}

