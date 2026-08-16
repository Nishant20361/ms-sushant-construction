export function normalizeIndianMobile(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  const normalized = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.length === 11 && digits.startsWith("0") ? digits.slice(1) : digits;
  return /^[6-9]\d{9}$/.test(normalized) ? normalized : null;
}

export interface CheckoutErrors { customerName?: string; customerMobile?: string; deliveryAddress?: string; notes?: string }

export function validateCheckout(values: { customerName: string; customerMobile: string; deliveryAddress: string; notes: string }): CheckoutErrors {
  const errors: CheckoutErrors = {};
  const name = values.customerName.trim();
  const address = values.deliveryAddress.trim();
  if (name.length < 2) errors.customerName = "Enter your full name.";
  else if (name.length > 120) errors.customerName = "Name must be 120 characters or fewer.";
  if (!normalizeIndianMobile(values.customerMobile)) errors.customerMobile = "Enter a valid 10-digit mobile number.";
  if (address.length > 500) errors.deliveryAddress = "Address must be 500 characters or fewer.";
  if (values.notes.trim().length > 1000) errors.notes = "Notes must be 1,000 characters or fewer.";
  return errors;
}
