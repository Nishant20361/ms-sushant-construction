/**
 * Admin password reset utility.
 *
 * Resets ONLY the password of an existing admin user. It never touches
 * username, email, role, isActive, or any other field, and makes no changes
 * to the database schema or authentication logic.
 *
 * Usage (from the server directory):
 *   npm run db:reset-admin                          # uses INITIAL_ADMIN_USERNAME / INITIAL_ADMIN_PASSWORD from .env
 *   npx tsx scripts/reset-admin.ts <username> <new-password>
 *
 * The new password must be at least 12 characters (matches the login UI's
 * strength requirement). The password is hashed with the same argon2id
 * utility used by the application (src/utils/password.ts).
 */
import { prisma } from "../src/db.js";
import { hashPassword, isStrongPassword } from "../src/utils/password.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env so INITIAL_ADMIN_USERNAME / INITIAL_ADMIN_PASSWORD are available.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(rootDir, ".env") });

// Prefer explicit CLI args (username, password); fall back to .env values.
const [cliUsername, cliPassword] = process.argv.slice(2);
const username = cliUsername || process.env.INITIAL_ADMIN_USERNAME || "admin";
const password = cliPassword || process.env.INITIAL_ADMIN_PASSWORD || "";

async function main(): Promise<void> {
  if (!password) {
    console.error(
      "No password provided. Pass it as an argument or set INITIAL_ADMIN_PASSWORD in .env."
    );
    process.exit(1);
  }

  if (!isStrongPassword(password)) {
    console.error("Password must be at least 12 characters long.");
    process.exit(1);
  }

  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin) {
    console.error(`Admin "${username}" not found in the database.`);
    process.exit(1);
  }

  // Hash with the same argon2id utility the app uses for authentication.
  const passwordHash = await hashPassword(password);

  // Update ONLY the password hash. Every other field is preserved.
  await prisma.admin.update({
    where: { id: admin.id },
    data: { passwordHash },
  });

  console.log(`✔ Admin "${username}" password reset successfully.`);
  console.log("   (username, email, role, and permissions were not changed)");
}

main()
  .catch((e) => {
    console.error("Failed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
