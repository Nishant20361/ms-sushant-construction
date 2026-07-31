import rateLimit from "express-rate-limit";

const minute = 60 * 1000;

const isDev = process.env.NODE_ENV !== "production";

/**
 * General API rate limit applied to all /api routes.
 * Development is more forgiving so that the Vite dev server, HMR, and
 * browsing/polling never trip the limit; production stays at 300/15min.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * minute,
  limit: isDev ? 2000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

/** Strict limiter for the login endpoint. */
export const loginLimiter = rateLimit({
  windowMs: 15 * minute,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again after 15 minutes." },
});

/** Strict limiter for order/checkout creation. */
export const orderLimiter = rateLimit({
  windowMs: 15 * minute,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many orders placed. Please try again later." },
});

