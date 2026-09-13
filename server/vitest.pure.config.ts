import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: { NODE_ENV: "test" },
    include: ["tests/push.service.test.ts", "tests/bill.test.ts", "tests/report.test.ts", "tests/profitDateRange.test.ts", "tests/groq.test.ts", "tests/databaseSafety.test.ts", "tests/providerSafety.test.ts", "tests/config.test.ts"],
  },
});
