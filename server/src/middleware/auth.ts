import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../types.js";
import { verifyAdminToken } from "../utils/token.js";
import { HttpError } from "../utils/httpError.js";
import { config } from "../config.js";
import { prisma } from "../db.js";

/**
 * Protects admin-only routes. Verifies the HttpOnly cookie token and that
 * the admin still exists and is active.
 */
export async function requireAdmin(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = (req.cookies as Record<string, string> | undefined)?.[config.cookieName];
    if (!token) {
      return next(new HttpError(401, "Not authenticated"));
    }
    const payload = verifyAdminToken(token);
    const admin = await prisma.admin.findUnique({
      where: { id: Number(payload.sub) },
    });
    if (!admin || !admin.isActive) {
      return next(new HttpError(401, "Account disabled or removed"));
    }
    req.admin = {
      sub: String(admin.id),
      username: admin.username,
      role: admin.role,
    };
    return next();
  } catch {
    return next(new HttpError(401, "Invalid or expired session"));
  }
}

