import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root (one level up from server/src)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const isProd = process.env.NODE_ENV === "production";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    // In production a missing secret is fatal; in dev we fall back to a dev-only
    // random value so the project can start immediately. Never log the value.
    if (isProd) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    console.warn(`[config] WARNING: ${name} not set - using development default.`);
    return `dev_${name}_${Math.random().toString(36).slice(2)}`;
  }
  return value;
}

export const config = {
  env: process.env.NODE_ENV ?? "development",
  isProd,
  port: Number(process.env.PORT) || 5100,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL || "file:./dev.db",
  jwtSecret: required("JWT_SECRET"),
  cookieDomain: process.env.COOKIE_DOMAIN || "",
  initialAdmin: {
    username: process.env.INITIAL_ADMIN_USERNAME || "admin",
    password: process.env.INITIAL_ADMIN_PASSWORD || "",
    email: process.env.INITIAL_ADMIN_EMAIL || "",
  },
  cookieName: "ms_sushant_admin_token",
};

