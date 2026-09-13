import dotenv from "dotenv";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertTestDatabaseUrl } from "./databaseSafety.js";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(serverDir, ".env.test") });

export default function setup(): void {
  const databaseUrl = assertTestDatabaseUrl(process.env.TEST_DATABASE_URL);
  execFileSync(process.execPath, [path.join(serverDir, "../node_modules/prisma/build/index.js"), "db", "push", "--accept-data-loss", "--skip-generate"], {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });
}
