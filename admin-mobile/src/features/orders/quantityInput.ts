const wholeUnits = new Set(["bag", "bags", "piece", "pieces", "sheet", "sheets", "unit", "units", "bottle", "bottles", "can", "cans", "box", "boxes", "roll", "rolls"]);

export function isWholeUnit(unit: string): boolean {
  return wholeUnits.has(unit.trim().toLowerCase().split(/[\s(]/, 1)[0]);
}

/** Preserve intermediate edits such as an empty field or "0.". */
export function sanitizeQuantityInput(text: string): string | null {
  const value = text.replace(/,/g, ".");
  return /^\d*\.?\d*$/.test(value) ? value : null;
}

export function parseQuantityInput(text: string, unit: string, stock: number): number | null {
  if (!text.trim()) return null;
  const quantity = Number(text);
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > stock) return null;
  if (isWholeUnit(unit) && !Number.isInteger(quantity)) return null;
  return quantity;
}
