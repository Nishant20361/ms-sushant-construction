import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { assertTestDatabaseUrl } from "./tests/databaseSafety.js";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Only an explicit, isolated test database may be provisioned and cleared.
dotenv.config({ path: path.join(__dirname, ".env.test") });

const TEST_DATABASE_URL = assertTestDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL);

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 15000,
    hookTimeout: 30000,
    // These integration tests share a single test database and each file
    // calls deleteMany() + reseeds in beforeAll. Running them in parallel
    // causes them to interfere with each other, so run files sequentially.
    fileParallelism: false,
    globalSetup: ["./tests/globalSetup.ts"],
    // Runs before every test file is loaded. Guarantees DATABASE_URL is the
    // isolated test DB before `src/db.ts` instantiates PrismaClient.
    setupFiles: ["./tests/testEnv.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      TEST_DATABASE_URL,
    },
  },
});
