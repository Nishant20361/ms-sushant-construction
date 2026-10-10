import { NextFunction, Response } from "express";
import { prisma } from "../db.js";
import { AuthenticatedRequest } from "../types.js";
import { HttpError } from "../utils/httpError.js";

export const KHATABOOK_UNLOCK_MS = 15 * 60 * 1000;

/** Call after requireAdmin. Unlocks belong to one authenticated device session. */
export async function requireKhatabook(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const session = req.admin?.sessionId
      ? await prisma.adminSession.findUnique({ where: { id: req.admin.sessionId } })
      : null;
    if (!session || session.adminId !== Number(req.admin?.sub) || session.expiresAt <= new Date() ||
        !session.khatabookUnlockedUntil || session.khatabookUnlockedUntil <= new Date()) {
      return next(new HttpError(403, "Unlock Khatabook with your PIN before accessing this data."));
    }
    next();
  } catch (error) { next(error); }
}
