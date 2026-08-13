/**
 * Vitest global setup.
 *
 * Runs BEFORE the test workers start. It provisions an isolated PostgreSQL
 * database (ms_sushant_test) using Prisma db push, so the test suite never
 * touches the dev or production (Render) database.
 */
import dotenv from "dotenv";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, "..");

// Load server/.env and server/.env.test so TEST_DATABASE_URL is available.
// (vitest.config.ts already loads them, but globalSetup runs in a separate
// process scope, so load them again here to be safe.)
dotenv.config({ path: path.join(serverDir, ".env") });
dotenv.config({ path: path.join(serverDir, ".env.test") });

// PostgreSQL test database (isolated from dev/prod). Overridable via env so
// CI can point at its own Postgres instance. NOTE: the username MUST be part
// of the URL — an empty user causes PrismaClientInitializationError P1010.
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

if (!TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL must be set to an isolated database before running tests.");
}
if (TEST_DATABASE_URL === process.env.DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL must not be the same as DATABASE_URL.");
}

export default function setup(): () => void {
  // Provision schema via Prisma db push against the isolated test database.
  execSync("npx prisma db push --accept-data-loss --skip-generate", {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "inherit",
  });

  return () => {
    // Nothing to clean up for Postgres; tests delete their own rows.
  };
}
