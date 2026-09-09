import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../../db.js";
import { config } from "../../config.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";
import { hashPassword, verifyPassword, isStrongPassword } from "../../utils/password.js";
import { signAdminToken, signTemp2faToken, verifyTemp2faToken } from "../../utils/token.js";
import { adminLoginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from "../../validators/index.js";
import { loginLimiter, forgotPasswordLimiter } from "../../middleware/rateLimit.js";
import { requireAdmin } from "../../middleware/auth.js";
import { writeAudit } from "../../middleware/audit.js";
import { issueCsrfToken } from "../../utils/csrf.js";
import { sendPasswordResetEmail, sendPasswordChangedEmail, sendAdmin2faOtpEmail } from "../../services/email.service.js";
import { Admin2faTempPayload, AuthenticatedRequest } from "../../types.js";
import { Request, Response } from "express";

const RESET_TOKEN_LIFETIME_MINUTES = 15;
const MAX_CONCURRENT_SESSIONS = Number(process.env.MAX_ADMIN_CONCURRENT_SESSIONS) || 6;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function hashResetToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getClientDeviceInfo(req: Request): { deviceInfo: string; ipAddress: string; userAgent: string } {
  const ua = req.get("user-agent") || "Unknown Device";
  const platformHeader = req.get("x-client-platform") || "";
  let deviceInfo = "Web Browser";
  if (platformHeader.toLowerCase().includes("android") || ua.includes("Android")) {
    deviceInfo = "Android Phone";
  } else if (platformHeader.toLowerCase().includes("ios") || ua.includes("iPhone") || ua.includes("iPad")) {
    deviceInfo = "iPhone / iOS";
  } else if (ua.includes("Mobile")) {
    deviceInfo = "Mobile Device";
  } else if (ua.includes("Windows")) {
    deviceInfo = "Windows PC";
  } else if (ua.includes("Mac")) {
    deviceInfo = "Mac";
  }
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "Unknown IP";
  return { deviceInfo, ipAddress: ip, userAgent: ua.slice(0, 255) };
}

async function createAdminSession(adminId: number, username: string, role: string, req: Request, res: Response) {
  const now = new Date();
  // 1. Prune expired sessions
  await prisma.adminSession.deleteMany({
    where: { adminId, expiresAt: { lt: now } },
  });

  // 2. Query active sessions ordered by lastActiveAt ASC
  const activeSessions = await prisma.adminSession.findMany({
    where: { adminId, expiresAt: { gt: now } },
    orderBy: { lastActiveAt: "asc" },
  });

  // 3. FIFO Auto-eviction: if count >= MAX_CONCURRENT_SESSIONS, evict oldest
  if (activeSessions.length >= MAX_CONCURRENT_SESSIONS) {
    const excess = activeSessions.length - MAX_CONCURRENT_SESSIONS + 1;
    const toEvict = activeSessions.slice(0, excess);
    await prisma.adminSession.deleteMany({
      where: { id: { in: toEvict.map((s) => s.id) } },
    });
    await writeAudit(req as AuthenticatedRequest, {
      action: "SESSION_EVICTED",
      entity: "AdminSession",
      entityId: adminId,
      details: JSON.stringify({ evictedCount: toEvict.length, maxAllowed: MAX_CONCURRENT_SESSIONS }),
    });
  }

  // 4. Create new session
  const clientInfo = getClientDeviceInfo(req);
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const token = signAdminToken({ sub: String(adminId), username, role, sessionId });
  const tokenHash = hashToken(token);

  await prisma.adminSession.create({
    data: {
      id: sessionId,
      adminId,
      tokenHash,
      deviceInfo: clientInfo.deviceInfo,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      expiresAt,
    },
  });

  setAdminCookie(res, token);
  issueCsrfToken(req, res);
  return { token, sessionId };
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
  const secure = config.isProd;
  const sameSite: "none" | "strict" = config.isProd ? "none" : "strict";
  res.clearCookie(config.cookieName, {
    httpOnly: true,
    secure,
    sameSite,
    domain: config.cookieDomain || undefined,
    path: "/",
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

    const now = new Date();
    // 1. Check if account is currently locked
    if (admin.lockedUntil && admin.lockedUntil > now) {
      const remainingSec = Math.ceil((admin.lockedUntil.getTime() - now.getTime()) / 1000);
      const remainingMin = Math.ceil(remainingSec / 60);
      res.set("Retry-After", String(remainingSec));
      return res.status(429).json({
        error: `Too many failed password attempts. Account locked. Please try again in ${remainingMin} minute${remainingMin === 1 ? "" : "s"}.`,
        retryAfter: remainingSec,
        lockedUntil: admin.lockedUntil.toISOString(),
      });
    }

    // 2. Verify password
    const ok = await verifyPassword(body.password, admin.passwordHash);
    if (!ok) {
      const newAttempts = admin.failedLoginAttempts + 1;
      if (newAttempts >= 10) {
        const lockoutDurationMs = 15 * 60 * 1000; // 15 minutes lockout
        const lockedUntil = new Date(Date.now() + lockoutDurationMs);
        await prisma.admin.update({
          where: { id: admin.id },
          data: {
            failedLoginAttempts: newAttempts,
            lockedUntil,
          },
        });
        await writeAudit(req as AuthenticatedRequest, {
          action: "LOGIN_LOCKED",
          entity: "Admin",
          entityId: admin.id,
          details: JSON.stringify({ attempts: newAttempts, lockedUntil: lockedUntil.toISOString() }),
        });
        res.set("Retry-After", "900");
        return res.status(429).json({
          error: "Too many failed password attempts. Account locked for 15 minutes.",
          retryAfter: 900,
          lockedUntil: lockedUntil.toISOString(),
        });
      } else {
        await prisma.admin.update({
          where: { id: admin.id },
          data: { failedLoginAttempts: newAttempts },
        });
        await writeAudit(req as AuthenticatedRequest, {
          action: "LOGIN_FAILED",
          entity: "Admin",
          entityId: admin.id,
          details: JSON.stringify({ attempts: newAttempts }),
        });
        const remaining = 10 - newAttempts;
        return res.status(401).json({
          error: remaining <= 3
            ? `Invalid username or password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before 15-minute lockout.`
            : generic,
          attemptsRemaining: remaining,
        });
      }
    }

    // 3. Password verified! Check if 2FA is enabled
    if (admin.twoFactorEnabled && admin.email) {
      const otp = crypto.randomInt(100000, 999999).toString();
      const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await prisma.admin.update({
        where: { id: admin.id },
        data: {
          twoFactorOtpHash: otpHash,
          twoFactorOtpExpiresAt: otpExpiresAt,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      const tempToken = signTemp2faToken(admin.id, admin.username);
      sendAdmin2faOtpEmail(admin.email, otp, 10).catch((e) => console.error("[2FA] Email error:", e));

      await writeAudit(req as AuthenticatedRequest, {
        action: "2FA_OTP_SENT",
        entity: "Admin",
        entityId: admin.id,
      });

      const maskedEmail = admin.email.replace(/^(.)(.*)(@.*)$/, (_m, first, middle, domain) => {
        return `${first}${"*".repeat(middle.length)}${domain}`;
      });

      return res.json({
        require2FA: true,
        tempToken,
        maskedEmail,
        message: "2FA verification code sent to your email",
      });
    }

    // 4. If 2FA not enabled: Reset lockout counters & create session
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    await createAdminSession(admin.id, admin.username, admin.role, req, res);

    await writeAudit(req as AuthenticatedRequest, {
      action: "LOGIN",
      entity: "Admin",
      entityId: admin.id,
    });

    res.json({
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        twoFactorEnabled: admin.twoFactorEnabled,
      },
    });
  })
);

// POST /api/admin/auth/verify-2fa
router.post(
  "/auth/verify-2fa",
  loginLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { tempToken, otp } = req.body;
    if (!tempToken || !otp) {
      throw new HttpError(400, "2FA token and OTP are required");
    }

    let payload: Admin2faTempPayload;
    try {
      payload = verifyTemp2faToken(tempToken);
    } catch {
      throw new HttpError(401, "2FA session expired or invalid. Please log in again.");
    }

    const admin = await prisma.admin.findUnique({
      where: { id: Number(payload.sub) },
    });
    if (!admin || !admin.isActive) {
      throw new HttpError(401, "Admin account disabled or removed");
    }

    const now = new Date();
    if (!admin.twoFactorOtpHash || !admin.twoFactorOtpExpiresAt || admin.twoFactorOtpExpiresAt < now) {
      throw new HttpError(400, "Verification code expired. Please request a new one.");
    }

    const otpHash = crypto.createHash("sha256").update(String(otp).trim()).digest("hex");
    if (otpHash !== admin.twoFactorOtpHash) {
      await writeAudit(req as AuthenticatedRequest, {
        action: "2FA_OTP_FAILED",
        entity: "Admin",
        entityId: admin.id,
      });
      throw new HttpError(400, "Incorrect verification code. Please try again.");
    }

    // Clear OTP once verified
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        twoFactorOtpHash: null,
        twoFactorOtpExpiresAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    await createAdminSession(admin.id, admin.username, admin.role, req, res);

    await writeAudit(req as AuthenticatedRequest, {
      action: "2FA_LOGIN_SUCCESS",
      entity: "Admin",
      entityId: admin.id,
    });

    res.json({
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        twoFactorEnabled: admin.twoFactorEnabled,
      },
    });
  })
);

