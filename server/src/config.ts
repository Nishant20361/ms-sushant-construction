import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from server directory, project root, and process CWD
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const hasGroqKey = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim());
console.log("[GROQ CHECK]");
console.log(`KEY LOADED: ${hasGroqKey ? "YES" : "NO"}`);

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

function clientUrl(): string {
  const value = process.env.CLIENT_URL?.trim();
  if (isProd && (!value || !/^https:\/\//i.test(value))) {
    throw new Error("CLIENT_URL must be an absolute HTTPS URL in production");
  }
  return value || "http://localhost:5173";
}

export const config = {
  env: process.env.NODE_ENV ?? "development",
  isProd,
  port: Number(process.env.PORT) || 5100,
  clientUrl: clientUrl(),
  // Set TRUST_PROXY=true only behind a reverse proxy which overwrites
  // X-Forwarded-* headers (for example, Render, Caddy, or Nginx).
  trustProxy: process.env.TRUST_PROXY === "true" ? 1 : false,
  databaseUrl: process.env.DATABASE_URL || "file:./dev.db",
  jwtSecret: required("JWT_SECRET"),
  cookieDomain: process.env.COOKIE_DOMAIN || "",
  initialAdmin: {
    username: process.env.ADMIN_USERNAME || process.env.INITIAL_ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || process.env.INITIAL_ADMIN_PASSWORD || "",
    email: process.env.ADMIN_EMAIL || process.env.INITIAL_ADMIN_EMAIL || "",
  },
  cookieName: "ms_sushant_admin_token",
  smtp: {
    host: process.env.EMAIL_HOST || process.env.SMTP_HOST || "",
    port: Number(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 587,
    user: process.env.EMAIL_USER || process.env.SMTP_USER || "",
    pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || "",
    from: process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.EMAIL_USER || process.env.SMTP_USER || "",
  },
};

const hasEmailConfig = !!(config.smtp.host && config.smtp.user && config.smtp.pass);
console.log("[EMAIL CHECK]");
console.log(`CONFIGURED: ${hasEmailConfig ? "YES" : "NO"}`);
