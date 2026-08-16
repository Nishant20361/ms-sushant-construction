export function isWholeNumberUnit(unit: string): boolean {
  const baseUnit = unit.trim().toLowerCase().split(/[\s(]/, 1)[0];
  return ["bag", "bags", "piece", "pieces", "sheet", "sheets", "unit", "units", "bottle", "bottles", "can", "cans", "box", "boxes", "roll", "rolls"].includes(baseUnit);
}

export type QuantityValidation = { quantity: number | null; error: string };

export function validateQuantityInput(rawValue: string, unit: string, maxStock: number): QuantityValidation {
  const value = rawValue.trim();
  if (!value) return { quantity: null, error: "Enter a quantity." };
  if (!/^(?:\d+|\d*\.\d{1,3})$/.test(value)) return { quantity: null, error: "Enter a valid quantity using up to 3 decimal places." };
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) return { quantity: null, error: "Quantity must be greater than zero." };
  if (isWholeNumberUnit(unit) && !Number.isInteger(quantity)) return { quantity: null, error: `${unit} quantity must be a whole number.` };
  if (quantity > maxStock) return { quantity: null, error: `Only ${maxStock} ${unit} available.` };
  return { quantity, error: "" };
}

export function normalizeQuantity(value: number, unit: string, maxStock = Number.POSITIVE_INFINITY): number {
  if (!Number.isFinite(value)) return isWholeNumberUnit(unit) ? 1 : 0.001;
  const minimum = isWholeNumberUnit(unit) ? 1 : 0.001;
  const normalized = isWholeNumberUnit(unit) ? Math.floor(value) : Math.round(value * 1000) / 1000;
  return Math.min(Math.max(normalized, minimum), Math.max(maxStock, minimum));
}
