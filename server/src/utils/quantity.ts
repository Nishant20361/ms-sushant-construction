const wholeNumberUnits = new Set(["bag", "bags", "piece", "pieces", "sheet", "sheets", "unit", "units", "bottle", "bottles", "can", "cans", "box", "boxes", "roll", "rolls"]);

export function isWholeNumberUnit(unit: string): boolean {
  return wholeNumberUnits.has(unit.trim().toLowerCase().split(/[\s(]/, 1)[0]);
}

export function quantityMatchesUnit(quantity: number, unit: string): boolean {
  return !isWholeNumberUnit(unit) || Number.isInteger(quantity);
}
