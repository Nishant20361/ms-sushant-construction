import { Router } from "express";
import { prisma } from "../../db.js";
import { config } from "../../config.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";
import { hashPassword, verifyPassword, isStrongPassword } from "../../utils/password.js";
import { signAdminToken } from "../../utils/token.js";
import { adminLoginSchema, changePasswordSchema } from "../../validators/index.js";
import { loginLimiter } from "../../middleware/rateLimit.js";
import { requireAdmin } from "../../middleware/auth.js";
import { writeAudit } from "../../middleware/audit.js";
import { issueCsrfToken } from "../../utils/csrf.js";
import { AuthenticatedRequest } from "../../types.js";
import { Request, Response } from "express";

const router = Router();

function setAdminCookie(res: Response, token: string): void {
  const secure = config.isProd;
  // SameSite=None in production because the frontend and API are on different
  // origins (different subdomains). Secure is implied by isProd (HTTPS).
  const sameSite: "none" | "strict" = config.isProd ? "none" : "strict";
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
  });
}

function clearAdminCookie(res: Response): void {
  res.clearCookie(config.cookieName, {
    path: "/",
    sameSite: config.isProd ? "none" : "strict",
  });
}

// POST /api/admin/auth/login
router.post(
  "/auth/login",
  loginLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const body = adminLoginSchema.parse(req.body);
    const admin = await prisma.admin.findUnique({ where: { username: body.username } });
    const generic = "Invalid username or password";
    if (!admin || !admin.isActive) {
      throw new HttpError(401, generic);
    }
    const ok = await verifyPassword(body.password, admin.passwordHash);
    if (!ok) {
      await writeAudit(req as AuthenticatedRequest, {
        action: "LOGIN_FAILED",
        entity: "Admin",
        entityId: admin.id,
      });
      throw new HttpError(401, generic);
    }
    const token = signAdminToken({ sub: String(admin.id), username: admin.username, role: admin.role });
    setAdminCookie(res, token);
    issueCsrfToken(req, res);
    await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    await writeAudit(req as AuthenticatedRequest, {
      action: "LOGIN",
      entity: "Admin",
      entityId: admin.id,
    });
    res.json({ admin: { id: admin.id, username: admin.username, email: admin.email, role: admin.role } });
  })
);

// POST /api/admin/auth/logout
router.post(
  "/auth/logout",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await writeAudit(req, { action: "LOGOUT", entity: "Admin" });
    clearAdminCookie(res);
    res.json({ message: "Logged out" });
  })
);

// GET /api/admin/auth/me
router.get(
  "/auth/me",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const admin = req.admin!;
    const full = await prisma.admin.findUnique({
      where: { id: Number(admin.sub) },
      select: { id: true, username: true, email: true, role: true, lastLoginAt: true, createdAt: true },
    });
    res.json({ admin: full });
  })
);

// POST /api/admin/auth/change-password
router.post(
  "/auth/change-password",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = changePasswordSchema.parse(req.body);
    if (!isStrongPassword(body.newPassword)) {
      throw new HttpError(400, "New password must be at least 12 characters.");
    }
    const admin = await prisma.admin.findUnique({ where: { id: Number(req.admin!.sub) } });
    if (!admin) throw new HttpError(401, "Account not found");
    const ok = await verifyPassword(body.currentPassword, admin.passwordHash);
    if (!ok) throw new HttpError(400, "Current password is incorrect");
    const passwordHash = await hashPassword(body.newPassword);
    await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash } });
    await writeAudit(req, { action: "CHANGE_PASSWORD", entity: "Admin", entityId: admin.id });
    clearAdminCookie(res);
    res.json({ message: "Password changed. Please log in again." });
  })
);

export default router;

