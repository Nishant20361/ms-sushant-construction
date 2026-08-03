/**
 * Vitest setup file (runs before EACH test file is loaded).
 *
 * This is the crucial piece that fixes PrismaClientInitializationError /
 * P1010 in the test suite:
 *
 *   - It loads server/.env (dev fallback) and server/.env.test (test env).
 *   - It FORCES DATABASE_URL to the isolated test database BEFORE
 *     `src/db.ts` is imported, so `new PrismaClient()` inside the test
 *     worker connects to `ms_sushant_test` — never the dev or production
 *     (Render) database.
 *   - The connection string includes the username (`nishantkumar@`), so
 *     PostgreSQL never sees an empty user (which caused P1010
 *     "User `` was denied access on the database ms_sushant_test.public").
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, "..");

// Load dev .env first (dotenv does NOT override existing process.env),
// then .env.test on top. Explicit overrides below are authoritative.
dotenv.config({ path: path.join(serverDir, ".env") });
dotenv.config({ path: path.join(serverDir, ".env.test") });

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://nishantkumar@localhost:5432/ms_sushant_test?schema=public";

// Force the test worker to use the isolated test database. Setting it here
// (before any module that imports PrismaClient is evaluated) guarantees the
// correct DATABASE_URL at PrismaClient construction time.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.TEST_DATABASE_URL = TEST_DATABASE_URL;

