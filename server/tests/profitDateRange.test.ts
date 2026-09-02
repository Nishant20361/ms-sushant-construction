import { describe, expect, it } from "vitest";
import { parseProfitDateRange } from "../src/utils/profitDateRange.js";

describe("parseProfitDateRange", () => {
  it("accepts inclusive ISO date ranges and single-ended ranges", () => {
    expect(parseProfitDateRange("2026-08-01", "2026-09-02")).toEqual({
      from: "2026-08-01",
      to: "2026-09-02",
    });
    expect(parseProfitDateRange("2026-09-02", undefined)).toEqual({
      from: "2026-09-02",
      to: undefined,
    });
  });

  it.each([
    ["2026-02-30", undefined],
    ["02/09/2026", undefined],
    ["2026-09-03", "2026-09-02"],
    [["2026-09-02"], undefined],
  ])("rejects invalid range %j to %j", (from, to) => {
    expect(() => parseProfitDateRange(from, to)).toThrow();
  });
});