// POST /api/admin/auth/resend-2fa
router.post(
  "/auth/resend-2fa",
  loginLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { tempToken } = req.body;
    if (!tempToken) {
      throw new HttpError(400, "2FA token is required");
    }

    let payload: Admin2faTempPayload;
    try {
      payload = verifyTemp2faToken(tempToken);
    } catch {
      throw new HttpError(401, "2FA session expired. Please log in again.");
    }

    const admin = await prisma.admin.findUnique({
      where: { id: Number(payload.sub) },
    });
    if (!admin || !admin.isActive || !admin.email) {
      throw new HttpError(400, "Cannot resend code: no valid email address found");
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        twoFactorOtpHash: otpHash,
        twoFactorOtpExpiresAt: otpExpiresAt,
      },
    });

    sendAdmin2faOtpEmail(admin.email, otp, 10).catch((e) => console.error("[2FA] Resend email error:", e));

    res.json({ success: true, message: "New verification code sent to your email" });
  })
);

// POST /api/admin/auth/logout
router.post(
  "/auth/logout",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (req.admin?.sessionId) {
      await prisma.adminSession.deleteMany({ where: { id: req.admin.sessionId } });
    }
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
      select: { id: true, username: true, email: true, role: true, lastLoginAt: true, createdAt: true, twoFactorEnabled: true },
    });
    res.json({ admin: full });
  })
);

