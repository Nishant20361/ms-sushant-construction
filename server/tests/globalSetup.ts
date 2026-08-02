/**
 * Vitest global setup.
 *
 * Runs BEFORE the test workers start. It provisions an isolated SQLite
 * database (server/prisma/test.db) using Prisma schema push, so the test
 * suite never touches the dev database (server/prisma/dev.db).
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const serverDir = path.resolve(__dirname, "..");
const prismaDir = path.join(serverDir, "prisma");

const TEST_DB_URL = "file:./test.db";
const TEST_DB_FILES = ["test.db", "test.db-journal"];

function removeTestDb() {
  for (const f of TEST_DB_FILES) {
    const p = path.join(prismaDir, f);
    if (fs.existsSync(p)) fs.rmSync(p, { force: true });
  }
}

export default function setup(): () => void {
  // Start from a clean isolated test database.
  removeTestDb();

  execSync("npx prisma db push --accept-data-loss", {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "inherit",
  });

  return () => {
    removeTestDb();
  };
}

