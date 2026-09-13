import dotenv from "dotenv";
import crypto from "node:crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from server directory, project root, and process CWD
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const isProd = process.env.NODE_ENV === "production";

function jwtSecret(): string {
  const value = process.env.JWT_SECRET?.trim();
  if (isProd && (!value || value.length < 32 || /change-me|development|use-a-long|your-secret/i.test(value))) {
    throw new Error("JWT_SECRET must be a non-placeholder random secret of at least 32 characters in production");
  }
  return value || crypto.randomBytes(32).toString("hex");
}

function clientUrl(): string {
  const value = process.env.CLIENT_URL?.trim() || (isProd ? "" : "http://localhost:5173");
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || (isProd && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error();
    return url.origin;
  } catch {
    throw new Error("CLIENT_URL must be an absolute origin without a path, credentials, query or fragment; HTTPS is required in production");
  }
}

function databaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (isProd && (!value || !/^postgres(ql)?:\/\//.test(value))) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection URL in production");
  }
  return value || "";
}

export const config = {
  env: process.env.NODE_ENV ?? "development",
  isProd,
  port: Number(process.env.PORT) || 5100,
  clientUrl: clientUrl(),
  // Render always terminates TLS and forwards requests through its trusted
  // proxy. Other hosts must explicitly opt in with TRUST_PROXY=true.
  trustProxy: process.env.TRUST_PROXY === "true" || !!process.env.RENDER_SERVICE_ID ? 1 : false,
  databaseUrl: databaseUrl(),
  jwtSecret: jwtSecret(),
  cookieDomain: process.env.COOKIE_DOMAIN || "",
  initialAdmin: {
    username: process.env.ADMIN_USERNAME || process.env.INITIAL_ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || process.env.INITIAL_ADMIN_PASSWORD || "",
    email: process.env.ADMIN_EMAIL || process.env.INITIAL_ADMIN_EMAIL || "",
  },
  cookieName: "ms_sushant_admin_token",
  brevo: {
    apiKey: process.env.BREVO_API_KEY?.trim() || "",
  },
  smtp: {
    host: process.env.EMAIL_HOST || process.env.SMTP_HOST || "",
    port: Number(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 587,
    user: process.env.EMAIL_USER || process.env.SMTP_USER || "",
    pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || "",
    from: process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.EMAIL_USER || process.env.SMTP_USER || "",
  },
};