// GET /api/admin/auth/sessions
router.get(
  "/auth/sessions",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminId = Number(req.admin!.sub);
    const sessions = await prisma.adminSession.findMany({
      where: { adminId, expiresAt: { gt: new Date() } },
      orderBy: { lastActiveAt: "desc" },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastActiveAt: true,
      },
    });
    res.json({
      activeCount: sessions.length,
      maxAllowed: MAX_CONCURRENT_SESSIONS,
      currentSessionId: req.admin?.sessionId,
      sessions: sessions.map((s) => ({
        ...s,
        isCurrent: s.id === req.admin?.sessionId,
      })),
    });
  })
);

// DELETE /api/admin/auth/sessions/:id
router.delete(
  "/auth/sessions/:id",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminId = Number(req.admin!.sub);
    const { id } = req.params;
    await prisma.adminSession.deleteMany({
      where: { id, adminId },
    });
    await writeAudit(req, {
      action: "REVOKE_SESSION",
      entity: "AdminSession",
      entityId: adminId,
      details: JSON.stringify({ sessionId: id }),
    });
    res.json({ success: true, message: "Device session revoked" });
  })
);

// POST /api/admin/auth/toggle-2fa
router.post(
  "/auth/toggle-2fa",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminId = Number(req.admin!.sub);
    const { enabled, password } = req.body;
    if (typeof enabled !== "boolean") {
      throw new HttpError(400, "enabled (boolean) is required");
    }
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) throw new HttpError(401, "Account not found");

    if (enabled && !admin.email) {
      throw new HttpError(400, "Please configure an email address in your profile before enabling 2FA.");
    }

    if (password) {
      const ok = await verifyPassword(password, admin.passwordHash);
      if (!ok) throw new HttpError(400, "Current password incorrect");
    }

    await prisma.admin.update({
      where: { id: adminId },
      data: { twoFactorEnabled: enabled },
    });

    await writeAudit(req, {
      action: enabled ? "2FA_ENABLED" : "2FA_DISABLED",
      entity: "Admin",
      entityId: adminId,
    });

    res.json({
      success: true,
      twoFactorEnabled: enabled,
      message: enabled ? "2FA has been enabled. New sign-ins will require email OTP verification." : "2FA has been disabled.",
    });
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
    const now = new Date();
    await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash, passwordChangedAt: now } });
    // Invalidate all sessions across all devices
    await prisma.adminSession.deleteMany({ where: { adminId: admin.id } });
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
    const targetEmail = email.trim().toLowerCase();

    // Only an account matching this email may receive a reset token. Never
    // fall back to another admin or mutate account email from this endpoint.
    const admin = await prisma.admin.findFirst({
      where: { email: targetEmail, isActive: true },
    });

    if (!admin || !admin.email) {
      res.json({
        message: "If an account with that email exists, a reset link has been sent.",
      });
      return;
    }

    const recipientEmail = admin.email;

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
    // Build reset link from CLIENT_URL
    const baseUrl = config.clientUrl.replace(/\/$/, "");
    const resetUrl = `${baseUrl}/admin/reset-password?token=${encodeURIComponent(rawToken)}`;
    // Attempt to send email and await result
    const sent = await sendPasswordResetEmail(recipientEmail, resetUrl, RESET_TOKEN_LIFETIME_MINUTES);

    await writeAudit(req as AuthenticatedRequest, {
      action: sent ? "FORGOT_PASSWORD_EMAIL_SENT" : "FORGOT_PASSWORD_EMAIL_FAILED",
      entity: "Admin",
      entityId: admin.id,
    });

    // Always return generic success response
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
    const passwordHash = await hashPassword(newPassword);
    const now = new Date();

    const admin = await prisma.$transaction(async (tx) => {
      // Atomically mark token as used (single-use concurrency protection)
      const consumed = await tx.adminPasswordResetToken.updateMany({
        where: {
          tokenHash,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          usedAt: now,
        },
      });

      if (consumed.count !== 1) {
        throw new HttpError(400, "Invalid or expired reset token.");
      }

      const tokenRecord = await tx.adminPasswordResetToken.findFirst({
        where: { tokenHash },
      });

      if (!tokenRecord) {
        throw new HttpError(400, "Invalid or expired reset token.");
      }

      const targetAdmin = await tx.admin.findUnique({
        where: { id: tokenRecord.adminId, isActive: true },
      });

      if (!targetAdmin) {
        throw new HttpError(400, "Invalid or expired reset token.");
      }

      await tx.admin.update({
        where: { id: targetAdmin.id },
        data: { passwordHash, passwordChangedAt: now },
      });

      return targetAdmin;
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

