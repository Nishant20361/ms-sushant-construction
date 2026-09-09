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
    if (admin.passwordChangedAt && payload.iat) {
      const tokenIssuedAtMs = payload.sessionIssuedAtMs ?? payload.iat * 1000;
      if (tokenIssuedAtMs <= admin.passwordChangedAt.getTime()) {
        return next(new HttpError(401, "Session expired due to password change"));
      }
    }
    if (payload.sessionId) {
      const session = await prisma.adminSession.findUnique({
        where: { id: payload.sessionId },
      });
      if (!session || session.expiresAt < new Date()) {
        return next(
          new HttpError(
            401,
            "Logged out: Maximum active device limit (6 phones) was reached or session expired."
          )
        );
      }
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (session.lastActiveAt < fiveMinutesAgo) {
        prisma.adminSession
          .update({
            where: { id: session.id },
            data: { lastActiveAt: new Date() },
          })
          .catch(() => {});
      }
    }
    req.admin = {
      sub: String(admin.id),
      username: admin.username,
      role: admin.role,
      sessionId: payload.sessionId,
    };
    return next();
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    return next(new HttpError(401, "Invalid or expired session"));
  }
}
