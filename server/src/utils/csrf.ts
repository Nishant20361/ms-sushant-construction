import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { HttpError } from "./httpError.js";
import { config } from "../config.js";

export const CSRF_COOKIE = "ms_sushant_csrf";
export const CSRF_HEADER = "x-csrf-token";

/**
 * Sends the CSRF token to the client as a readable cookie and returns the
 * token so the caller can also include it in the JSON response body.
 *
 * This is essential in production where the frontend and API are on different
 * origins: the cookie belongs to the API origin, so it is NOT visible via
 * `document.cookie` on the frontend origin. The SPA must therefore receive the
 * token in the response body and echo it back in the X-CSRF-Token header while
 * the browser automatically sends the cookie with credentials: "include".
 */
export function issueCsrfToken(req: Request, res: Response): string {
  let token = (req.cookies as Record<string, string> | undefined)?.[CSRF_COOKIE];
  if (!token) {
    token = crypto.randomBytes(32).toString("hex");
  }
  const sameSite: "none" | "strict" = config.isProd ? "none" : "strict";
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // must be readable by frontend JS
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
    // Cross-origin (different subdomain) in production requires SameSite=None
    // so the browser sends the cookie with cross-origin fetch requests.
    sameSite,
    domain: config.cookieDomain || undefined,
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
  });
  return token;
}

/**
 * Validates the CSRF token for state-changing requests.
 */
export function csrfProtect(req: Request, _res: Response, next: NextFunction): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Native customers do not authenticate with browser cookies, so the
  // double-submit-cookie CSRF mechanism is not applicable to these two
  // explicitly reviewed, unauthenticated mutations. Both endpoints retain
  // their Zod validation and dedicated rate limiters. The legacy website
  // routes (/orders and /construction-assistant/chat) and every admin route
  // remain CSRF protected.
  const nativePublicMutations = new Set([
    "/public/orders",
    "/public/construction-assistant/chat",
  ]);
  if (req.method === "POST" && nativePublicMutations.has(req.path)) {
    return next();
  }

  const cookies = (req.cookies as Record<string, string> | undefined) ?? {};
  const cookieToken = cookies[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER);
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new HttpError(403, "CSRF token missing or invalid"));
  }
  return next();
}
