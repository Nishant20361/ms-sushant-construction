import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 15000,
    hookTimeout: 30000,
    globalSetup: ["./tests/globalSetup.ts"],
    env: {
      // Isolate the test suite from the dev database. The globalSetup
      // provisions this file via Prisma migrations.
      DATABASE_URL: "file:./test.db",
    },
  },
});

