import { Router, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAdmin } from "../../middleware/auth.js";
import { writeAudit } from "../../middleware/audit.js";
import { AuthenticatedRequest } from "../../types.js";
import {
  getKhatabookStatus,
  verifyKhatabookPin,
  updateKhatabookSecurity,
  sendKhatabookResetOtp,
  resetKhatabookPinWithOtp,
} from "../../services/khatabookSecurity.service.js";
import { prisma } from "../../db.js";
import { verifyPassword } from "../../utils/password.js";

const router = Router();

/**
 * GET /api/admin/khatabook/auth-status
 * Check if PIN is configured, masked email for recovery.
 */
router.get(
  "/khatabook/auth-status",
  requireAdmin,
  asyncHandler(async (_req, res: Response) => {
    const status = await getKhatabookStatus();
    res.json(status);
  })
);

/**
 * POST /api/admin/khatabook/verify-pin
 * Verify entered Khatabook PIN.
 */
router.post(
  "/khatabook/verify-pin",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pin } = req.body;
    if (!pin || typeof pin !== "string") {
      res.status(400).json({ error: "PIN is required" });
      return;
    }

    const isValid = await verifyKhatabookPin(pin.trim());
    if (!isValid) {
      res.status(401).json({ error: "गलत पिन! कृपया पुनः प्रयास करें (Incorrect PIN)" });
      return;
    }

    await writeAudit(req, {
      action: "KHATABOOK_UNLOCKED",
      entity: "Khatabook",
      entityId: 1,
    });

    res.json({
      success: true,
      message: "खाताबुक अनलॉक सफल (Khatabook Unlocked)",
    });
  })
);

/**
 * POST /api/admin/khatabook/change-pin
 * Change Khatabook PIN and/or Recovery Email by confirming current PIN or Admin Account Password.
 */
router.post(
  "/khatabook/change-pin",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { currentPin, adminPassword, newPin, recoveryEmail } = req.body;

    if (!newPin && !recoveryEmail) {
      res.status(400).json({ error: "कम से कम नया पिन या रिकवरी ईमेल दर्ज करें" });
      return;
    }

    if (newPin && (typeof newPin !== "string" || newPin.trim().length < 4)) {
      res.status(400).json({ error: "नया पिन कम से कम 4 अंकों का होना चाहिए (New PIN must be at least 4 digits)" });
      return;
    }

    let authorized = false;

    // Option 1: Confirm with current Khatabook PIN
    if (currentPin) {
      authorized = await verifyKhatabookPin(currentPin.trim());
    }

    // Option 2: Confirm with Admin Account Password
    if (!authorized && adminPassword) {
      const adminId = Number(req.admin?.sub || 0);
      const admin = await prisma.admin.findUnique({ where: { id: adminId } });
      if (admin && admin.passwordHash) {
        authorized = await verifyPassword(adminPassword, admin.passwordHash);
      }
    }

    if (!authorized) {
      res.status(401).json({ error: "वर्तमान पिन या एडमिन पासवर्ड गलत है (Incorrect current PIN or password)" });
      return;
    }

    await updateKhatabookSecurity({
      newPin: newPin ? newPin.trim() : undefined,
      recoveryEmail: recoveryEmail ? recoveryEmail.trim() : undefined,
    });

    await writeAudit(req, {
      action: "KHATABOOK_SECURITY_UPDATED",
      entity: "Khatabook",
      entityId: 1,
    });

    res.json({
      success: true,
      message: "खाताबुक पिन और रिकवरी ईमेल सफलतापूर्वक सुरक्षित हो गए!",
    });
  })
);

/**
 * POST /api/admin/khatabook/forgot-pin
 * Send PIN Reset OTP to Admin Gmail.
 */
router.post(
  "/khatabook/forgot-pin",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await sendKhatabookResetOtp();

    await writeAudit(req, {
      action: "KHATABOOK_OTP_REQUESTED",
      entity: "Khatabook",
      entityId: 1,
    });

    res.json({
      success: true,
      message: `OTP आपके Gmail (${result.maskedEmail}) पर भेज दिया गया है।`,
      maskedEmail: result.maskedEmail,
    });
  })
);

/**
 * POST /api/admin/khatabook/reset-pin
 * Verify Gmail OTP and set new PIN.
 */
router.post(
  "/khatabook/reset-pin",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { otp, newPin } = req.body;

    if (!otp || typeof otp !== "string") {
      res.status(400).json({ error: "6-अंकीय OTP आवश्यक है (OTP is required)" });
      return;
    }
    if (!newPin || typeof newPin !== "string" || newPin.trim().length < 4) {
      res.status(400).json({ error: "नया पिन कम से कम 4 अंकों का होना चाहिए (New PIN must be at least 4 digits)" });
      return;
    }

    try {
      await resetKhatabookPinWithOtp(otp.trim(), newPin.trim());

      await writeAudit(req, {
        action: "KHATABOOK_PIN_RESET_WITH_OTP",
        entity: "Khatabook",
        entityId: 1,
      });

      res.json({
        success: true,
        message: "खाताबुक पिन सफलतापूर्वक रीसेट हो गया है! (PIN reset successfully)",
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "OTP सत्यापन विफल रहा" });
    }
  })
);

export default router;
