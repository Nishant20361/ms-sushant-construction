import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../../db.js";
import { config } from "../../config.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";
import { hashPassword, verifyPassword, isStrongPassword } from "../../utils/password.js";
import { signAdminToken } from "../../utils/token.js";
import { adminLoginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from "../../validators/index.js";
import { loginLimiter, forgotPasswordLimiter } from "../../middleware/rateLimit.js";
import { requireAdmin } from "../../middleware/auth.js";
import { writeAudit } from "../../middleware/audit.js";
import { issueCsrfToken } from "../../utils/csrf.js";
import { sendPasswordResetEmail, sendPasswordChangedEmail } from "../../services/email.service.js";
import { AuthenticatedRequest } from "../../types.js";
import { Request, Response } from "express";

const RESET_TOKEN_LIFETIME_MINUTES = 15;

function hashResetToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

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
    domain: config.cookieDomain || undefined,
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
  });
}

function clearAdminCookie(res: Response): void {
  res.clearCookie(config.cookieName, {
    domain: config.cookieDomain || undefined,
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

    if (admin.email) {
      sendPasswordChangedEmail(admin.email, { date: new Date() }).catch((err) => {
        console.error("[auth] Failed to send password changed email:", err);
      });
    }

    clearAdminCookie(res);
    res.json({ message: "Password changed. Please log in again." });
  })
);

// POST /api/admin/auth/forgot-password
router.post(
  "/auth/forgot-password",
  forgotPasswordLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = forgotPasswordSchema.parse(req.body);

    // Find admin by email. Return generic success regardless to prevent enumeration.
    const admin = await prisma.admin.findFirst({
      where: { email: email.toLowerCase(), isActive: true },
    });

    if (admin) {
      // Generate cryptographically secure random token
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashResetToken(rawToken);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_LIFETIME_MINUTES * 60 * 1000);

      // Invalidate any previous unused tokens for this admin
      await prisma.adminPasswordResetToken.updateMany({
        where: { adminId: admin.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { expiresAt: new Date(0) },
      });

      // Store new token
      await prisma.adminPasswordResetToken.create({
        data: {
          adminId: admin.id,
          tokenHash,
          expiresAt,
        },
      });

      // Build reset link
      const resetUrl = `${config.clientUrl}/admin/reset-password?token=${encodeURIComponent(rawToken)}`;

      // Attempt to send email (never throws)
      const sent = await sendPasswordResetEmail(admin.email!, resetUrl, RESET_TOKEN_LIFETIME_MINUTES);

      await writeAudit(req as AuthenticatedRequest, {
        action: sent ? "FORGOT_PASSWORD_EMAIL_SENT" : "FORGOT_PASSWORD_EMAIL_FAILED",
        entity: "Admin",
        entityId: admin.id,
      });
    }

    // Always return the same message to prevent email enumeration
    res.json({
      message: "If an account with that email exists, a reset link has been sent.",
    });
  })
);

// POST /api/admin/auth/reset-password
router.post(
  "/auth/reset-password",
  asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    if (!isStrongPassword(newPassword)) {
      throw new HttpError(400, "Password must be at least 12 characters.");
    }

    const tokenHash = hashResetToken(token);

    // Find valid, unused token that hasn't expired
    const tokenRecord = await prisma.adminPasswordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!tokenRecord) {
      throw new HttpError(400, "Invalid or expired reset token.");
    }

    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { id: tokenRecord.adminId, isActive: true },
    });

    if (!admin) {
      throw new HttpError(400, "Invalid or expired reset token.");
    }

    // Hash new password and update
    const passwordHash = await hashPassword(newPassword);
    await prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash },
    });

    // Mark token as used (single-use)
    await prisma.adminPasswordResetToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    });

    await writeAudit(req as AuthenticatedRequest, {
      action: "RESET_PASSWORD",
      entity: "Admin",
      entityId: admin.id,
    });

    if (admin.email) {
      sendPasswordChangedEmail(admin.email, { date: new Date() }).catch((err) => {
        console.error("[auth] Failed to send password changed email after reset:", err);
      });
    }

    res.json({ message: "Password has been reset successfully. You can now log in with your new password." });
  })
);

export default router;



