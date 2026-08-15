export function isWholeNumberUnit(unit: string): boolean {
  return ["bag", "piece"].includes(unit.trim().toLowerCase());
}

export function normalizeQuantity(value: number, unit: string, maxStock = Number.POSITIVE_INFINITY): number {
  if (!Number.isFinite(value)) return isWholeNumberUnit(unit) ? 1 : 0.001;
  const minimum = isWholeNumberUnit(unit) ? 1 : 0.001;
  const normalized = isWholeNumberUnit(unit) ? Math.floor(value) : Math.round(value * 1000) / 1000;
  return Math.min(Math.max(normalized, minimum), Math.max(maxStock, minimum));
}
