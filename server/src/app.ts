import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import { generalLimiter } from "./middleware/rateLimit.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { csrfProtect, issueCsrfToken } from "./utils/csrf.js";
import publicRoutes from "./routes/public.js";
import constructionAssistantRoutes from "./routes/constructionAssistant.js";
import constructionKnowledgeRoutes from "./routes/constructionKnowledge.js";
import adminRoutes from "./routes/admin/index.js";
import { isUploadedFileSafe, UPLOAD_DIR } from "./middleware/upload.js";
import { testSmtpConnection } from "./services/email.service.js";
import { asyncHandler } from "./utils/asyncHandler.js";

export function createApp() {
  const app = express();

  // ---------- Security headers ----------
  app.set("trust proxy", 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https:"],
          connectSrc: ["'self'", config.clientUrl],
          frameSrc: ["https://www.google.com", "https://maps.google.com"],
        },
      },
    })
  );

  // ---------- CORS (allowlist only) ----------
  // In development we also allow every loopback origin (localhost, 127.0.0.1,
  // [::1]) so the admin panel works regardless of which hostname is used to
  // open the Vite dev server. In production only CLIENT_URL is allowed.
  const allowedOrigins = [config.clientUrl].filter(Boolean);
  const isLoopbackOrigin = (origin: string): boolean => {
    try {
      const host = new URL(origin).hostname;
      return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
    } catch {
      return false;
    }
  };
  app.use(
    cors({
      origin(origin, cb) {
        // Allow same-origin (no Origin header) and allowlisted origins.
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        if (config.env === "development" && isLoopbackOrigin(origin)) return cb(null, true);
        return cb(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "X-CSRF-Token", "X-Requested-With"],
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  // ---------- Rate limiting (general) ----------
  app.use("/api", generalLimiter);

  // ---------- Root status ----------
  app.get("/", (_req, res) => {
    res.json({ success: true, message: "M/S Sushant Construction API running" });
  });

  // ---------- Health (no secrets) ----------
  app.get("/api/health", (_req, res) => {
    res.json({ success: true, status: "ok", service: "ms-sushant-construction", time: new Date().toISOString() });
  });

  // ---------- SMTP Test Diagnostic Endpoint ----------
  app.get(
    ["/api/test-email", "/api/public/test-email"],
    asyncHandler(async (req, res) => {
      const targetEmail = typeof req.query.to === "string" ? req.query.to.trim() : undefined;
      const result = await testSmtpConnection(targetEmail);
      res.json(result);
    })
  );

  // ---------- Public static uploads (safe allowlist only) ----------
  app.use(
    "/uploads",
    (req, res, next) => {
      const file = decodeURIComponent(req.path.slice(1));
      if (!isUploadedFileSafe(file)) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      next();
    },
    express.static(UPLOAD_DIR, { maxAge: "7d", immutable: false })
  );

  // ---------- CSRF token issuance for the SPA ----------
  app.get("/api/csrf", (req, res) => {
    const token = issueCsrfToken(req, res);
    res.json({ ok: true, token });
  });

  // ---------- CSRF protection for state-changing routes ----------
  app.use("/api", csrfProtect);

  // ---------- Routes ----------
  // Public routes are available at BOTH /api/* and /api/public/*.
  // The /api/public alias is a stable mount point; the existing /api/* paths
  // are kept so the SPA and tests keep working unchanged.
  app.use("/api", publicRoutes);
  app.use("/api/public", publicRoutes);
// Construction assistant available at both /api/* and /api/public/*.
  app.use("/api", constructionAssistantRoutes);
  app.use("/api/public", constructionAssistantRoutes);
// Construction knowledge (RAG) available at both /api/* and /api/public/*.
  app.use("/api", constructionKnowledgeRoutes);
  app.use("/api/public", constructionKnowledgeRoutes);
  // /api/construction-ai alias (matches the documented route namespace).
  app.use("/api/construction-ai", constructionKnowledgeRoutes);
  app.use("/api/admin", adminRoutes);

  // ---------- Errors ----------
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

