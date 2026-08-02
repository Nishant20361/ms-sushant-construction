import { Router } from "express";
import { prisma } from "../../db.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { settingsSchema, adminProfileSchema, adminEmailSchema } from "../../validators/index.js";
import { requireAdmin } from "../../middleware/auth.js";
import { writeAudit } from "../../middleware/audit.js";
import { serializeSettings } from "../../utils/serializer.js";
import { AuthenticatedRequest } from "../../types.js";

const router = Router();

// GET /api/admin/settings
router.get(
  "/settings",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    let settings = await prisma.siteSetting.findFirst();
    if (!settings) {
      settings = await prisma.siteSetting.create({ data: {} });
    }
    res.json({ settings: serializeSettings(settings) });
  })
);

// PUT /api/admin/settings
router.put(
  "/settings",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = settingsSchema.parse(req.body);
    let settings = await prisma.siteSetting.findFirst();
    if (!settings) {
      settings = await prisma.siteSetting.create({ data: body });
    } else {
      settings = await prisma.siteSetting.update({ where: { id: settings.id }, data: body });
    }
    await writeAudit(req, {
      action: "SETTINGS_UPDATE",
      entity: "SiteSetting",
      entityId: settings.id,
    });
    res.json({ settings: serializeSettings(settings) });
  })
);

// GET /api/admin/profile
// Returns the admin's profile (low-stock threshold + notification email).
router.get(
  "/profile",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const adminId = Number(req.admin?.sub ?? 0);
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) throw new Error("Admin not found");
    let profile = await prisma.adminProfile.findUnique({ where: { adminId } });
    if (!profile) {
      profile = await prisma.adminProfile.create({
        data: { adminId, lowStockThreshold: 10 },
      });
    }
    res.json({
      profile: {
        lowStockThreshold: profile.lowStockThreshold,
        email: admin.email ?? null,
        username: admin.username,
      },
    });
  })
);

// PUT /api/admin/profile
router.put(
  "/profile",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const adminId = Number(req.admin?.sub ?? 0);
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) throw new Error("Admin not found");

    const body = adminProfileSchema.parse(req.body);
    const profile = await prisma.adminProfile.upsert({
      where: { adminId },
      update: { lowStockThreshold: body.lowStockThreshold },
      create: { adminId, lowStockThreshold: body.lowStockThreshold },
    });

    await writeAudit(req, {
      action: "PROFILE_UPDATE",
      entity: "AdminProfile",
      entityId: profile.id,
      details: `lowStockThreshold=${profile.lowStockThreshold}`,
    });

    res.json({
      profile: {
        lowStockThreshold: profile.lowStockThreshold,
        email: admin.email ?? null,
        username: admin.username,
      },
    });
  })
);

// PUT /api/admin/profile/email  — updates the Admin.email used for
// notifications. This is fully database-driven: no env var is used as the
// recipient, so changes take effect immediately without a redeploy.
router.put(
  "/profile/email",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const adminId = Number(req.admin?.sub ?? 0);
    const body = adminEmailSchema.parse(req.body);
    const admin = await prisma.admin.update({
      where: { id: adminId },
      data: { email: body.email ?? null },
    });
    await writeAudit(req, {
      action: "PROFILE_EMAIL_UPDATE",
      entity: "Admin",
      entityId: admin.id,
      details: admin.email ?? "(none)",
    });
    res.json({ email: admin.email ?? null });
  })
);

export default router;

