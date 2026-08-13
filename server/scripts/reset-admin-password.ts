/**
 * Dev-only admin credential utility.
 *
 * Usage:
 *   npm run db:reset-admin            # reset the admin password to INITIAL_ADMIN_PASSWORD from .env
 *   npm run db:reset-admin -- --check # verify only: prints MATCH or NO_MATCH (never prints secrets)
 *
 * This script:
 *   - never prints the password or the password hash
 *   - only updates the password of the selected admin (INITIAL_ADMIN_USERNAME)
 *   - requires INITIAL_ADMIN_PASSWORD to be set in .env (>= 12 chars)
 */
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { hashPassword, verifyPassword } from "../src/utils/password";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// This script lives in server/scripts/ -> project root is two levels up.
const rootDir = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(rootDir, ".env") });

const prisma = new PrismaClient();

const checkOnly = process.argv.includes("--check");
const username = process.env.INITIAL_ADMIN_USERNAME || "admin";
const password = process.env.INITIAL_ADMIN_PASSWORD || "";

async function main() {
  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin) {
    console.error(`Admin "${username}" not found in the database.`);
    process.exit(1);
  }

  if (!password || password.length < 12) {
    console.error("INITIAL_ADMIN_PASSWORD must be set in .env and be at least 12 characters.");
    process.exit(1);
  }

  if (checkOnly) {
    const ok = await verifyPassword(password, admin.passwordHash);
    console.log(ok ? "MATCH" : "NO_MATCH");
    if (!ok) process.exitCode = 1;
    return;
  }

  // Explicit reset: update only the selected admin's password hash.
  const passwordHash = await hashPassword(password);
  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash, passwordChangedAt: new Date() } });
  console.log(`✔ Admin "${username}" password reset to the value of INITIAL_ADMIN_PASSWORD.`);
}

main()
  .catch((e) => {
    console.error("Failed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

