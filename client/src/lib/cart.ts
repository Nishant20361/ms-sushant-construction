import type { CartItem } from "../types";

const wholeUnits = new Set(["bag", "bags", "piece", "pieces", "sheet", "sheets", "unit", "units", "bottle", "bottles", "can", "cans", "box", "boxes", "roll", "rolls"]);
export function clampCartQuantity(quantity: number, unit: string, stock: number): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(stock) || stock <= 0) return 0;
  const whole = wholeUnits.has(unit.trim().toLowerCase().split(/[\s(]/, 1)[0]);
  const available = whole ? Math.floor(stock) : Math.floor(stock * 1000) / 1000;
  const desired = whole ? Math.floor(quantity) : Math.round(quantity * 1000) / 1000;
  return Math.min(available, Math.max(whole ? 1 : 0.001, desired));
}

export function parseCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<number>();
  return value.filter((item): item is CartItem => {
    if (!item || !Number.isSafeInteger(item.productId) || item.productId <= 0 || seen.has(item.productId) ||
        typeof item.name !== "string" || typeof item.unit !== "string" ||
        !Number.isFinite(item.price) || item.price < 0 || !Number.isFinite(item.mrp) || item.mrp < 0 ||
        !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.maxStock) || item.maxStock <= 0) return false;
    seen.add(item.productId);
    return true;
  }).map((item) => ({ ...item, quantity: clampCartQuantity(item.quantity, item.unit, item.maxStock) }))
    .filter((item) => item.quantity > 0);
}
