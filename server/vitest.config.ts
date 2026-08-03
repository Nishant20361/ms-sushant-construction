import { defineConfig } from "vitest/config";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load server/.env (dev) and server/.env.test (test) at CONFIG LOAD time so
// the default DATABASE_URL handed to the test workers is the isolated test
// database, not the dev/production (Render) URL.
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, ".env.test") });

// NOTE: never omit the username in the fallback. A bare
// "postgresql://localhost:5432/..." makes Prisma connect with an EMPTY user
// and PostgreSQL rejects it (PrismaClientInitializationError P1010).
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://nishantkumar@localhost:5432/ms_sushant_test?schema=public";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 15000,
    hookTimeout: 30000,
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

