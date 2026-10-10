import { describe, expect, it } from "vitest";
import { isWholeUnit, parseQuantityInput, sanitizeQuantityInput } from "./quantityInput";

describe("customer-order quantity editing", () => {
  it("keeps blank and decimal drafts editable instead of snapping back", () => {
    expect(sanitizeQuantityInput("")).toBe("");
    expect(sanitizeQuantityInput("0.")).toBe("0.");
    expect(sanitizeQuantityInput("0,5")).toBe("0.5");
    expect(parseQuantityInput("0.5", "kg", 10)).toBe(0.5);
  });
  it("matches warehouse whole-unit rules, including long product-unit labels", () => {
    for (const unit of ["piece (12 m)", "sheets", "Bag", "bottles", "roll"]) {
      expect(isWholeUnit(unit)).toBe(true);
      expect(parseQuantityInput("1.5", unit, 20)).toBeNull();
      expect(parseQuantityInput("12", unit, 20)).toBe(12);
    }
  });
  it("rejects incomplete, zero, malformed and over-stock quantities", () => {
    for (const value of ["", ".", "0", "Infinity", "1.2.3", "-1", "11"]) {
      expect(parseQuantityInput(value, "kg", 10)).toBeNull();
    }
    expect(sanitizeQuantityInput("1.2.3")).toBeNull();
  });
});
