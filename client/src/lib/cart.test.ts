import { describe, expect, it } from "vitest";
import { clampCartQuantity, parseCart } from "./cart";

describe("persisted cart validation", () => {
  const valid = { productId: 1, name: "Cement", unit: "bag", price: 100, mrp: 110, quantity: 2, maxStock: 10, imageUrl: null };
  it("discards corrupt data and duplicate items", () => {
    expect(parseCart([null, valid, valid, { productId: 2 }, { ...valid, productId: 3, quantity: "3" }, { ...valid, productId: 4, price: Infinity }])).toEqual([valid]);
    expect(parseCart({ items: [valid] })).toEqual([]);
  });
  it("clamps whole-unit quantities consistently with the server", () => {
    for (const unit of ["bag", "Bags", "sheet", "bottle", "boxes", "roll (10m)"]) {
      expect(clampCartQuantity(2.5, unit, 2.5)).toBe(2);
      expect(clampCartQuantity(1, unit, 0.5)).toBe(0);
    }
  });
  it("rejects non-finite and unavailable stock and permits fractional materials", () => {
    expect(clampCartQuantity(NaN, "kg", 10)).toBe(0);
    expect(clampCartQuantity(2, "kg", 0)).toBe(0);
    expect(clampCartQuantity(0.75, "kg", 0.5)).toBe(0.5);
    expect(parseCart([{ ...valid, quantity: 20 }])[0].quantity).toBe(10);
  });
});
