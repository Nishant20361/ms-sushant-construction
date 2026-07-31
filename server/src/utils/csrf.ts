import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { HttpError } from "./httpError.js";

export const CSRF_COOKIE = "ms_sushant_csrf";
export const CSRF_HEADER = "x-csrf-token";

/**
 * Sends the CSRF token to the client as a readable cookie.
 * The client must echo it back in the `X-CSRF-Token` header for any
 * authenticated state-changing request.
 */
export function issueCsrfToken(req: Request, res: Response): void {
  let token = (req.cookies as Record<string, string> | undefined)?.[CSRF_COOKIE];
  if (!token) {
    token = crypto.randomBytes(32).toString("hex");
  }
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // must be readable by frontend JS
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
    sameSite: "strict",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
  });
}

/**
 * Validates the CSRF token for state-changing requests.
 */
export function csrfProtect(req: Request, _res: Response, next: NextFunction): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
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

