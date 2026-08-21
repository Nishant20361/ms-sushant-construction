import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

describe("React Native runtime regressions", () => {
  it("does not leave literal whitespace between conditional JSX siblings", () => {
    for (const file of [
      "./features/settings/SettingsScreen.tsx",
      "./features/finance/PaymentForm.tsx",
      "./features/insights/ReportsScreen.tsx",
    ]) expect(source(file), file).not.toMatch(/\/>}[ \t]+{/);
  });

  it("uses the datetimepicker 9 value and dismiss callbacks", () => {
    const reports = source("./features/insights/ReportsScreen.tsx");
    expect(reports).toContain("onValueChange=");
    expect(reports).toContain("onDismiss=");
    expect(reports).not.toMatch(/<DateTimePicker[^>]*\bonChange=/);
  });
});
