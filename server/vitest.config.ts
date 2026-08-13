import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load server/.env (dev) and server/.env.test (test) at CONFIG LOAD time so
// the default DATABASE_URL handed to the test workers is the isolated test
// database, not the dev/production (Render) URL.
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, ".env.test") });

// NOTE: never omit the username in the fallback. A bare
// "postgresql://localhost:5432/..." makes Prisma connect with an EMPTY user
// and PostgreSQL rejects it (PrismaClientInitializationError P1010).
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

if (!TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL must be set to an isolated database before running tests.");
}

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
